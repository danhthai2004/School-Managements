package com.schoolmanagement.backend.service.attendance;

import com.schoolmanagement.backend.domain.attendance.AttendanceStatus;
import com.schoolmanagement.backend.domain.timetable.TimetableStatus;
import com.schoolmanagement.backend.repo.teacher.TeacherRepository;
import com.schoolmanagement.backend.repo.student.StudentRepository;
import com.schoolmanagement.backend.repo.classes.ClassEnrollmentRepository;
import com.schoolmanagement.backend.repo.attendance.AttendanceRepository;
import com.schoolmanagement.backend.repo.attendance.AttendanceSessionRepository;
import com.schoolmanagement.backend.repo.facial.FacialRecognitionLogRepository;
import com.schoolmanagement.backend.repo.timetable.TimetableDetailRepository;
import com.schoolmanagement.backend.repo.timetable.TimetableRepository;
import com.schoolmanagement.backend.repo.auth.UserRepository;
import com.schoolmanagement.backend.domain.entity.auth.User;
import com.schoolmanagement.backend.domain.entity.teacher.Teacher;
import com.schoolmanagement.backend.domain.entity.classes.ClassRoom;
import com.schoolmanagement.backend.domain.entity.classes.Subject;
import com.schoolmanagement.backend.domain.entity.student.Student;
import com.schoolmanagement.backend.domain.entity.attendance.Attendance;
import com.schoolmanagement.backend.domain.entity.facial.FacialRecognitionLog;
import com.schoolmanagement.backend.dto.teacher.FaceRecognizeResponse;
import com.schoolmanagement.backend.dto.teacher.FaceRegistrationStatusResponse;
import com.schoolmanagement.backend.dto.teacher.FaceRegistrationStatusResponse.FaceRegistrationStatusDto;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.MediaType;
import org.springframework.http.client.MultipartBodyBuilder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.reactive.function.BodyInserters;
import org.springframework.web.reactive.function.client.WebClient;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Service that proxies face recognition requests to the Python FastAPI
 * microservice
 * and orchestrates attendance marking based on the results.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class FaceAttendanceService {

    @Value("${face.recognition.service.url:http://localhost:8000}")
    private String faceServiceUrl;

    private final UserRepository userRepository;
    private final TeacherRepository teacherRepository;
    private final StudentRepository studentRepository;
    private final ClassEnrollmentRepository classEnrollmentRepository;
    private final AttendanceRepository attendanceRepository;
    private final AttendanceSessionRepository attendanceSessionRepository;
    private final FacialRecognitionLogRepository facialRecognitionLogRepository;
    private final TimetableDetailRepository timetableDetailRepository;
    private final TimetableRepository timetableRepository;

    private WebClient faceWebClient;

    @jakarta.annotation.PostConstruct
    void initWebClient() {
        // Custom ObjectMapper that reads snake_case from Python FastAPI responses
        com.fasterxml.jackson.databind.ObjectMapper snakeCaseMapper = new com.fasterxml.jackson.databind.ObjectMapper()
                .setPropertyNamingStrategy(
                        com.fasterxml.jackson.databind.PropertyNamingStrategies.SNAKE_CASE);

        reactor.netty.http.client.HttpClient httpClient = reactor.netty.http.client.HttpClient.create()
                .resolver(io.netty.resolver.DefaultAddressResolverGroup.INSTANCE);
        faceWebClient = WebClient.builder()
                .baseUrl(faceServiceUrl)
                .clientConnector(new org.springframework.http.client.reactive.ReactorClientHttpConnector(httpClient))
                .codecs(configurer -> {
                    configurer.defaultCodecs().maxInMemorySize(50 * 1024 * 1024);
                    configurer.defaultCodecs().jackson2JsonDecoder(
                            new org.springframework.http.codec.json.Jackson2JsonDecoder(snakeCaseMapper));
                })
                .build();
    }

    private WebClient webClient() {
        return faceWebClient;
    }

    /**
     * Register a student's face by forwarding the image to FastAPI.
     */
    public Map<String, Object> registerFace(String teacherEmail, String studentId,
            String studentCode, String studentName,
            MultipartFile file) {
        // Verify teacher existence
        userRepository.findByEmailIgnoreCase(teacherEmail)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy giáo viên"));

        try {
            MultipartBodyBuilder builder = new MultipartBodyBuilder();
            builder.part("student_id", studentId);
            builder.part("student_code", studentCode != null ? studentCode : "");
            builder.part("student_name", studentName != null ? studentName : "");
            builder.part("file", new ByteArrayResource(file.getBytes()) {
                @Override
                public String getFilename() {
                    return file.getOriginalFilename();
                }
            }).contentType(MediaType.parseMediaType(
                    file.getContentType() != null ? file.getContentType() : "image/jpeg"));

            Map response = webClient().post()
                    .uri("/register")
                    .contentType(MediaType.MULTIPART_FORM_DATA)
                    .body(BodyInserters.fromMultipartData(builder.build()))
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();

            return response != null ? response : Map.of("success", false, "message", "No response");
        } catch (Exception e) {
            log.error("Face registration failed", e);
            throw new RuntimeException("Đăng ký khuôn mặt thất bại: " + e.getMessage());
        }
    }

    /**
     * Batch recognize faces from classroom photos and return results.
     * Does NOT auto-save attendance — the teacher must confirm first.
     */
    public FaceRecognizeResponse recognizeBatch(String teacherEmail,
            List<MultipartFile> files,
            LocalDate date,
            int slotIndex) {
        User teacherUser = userRepository.findByEmailIgnoreCase(teacherEmail)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy giáo viên"));

        // Optionally scope to class students for better accuracy
        String studentIdsParam = null;
        try {
            Teacher teacher = teacherRepository.findByUser(teacherUser).orElse(null);
            if (teacher != null) {
                // Find OFFICIAL timetable and class for this slot
                var officialTimetable = timetableRepository.findFirstBySchoolAndStatusOrderByCreatedAtDesc(
                        teacher.getSchool(), TimetableStatus.OFFICIAL);
                if (officialTimetable.isPresent()) {
                    var details = timetableDetailRepository
                            .findAllByTimetableAndTeacher(officialTimetable.get(), teacher);
                    var todaySlot = details.stream()
                            .filter(t -> t.getSlotIndex() == slotIndex
                                    && t.getDayOfWeek().name().equals(
                                            date.getDayOfWeek().name()))
                            .findFirst();

                    if (todaySlot.isPresent()) {
                        var classRoom = todaySlot.get().getClassRoom();
                        var enrollments = classEnrollmentRepository.findAllByClassRoom(classRoom);
                        studentIdsParam = enrollments.stream()
                                .map(e -> e.getStudent().getId().toString())
                                .collect(Collectors.joining(","));
                    }
                }
            }
        } catch (Exception e) {
            log.warn("Could not scope search to class students: {}", e.getMessage());
        }

        try {
            MultipartBodyBuilder builder = new MultipartBodyBuilder();
            for (MultipartFile file : files) {
                builder.part("files", new ByteArrayResource(file.getBytes()) {
                    @Override
                    public String getFilename() {
                        return file.getOriginalFilename();
                    }
                }).contentType(MediaType.parseMediaType(
                        file.getContentType() != null ? file.getContentType() : "image/jpeg"));
            }
            if (studentIdsParam != null && !studentIdsParam.isEmpty()) {
                builder.part("student_ids", studentIdsParam);
            }

            FaceRecognizeResponse response = webClient().post()
                    .uri("/recognize-batch")
                    .contentType(MediaType.MULTIPART_FORM_DATA)
                    .body(BodyInserters.fromMultipartData(builder.build()))
                    .retrieve()
                    .bodyToMono(FaceRecognizeResponse.class)
                    .block();

            return response;
        } catch (Exception e) {
            log.error("Batch recognition failed", e);
            throw new RuntimeException("Nhận diện khuôn mặt thất bại: " + e.getMessage());
        }
    }

    /**
     * After teacher confirms recognition results, save attendance + logs.
     */
    @Transactional
    public void confirmFaceAttendance(String teacherEmail,
            LocalDate date,
            int slotIndex,
            List<ConfirmedStudent> confirmedStudents) {
        User teacherUser = userRepository.findByEmailIgnoreCase(teacherEmail)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy giáo viên"));

        // Resolve teacher, classroom, subject from timetable for creating new records
        Teacher teacher = teacherRepository.findByUser(teacherUser).orElse(null);
        ClassRoom classRoom = null;
        Subject subject = null;

        if (teacher != null) {
            try {
                var officialTimetable = timetableRepository.findFirstBySchoolAndStatusOrderByCreatedAtDesc(
                        teacher.getSchool(), TimetableStatus.OFFICIAL);
                if (officialTimetable.isPresent()) {
                    var detailOpt = timetableDetailRepository
                            .findByTimetableAndTeacherAndDayOfWeekAndSlotIndex(
                                    officialTimetable.get(), teacher, date.getDayOfWeek(), slotIndex);
                    if (detailOpt.isPresent()) {
                        classRoom = detailOpt.get().getClassRoom();
                        subject = detailOpt.get().getSubject();
                    }
                }
            } catch (Exception e) {
                log.warn("Could not resolve timetable detail for face attendance: {}", e.getMessage());
            }
        }

        for (ConfirmedStudent cs : confirmedStudents) {
            UUID studentUUID = UUID.fromString(cs.studentId);
            Student student = studentRepository.findById(studentUUID).orElse(null);
            if (student == null)
                continue;

            // Upsert attendance record
            var existing = attendanceRepository
                    .findByStudentAndDateAndSlotIndex(student, date, slotIndex);

            Attendance attendance;
            if (existing.isPresent()) {
                attendance = existing.get();
                attendance.setStatus(AttendanceStatus.valueOf(cs.status));
                attendanceRepository.save(attendance);
            } else {
                // Create new attendance record
                attendance = Attendance.builder()
                        .student(student)
                        .classRoom(classRoom)
                        .subject(subject)
                        .teacher(teacher)
                        .attendanceDate(date)
                        .slotIndex(slotIndex)
                        .status(AttendanceStatus.valueOf(cs.status))
                        .remarks("Điểm danh khuôn mặt")
                        .build();
                attendanceRepository.save(attendance);
            }

            // Save recognition log
            FacialRecognitionLog frLog = FacialRecognitionLog.builder()
                    .attendance(attendance)
                    .recognizedStudent(student)
                    .confidenceScore(BigDecimal.valueOf(cs.confidence))
                    .recognitionStatus(cs.confidence >= 0.55 ? "SUCCESS" : "LOW_CONFIDENCE")
                    .processedAt(Instant.now())
                    .build();
            facialRecognitionLogRepository.save(frLog);
        }
    }

    /**
     * Get face registration status for students in a class.
     */
    public FaceRegistrationStatusResponse getClassRegistrationStatus(
            String teacherEmail, String classId) {

        // Verify teacher existence
        userRepository.findByEmailIgnoreCase(teacherEmail)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy giáo viên"));

        // Get students from class
        UUID classUUID = UUID.fromString(classId);
        var enrollments = classEnrollmentRepository.findAllByClassRoom(
                new ClassRoom() {
                    {
                        setId(classUUID);
                    }
                });

        List<String> studentIds = enrollments.stream()
                .map(e -> e.getStudent().getId().toString())
                .toList();

        if (studentIds.isEmpty()) {
            return new FaceRegistrationStatusResponse(
                    List.of(), 0, 0, 0);
        }

        try {
            // Call FastAPI class-status endpoint
            MultipartBodyBuilder builder = new MultipartBodyBuilder();
            builder.part("student_ids", String.join(",", studentIds));

            Map response = webClient().post()
                    .uri("/class-status")
                    .contentType(MediaType.MULTIPART_FORM_DATA)
                    .body(BodyInserters.fromMultipartData(builder.build()))
                    .retrieve()
                    .bodyToMono(Map.class)
                    .block();

            if (response == null) {
                throw new RuntimeException("No response from face service");
            }

            // Map response and enrich with student info from our DB
            List<FaceRegistrationStatusDto> students = new ArrayList<>();
            var studentList = (List<Map<String, Object>>) response.get("students");
            if (studentList != null) {
                for (Map<String, Object> s : studentList) {
                    String sid = (String) s.get("student_id");
                    // Try to get student info from enrollment
                    var enrollment = enrollments.stream()
                            .filter(e -> e.getStudent().getId().toString().equals(sid))
                            .findFirst();

                    String code = enrollment.map(e -> e.getStudent().getStudentCode()).orElse("");
                    String name = enrollment.map(e -> e.getStudent().getUser().getFullName()).orElse("");

                    students.add(new FaceRegistrationStatusDto(
                            sid,
                            code,
                            name,
                            Boolean.TRUE.equals(s.get("is_registered")),
                            s.get("image_count") != null ? ((Number) s.get("image_count")).intValue() : 0,
                            (String) s.get("last_updated")));
                }
            }

            int registered = (int) students.stream().filter(FaceRegistrationStatusDto::isRegistered).count();
            return new FaceRegistrationStatusResponse(
                    students, students.size(), registered, students.size() - registered);

        } catch (Exception e) {
            log.error("Failed to get class registration status", e);
            throw new RuntimeException("Không thể lấy trạng thái đăng ký: " + e.getMessage());
        }
    }

    /**
     * Delete all face data for a student (called by School Admin).
     */
    public void deleteStudentFaceData(String studentId) {
        try {
            webClient().delete()
                    .uri("/embeddings/{studentId}", studentId)
                    .retrieve()
                    .bodyToMono(Void.class)
                    .block();
        } catch (Exception e) {
            log.error("Failed to delete face data for student {}", studentId, e);
            throw new RuntimeException("Không thể xoá dữ liệu khuôn mặt: " + e.getMessage());
        }
    }

    /**
     * Simple record for confirmed attendance entries from teacher.
     */
    public record ConfirmedStudent(String studentId, String status, double confidence) {
    }
}
