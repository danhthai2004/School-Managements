package com.schoolmanagement.backend.service;

import com.schoolmanagement.backend.domain.entity.admin.School;
import com.schoolmanagement.backend.repo.student.StudentRepository;
import com.schoolmanagement.backend.repo.classes.ClassRoomRepository;
import com.schoolmanagement.backend.repo.classes.ClassEnrollmentRepository;
import com.schoolmanagement.backend.domain.entity.student.Student;
import com.schoolmanagement.backend.domain.entity.classes.ClassRoom;
import com.schoolmanagement.backend.domain.entity.classes.ClassEnrollment;
import com.schoolmanagement.backend.service.common.FileStorageService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.MediaType;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.transaction.annotation.Transactional;

import java.io.IOException;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Service for School Admin to manage student face photos.
 * Coordinates between Cloudinary (image storage) and FastAPI (face embeddings).
 */
@Slf4j
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class FacePhotoStorageService {

    @Value("${face.recognition.service.url:http://localhost:8000}")
    private String faceServiceUrl;

    private final FileStorageService fileStorageService;
    private final StudentRepository studentRepository;
    private final ClassRoomRepository classRoomRepository;
    private final ClassEnrollmentRepository classEnrollmentRepository;

    private WebClient faceWebClient;

    @jakarta.annotation.PostConstruct
    void init() {
        log.info(">>> FacePhotoStorageService: faceServiceUrl = [{}]", faceServiceUrl);
        if (faceServiceUrl == null || faceServiceUrl.isBlank()) {
            faceServiceUrl = "http://localhost:8000";
            log.warn(">>> faceServiceUrl was empty, defaulting to http://localhost:8000");
        }

        // Use JDK HttpClient resolver instead of Netty's default (which fails in
        // Docker)
        reactor.netty.http.client.HttpClient httpClient = reactor.netty.http.client.HttpClient.create()
                .resolver(io.netty.resolver.DefaultAddressResolverGroup.INSTANCE);

        faceWebClient = WebClient.builder()
                .baseUrl(faceServiceUrl)
                .clientConnector(new org.springframework.http.client.reactive.ReactorClientHttpConnector(httpClient))
                .codecs(c -> c.defaultCodecs().maxInMemorySize(50 * 1024 * 1024))
                .build();
        log.info(">>> FacePhotoStorageService WebClient initialized successfully");
    }

    private WebClient webClient() {
        return faceWebClient;
    }

    // ─── Overview ────────────────────────────────────────

    /**
     * Get face registration overview for all classes in a school.
     */
    public FaceOverviewResponse getSchoolOverview(School school) {
        List<ClassRoom> classes = classRoomRepository.findAllBySchoolOrderByGradeAscNameAsc(school);
        long totalStudents = studentRepository.countBySchool(school);

        List<ClassFaceStatusDto> classStatuses = new ArrayList<>();
        int totalRegistered = 0;

        for (ClassRoom cls : classes) {
            var enrollments = classEnrollmentRepository.findAllByClassRoom(cls);
            if (enrollments.isEmpty())
                continue;

            List<String> studentIds = enrollments.stream()
                    .map(e -> e.getStudent().getId().toString())
                    .toList();

            try {
                var status = callClassStatus(studentIds);
                int registered = 0;
                if (status != null && status.get("total_registered") != null) {
                    registered = ((Number) status.get("total_registered")).intValue();
                }
                totalRegistered += registered;

                classStatuses.add(new ClassFaceStatusDto(
                        cls.getId().toString(),
                        cls.getName(),
                        cls.getGrade(),
                        enrollments.size(),
                        registered,
                        enrollments.size() - registered,
                        cls.getHomeroomTeacher() != null ? cls.getHomeroomTeacher().getFullName() : null));
            } catch (Exception e) {
                log.warn("Failed to get face status for class {}: {}", cls.getName(), e.getMessage());
                classStatuses.add(new ClassFaceStatusDto(
                        cls.getId().toString(),
                        cls.getName(),
                        cls.getGrade(),
                        enrollments.size(),
                        0,
                        enrollments.size(),
                        cls.getHomeroomTeacher() != null ? cls.getHomeroomTeacher().getFullName() : null));
            }
        }

        return new FaceOverviewResponse(
                totalStudents,
                totalRegistered,
                totalStudents - totalRegistered,
                totalStudents > 0 ? Math.round((double) totalRegistered / totalStudents * 100.0) : 0,
                classStatuses);
    }

    /**
     * Get detailed face registration status for a specific class.
     */
    public ClassFaceDetailResponse getClassDetail(School school, UUID classId) {
        ClassRoom classRoom = classRoomRepository.findById(classId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy lớp"));

        // Verify class belongs to this school
        if (!classRoom.getSchool().getId().equals(school.getId())) {
            throw new RuntimeException("Lớp không thuộc trường này");
        }

        var enrollments = classEnrollmentRepository.findAllByClassRoom(classRoom);
        List<String> studentIds = enrollments.stream()
                .map(e -> e.getStudent().getId().toString())
                .toList();

        // Build a map of student info from enrollments
        Map<String, Student> studentMap = enrollments.stream()
                .collect(Collectors.toMap(
                        e -> e.getStudent().getId().toString(),
                        ClassEnrollment::getStudent,
                        (a, b) -> a));

        List<StudentFaceStatusDto> students = new ArrayList<>();

        if (!studentIds.isEmpty()) {
            try {
                var status = callClassStatus(studentIds);
                if (status != null) {
                    @SuppressWarnings("unchecked")
                    List<Map<String, Object>> studentList = (List<Map<String, Object>>) status.get("students");
                    if (studentList != null) {
                        for (Map<String, Object> s : studentList) {
                            String sid = (String) s.get("student_id");
                            Student student = studentMap.get(sid);
                            students.add(new StudentFaceStatusDto(
                                    sid,
                                    student != null ? student.getStudentCode() : (String) s.get("student_code"),
                                    student != null ? student.getFullName() : (String) s.get("student_name"),
                                    student != null ? student.getAvatarUrl() : null,
                                    Boolean.TRUE.equals(s.get("is_registered")),
                                    s.get("image_count") != null ? ((Number) s.get("image_count")).intValue() : 0,
                                    (String) s.get("last_updated")));
                        }
                    }
                }
            } catch (Exception e) {
                log.warn("Failed to get face status for class: {}", e.getMessage());
                // Fall back to showing all students as unregistered
                for (var enrollment : enrollments) {
                    Student student = enrollment.getStudent();
                    students.add(new StudentFaceStatusDto(
                            student.getId().toString(),
                            student.getStudentCode(),
                            student.getFullName(),
                            student.getAvatarUrl(),
                            false, 0, null));
                }
            }
        }

        // Sort: unregistered first, then by name
        students.sort(Comparator
                .comparing(StudentFaceStatusDto::isRegistered)
                .thenComparing(StudentFaceStatusDto::studentName, Comparator.nullsLast(String::compareTo)));

        int registered = (int) students.stream().filter(StudentFaceStatusDto::isRegistered).count();
        return new ClassFaceDetailResponse(
                classId.toString(),
                classRoom.getName(),
                classRoom.getGrade(),
                students,
                students.size(),
                registered,
                students.size() - registered);
    }

    // ─── Student Photos ──────────────────────────────────

    /**
     * Get all face photos for a student.
     */
    public StudentPhotosDto getStudentPhotos(School school, UUID studentId) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy học sinh"));
        if (!student.getSchool().getId().equals(school.getId())) {
            throw new RuntimeException("Học sinh không thuộc trường này");
        }

        try {
            Map<String, Object> response = webClient().get()
                    .uri("/student-photos/" + studentId.toString())
                    .retrieve()
                    .bodyToMono(new ParameterizedTypeReference<Map<String, Object>>() {
                    })
                    .block();

            List<PhotoDto> photos = new ArrayList<>();
            if (response != null) {
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> photoList = (List<Map<String, Object>>) response.get("photos");
                if (photoList != null) {
                    for (Map<String, Object> p : photoList) {
                        photos.add(new PhotoDto(
                                p.get("id") != null ? ((Number) p.get("id")).intValue() : 0,
                                (String) p.get("image_url"),
                                p.get("quality_score") != null ? ((Number) p.get("quality_score")).doubleValue() : null,
                                (String) p.get("created_at")));
                    }
                }
            }

            return new StudentPhotosDto(
                    studentId.toString(),
                    student.getStudentCode(),
                    student.getFullName(),
                    student.getAvatarUrl(),
                    photos,
                    photos.size());
        } catch (Exception e) {
            log.error("Failed to get student photos", e);
            return new StudentPhotosDto(
                    studentId.toString(),
                    student.getStudentCode(),
                    student.getFullName(),
                    student.getAvatarUrl(),
                    List.of(),
                    0);
        }
    }

    /**
     * Upload a face photo for a student: save to Cloudinary + register in FastAPI.
     */
    public UploadFacePhotoResult uploadFacePhoto(School school, UUID studentId, MultipartFile file) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy học sinh"));
        if (!student.getSchool().getId().equals(school.getId())) {
            throw new RuntimeException("Học sinh không thuộc trường này");
        }

        try {
            // 1. Try to upload to Cloudinary (optional — may not be configured)
            String imageUrl = null;
            try {
                imageUrl = fileStorageService.uploadFile(file,
                        "face-photos/" + school.getId() + "/" + studentId);
                log.info("Uploaded face photo to Cloudinary: {}", imageUrl);
            } catch (Exception cloudinaryEx) {
                log.warn("Cloudinary upload skipped (not configured or failed): {}", cloudinaryEx.getMessage());
            }

            // 2. Register in FastAPI (with or without image_url)
            MultipartBodyBuilder builder = new MultipartBodyBuilder();
            builder.part("student_id", studentId.toString());
            builder.part("student_code", student.getStudentCode() != null ? student.getStudentCode() : "");
            builder.part("student_name", student.getFullName() != null ? student.getFullName() : "");
            if (imageUrl != null && !imageUrl.isBlank()) {
                builder.part("image_url", imageUrl);
            }
            builder.part("file", new ByteArrayResource(file.getBytes()) {
                @Override
                public String getFilename() {
                    return file.getOriginalFilename();
                }
            }).contentType(MediaType.parseMediaType(
                    file.getContentType() != null ? file.getContentType() : "image/jpeg"));

            @SuppressWarnings("unchecked")
            Map<String, Object> result = webClient().post()
                    .uri("/register")
                    .contentType(MediaType.MULTIPART_FORM_DATA)
                    .body(BodyInserters.fromMultipartData(builder.build()))
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();

            boolean success = result != null && Boolean.TRUE.equals(result.get("success"));
            String message = result != null ? (String) result.get("message") : "Không có phản hồi";
            int count = result != null && result.get("embedding_count") != null
                    ? ((Number) result.get("embedding_count")).intValue()
                    : 0;

            return new UploadFacePhotoResult(success, message, imageUrl, count);
        } catch (IOException e) {
            log.error("Upload face photo failed", e);
            throw new RuntimeException("Upload ảnh thất bại: " + e.getMessage());
        }
    }

    /**
     * Delete a specific face photo/embedding.
     */
    public void deleteFacePhoto(School school, UUID studentId, int embeddingId) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy học sinh"));
        if (!student.getSchool().getId().equals(school.getId())) {
            throw new RuntimeException("Học sinh không thuộc trường này");
        }

        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> result = webClient().delete()
                    .uri("/embedding/" + embeddingId)
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();

            // Also delete from Cloudinary if there's an image URL
            if (result != null && result.get("image_url") != null) {
                String imageUrl = (String) result.get("image_url");
                tryDeleteFromCloudinary(imageUrl);
            }
        } catch (Exception e) {
            log.error("Delete face photo failed", e);
            throw new RuntimeException("Xóa ảnh thất bại: " + e.getMessage());
        }
    }

    /**
     * Delete all face photos for a student.
     */
    public void deleteAllStudentPhotos(School school, UUID studentId) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy học sinh"));
        if (!student.getSchool().getId().equals(school.getId())) {
            throw new RuntimeException("Học sinh không thuộc trường này");
        }

        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> result = webClient().delete()
                    .uri("/student/" + studentId + "/all")
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();

            // Delete images from Cloudinary
            if (result != null && result.get("image_urls") != null) {
                @SuppressWarnings("unchecked")
                List<String> imageUrls = (List<String>) result.get("image_urls");
                for (String url : imageUrls) {
                    tryDeleteFromCloudinary(url);
                }
            }
        } catch (Exception e) {
            log.error("Delete all face photos failed", e);
            throw new RuntimeException("Xóa ảnh thất bại: " + e.getMessage());
        }
    }

    // ─── Helpers ─────────────────────────────────────────

    private Map<String, Object> callClassStatus(List<String> studentIds) {
        MultipartBodyBuilder builder = new MultipartBodyBuilder();
        builder.part("student_ids", String.join(",", studentIds));

        @SuppressWarnings("unchecked")
        Map<String, Object> response = webClient().post()
                .uri("/class-status")
                .contentType(MediaType.MULTIPART_FORM_DATA)
                .body(BodyInserters.fromMultipartData(builder.build()))
                .retrieve()
                .bodyToMono(Map.class)
                .block();
        return response;
    }

    private void tryDeleteFromCloudinary(String imageUrl) {
        if (imageUrl == null || imageUrl.isBlank())
            return;
        try {
            // Extract public ID from Cloudinary URL
            // URL format:
            // https://res.cloudinary.com/{cloud}/image/upload/v{version}/{folder}/{file}
            String publicId = extractCloudinaryPublicId(imageUrl);
            if (publicId != null) {
                fileStorageService.deleteFile(publicId);
            }
        } catch (Exception e) {
            log.warn("Failed to delete image from Cloudinary: {}", e.getMessage());
        }
    }

    private String extractCloudinaryPublicId(String url) {
        try {
            // Pattern: .../upload/v1234567/face-photos/school-id/student-id/filename
            int uploadIdx = url.indexOf("/upload/");
            if (uploadIdx < 0)
                return null;
            String afterUpload = url.substring(uploadIdx + 8); // skip "/upload/"
            // Remove version prefix (v1234567/)
            if (afterUpload.startsWith("v")) {
                int slashIdx = afterUpload.indexOf('/');
                if (slashIdx > 0) {
                    afterUpload = afterUpload.substring(slashIdx + 1);
                }
            }
            // Remove file extension
            int dotIdx = afterUpload.lastIndexOf('.');
            if (dotIdx > 0) {
                afterUpload = afterUpload.substring(0, dotIdx);
            }
            return afterUpload;
        } catch (Exception e) {
            return null;
        }
    }

    // ─── DTOs ────────────────────────────────────────────

    public record FaceOverviewResponse(
            long totalStudents,
            long totalRegistered,
            long totalUnregistered,
            long registrationPercentage,
            List<ClassFaceStatusDto> classes) {
    }

    public record ClassFaceStatusDto(
            String classId,
            String className,
            int grade,
            int totalStudents,
            int registered,
            int unregistered,
            String homeroomTeacherName) {
    }

    public record ClassFaceDetailResponse(
            String classId,
            String className,
            int grade,
            List<StudentFaceStatusDto> students,
            int totalStudents,
            int totalRegistered,
            int totalUnregistered) {
    }

    public record StudentFaceStatusDto(
            String studentId,
            String studentCode,
            String studentName,
            String avatarUrl,
            boolean isRegistered,
            int imageCount,
            String lastUpdated) {
    }

    public record StudentPhotosDto(
            String studentId,
            String studentCode,
            String studentName,
            String avatarUrl,
            List<PhotoDto> photos,
            int totalPhotos) {
    }

    public record PhotoDto(
            int id,
            String imageUrl,
            Double qualityScore,
            String createdAt) {
    }

    public record UploadFacePhotoResult(
            boolean success,
            String message,
            String imageUrl,
            int embeddingCount) {
    }
}
