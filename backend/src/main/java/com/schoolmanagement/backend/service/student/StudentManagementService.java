package com.schoolmanagement.backend.service.student;
import com.schoolmanagement.backend.dto.student.StudentProfileDto;

import com.schoolmanagement.backend.domain.auth.Role;

import com.schoolmanagement.backend.service.common.FileStorageService;
import com.schoolmanagement.backend.service.admin.BulkDeleteHelperService;

import com.schoolmanagement.backend.domain.classes.ClassRoomStatus;
import com.schoolmanagement.backend.domain.student.StudentStatus;
import com.schoolmanagement.backend.domain.entity.classes.ClassEnrollment;
import com.schoolmanagement.backend.domain.entity.classes.ClassRoom;
import com.schoolmanagement.backend.domain.entity.student.Guardian;
import com.schoolmanagement.backend.domain.entity.admin.School;
import com.schoolmanagement.backend.domain.entity.student.Student;
import com.schoolmanagement.backend.domain.entity.auth.User;
import com.schoolmanagement.backend.dto.admin.BulkPromoteResponse;
import com.schoolmanagement.backend.dto.student.StudentDto;
import com.schoolmanagement.backend.dto.student.StudentGuardianDto;
import com.schoolmanagement.backend.dto.admin.BulkPromoteRequest;
import com.schoolmanagement.backend.dto.student.CreateStudentRequest;
import com.schoolmanagement.backend.dto.student.UpdateStudentRequest;
import com.schoolmanagement.backend.exception.ApiException;
import com.schoolmanagement.backend.repo.classes.ClassEnrollmentRepository;
import com.schoolmanagement.backend.repo.classes.ClassRoomRepository;
import com.schoolmanagement.backend.repo.student.GuardianRepository;
import com.schoolmanagement.backend.repo.student.StudentRepository;
import com.schoolmanagement.backend.domain.entity.admin.AcademicYear;
import com.schoolmanagement.backend.service.admin.SemesterService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
public class StudentManagementService {

    private final StudentRepository students;
    private final GuardianRepository guardians;
    private final ClassRoomRepository classRooms;
    private final ClassEnrollmentRepository enrollments;
    private final StudentAccountService studentAccountService;
    private final com.schoolmanagement.backend.repo.auth.UserRepository users;
    private final SemesterService semesterService;

    @org.springframework.beans.factory.annotation.Autowired
    private FileStorageService fileStorageService;

    @org.springframework.beans.factory.annotation.Autowired
    private BulkDeleteHelperService bulkDeleteHelper;

    public StudentManagementService(StudentRepository students, GuardianRepository guardians,
            ClassRoomRepository classRooms, ClassEnrollmentRepository enrollments,
            StudentAccountService studentAccountService,
            com.schoolmanagement.backend.repo.auth.UserRepository users,
            SemesterService semesterService) {
        this.students = students;
        this.guardians = guardians;
        this.classRooms = classRooms;
        this.enrollments = enrollments;
        this.studentAccountService = studentAccountService;
        this.users = users;
        this.semesterService = semesterService;
    }

    // ==================== STUDENT MANAGEMENT ====================

    @Transactional
    public StudentDto createStudent(School school, CreateStudentRequest req) {
        // Auto-generate student code if not provided
        String studentCode = req.studentCode();
        if (studentCode == null || studentCode.isBlank()) {
            studentCode = generateNextStudentCode(school);
        }

        // Check duplicate student code
        if (students.existsBySchoolAndStudentCode(school, studentCode)) {
            throw new ApiException(HttpStatus.CONFLICT, "Mã học sinh đã tồn tại: " + studentCode);
        }

        // Validate date of birth must be in the past
        if (req.dateOfBirth() != null && !req.dateOfBirth().isBefore(java.time.LocalDate.now())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Ngày sinh phải nhỏ hơn ngày hiện tại");
        }

        // Validate Email
        String email = req.email() != null ? req.email().trim().toLowerCase() : null;
        if (email != null && !email.isBlank()) {
            // Check collision with Guardian
            if (!guardians.findByEmailIgnoreCase(email).isEmpty()) {
                throw new ApiException(HttpStatus.CONFLICT, "Email học sinh trùng với email của một Phụ huynh.");
            }
            // Check collision with User (Role != STUDENT)
            Optional<User> userOptional = users.findByEmailIgnoreCase(email);
            if (userOptional.isPresent() && userOptional.get().getRole() != Role.STUDENT) {
                throw new ApiException(HttpStatus.CONFLICT, "Email đã được sử dụng bởi tài khoản " + userOptional.get().getRole());
            }
        }

        // Create student
        Student student = Student.builder()
                .studentCode(studentCode)
                .fullName(req.fullName())
                .dateOfBirth(req.dateOfBirth())
                .gender(req.gender())
                .birthPlace(req.birthPlace())
                .address(req.address())
                .email(req.email() != null ? req.email().trim().toLowerCase() : null)
                .phone(req.phone())
                .enrollmentDate(req.enrollmentDate() != null ? req.enrollmentDate() : java.time.LocalDate.now())
                .status(StudentStatus.ACTIVE)
                .school(school)
                .build();

        // Process Guardian
        if (req.guardian() != null) {
            CreateStudentRequest.GuardianRequest guardianRequest = req.guardian();
            if (guardianRequest.fullName() != null && !guardianRequest.fullName().isBlank()) {
                Guardian guardian = null;

                // 1. Find or Create Guardian
                if (guardianRequest.email() != null && !guardianRequest.email().isBlank()) {
                    String cleanEmail = guardianRequest.email().trim().toLowerCase();

                    // Validate Guardian Email vs Student
                    if (students.existsByEmail(cleanEmail)) {
                        throw new ApiException(HttpStatus.CONFLICT,
                                "Email phụ huynh trùng với email của một Học sinh.");
                    }
                    if (email != null && email.equals(cleanEmail)) {
                        throw new ApiException(HttpStatus.CONFLICT,
                                "Email học sinh và phụ huynh không được trùng nhau.");
                    }
                    Optional<User> userOptional = users.findByEmailIgnoreCase(cleanEmail);
                    if (userOptional.isPresent() && userOptional.get().getRole() != Role.GUARDIAN) {
                        throw new ApiException(HttpStatus.CONFLICT,
                                "Email phụ huynh đã được sử dụng bởi tài khoản " + userOptional.get().getRole());
                    }

                    List<Guardian> existing = guardians.findByEmailIgnoreCase(cleanEmail);
                    if (!existing.isEmpty()) {
                        guardian = existing.get(0);
                        // Update relationship if provided
                        if (guardianRequest.relationship() != null && !guardianRequest.relationship().isBlank()) {
                            guardian.setRelationship(guardianRequest.relationship().trim());
                        }
                    } else {

                        guardian = Guardian.builder()
                                .fullName(guardianRequest.fullName().trim())
                                .phone(guardianRequest.phone() != null ? guardianRequest.phone().trim() : null)
                                .email(cleanEmail)
                                .relationship(guardianRequest.relationship() != null ? guardianRequest.relationship().trim() : null)
                                .build();
                        guardian = guardians.save(guardian);
                    }
                } else {
                    // No email -> Force create with NULL email
                    guardian = Guardian.builder()
                            .fullName(guardianRequest.fullName() != null ? guardianRequest.fullName().trim() : "Người giám hộ")
                            .phone(guardianRequest.phone() != null ? guardianRequest.phone().trim() : null)
                            .email(null)
                            .relationship(guardianRequest.relationship() != null ? guardianRequest.relationship().trim() : null)
                            .build();
                    guardian = guardians.save(guardian);
                }
                student.setGuardian(guardian);
            }
        }

        student = students.save(student);

        // Enroll in class if provided
        if (req.classId() != null) {
            ClassRoom classRoom = classRooms.findById(req.classId())
                    .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy lớp học"));

            if (!classRoom.getSchool().getId().equals(school.getId())) {
                throw new ApiException(HttpStatus.FORBIDDEN, "Lớp học không thuộc trường này");
            }

            // Check class is active
            if (classRoom.getStatus() != ClassRoomStatus.ACTIVE) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Không thể thêm học sinh vào lớp không hoạt động");
            }

            // Check class capacity
            long currentEnrollment = enrollments.countByClassRoom(classRoom);
            if (currentEnrollment >= classRoom.getMaxCapacity()) {
                throw new ApiException(HttpStatus.BAD_REQUEST,
                        "Lớp đã đủ sĩ số (" + classRoom.getMaxCapacity() + " học sinh)");
            }

            // Check combination match if provided
            if (req.combinationId() != null && classRoom.getCombination() != null) {
                if (!classRoom.getCombination().getId().equals(req.combinationId())) {
                    throw new ApiException(HttpStatus.BAD_REQUEST,
                            "Tổ hợp môn của lớp học không khớp với tổ hợp mong muốn của học sinh.");
                }
            }

            AcademicYear academicYear = req.academicYear() != null 
                    ? semesterService.getAcademicYearByName(school, req.academicYear())
                    : classRoom.getAcademicYear();

            ClassEnrollment enrollment = ClassEnrollment.builder()
                    .student(student)
                    .classRoom(classRoom)
                    .academicYear(academicYear)
                    .enrolledAt(Instant.now())
                    .build();
            enrollments.save(enrollment);
        } else if (req.combinationId() != null && req.grade() != null) {
            // Auto-assign to class based on combination
            AcademicYear academicYear = req.academicYear() != null 
                ? semesterService.getAcademicYearByName(school, req.academicYear())
                : semesterService.getActiveAcademicYear(school);

            if (academicYear != null) {
                autoAssignStudentToClass(school, student, req.combinationId(), academicYear, req.grade());
            }
        }

        return toStudentDto(student);
    }

    @Transactional(readOnly = true)
    public List<StudentDto> listStudents(School school, UUID classId) {
        // 1. Fetch academic year ONCE (not per-student)
        AcademicYear currentYear = semesterService.getActiveAcademicYearSafe(school);

        List<Student> studentList;
        if (classId != null) {
            ClassRoom classRoom = classRooms.findById(classId)
                    .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy lớp học"));

            if (!classRoom.getSchool().getId().equals(school.getId())) {
                throw new ApiException(HttpStatus.FORBIDDEN, "Lớp học không thuộc trường này");
            }

            studentList = enrollments.findAllByClassRoom(classRoom).stream()
                    .map(ClassEnrollment::getStudent)
                    .toList();
        } else {
            studentList = students.findAllBySchoolOrderByFullNameAsc(school);
        }

        // 2. Batch-fetch ALL enrollments in 1 query (fixes N+1)
        Map<UUID, ClassEnrollment> enrollmentMap = new HashMap<>();
        if (currentYear != null && !studentList.isEmpty()) {
            List<ClassEnrollment> allEnrollments =
                    enrollments.findAllByStudentInAndAcademicYear(studentList, currentYear);
            for (ClassEnrollment e : allEnrollments) {
                // Keep only the latest enrollment per student (list is ordered by enrolledAt DESC)
                enrollmentMap.putIfAbsent(e.getStudent().getId(), e);
            }
        }

        // 3. Map to DTOs without any DB queries
        return studentList.stream()
                .map(s -> toStudentDtoFast(s, enrollmentMap.get(s.getId())))
                .toList();
    }

    @Transactional(readOnly = true)
    public StudentDto getStudent(School school, UUID studentId) {
        Student student = students.findById(studentId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy học sinh"));

        if (!student.getSchool().getId().equals(school.getId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Học sinh không thuộc trường này");
        }

        return toStudentDto(student);
    }

    @Transactional(readOnly = true)
    public Student getSingleStudent(UUID studentId) {
        Student student = students.findById(studentId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy học sinh"));

        return student;
    }

    // Find student with Guardian ID
    @Transactional(readOnly = true)
    public StudentDto getStudentWithGuardian(String guardianEmail) {
        List<Guardian> guardianList = guardians.findByEmailIgnoreCase(guardianEmail);
        if (guardianList.isEmpty()) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy phụ huynh");
        }
        Guardian guardian = guardianList.get(0);
        if (guardian.getStudents() == null || guardian.getStudents().isEmpty()) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Phụ huynh chưa có học sinh nào");
        }
        // For backwards compatibility with the portal, returning the first student
        return toStudentDto(guardian.getStudents().iterator().next());
    }

    @Transactional
    public String uploadAvatar(School school, UUID studentId, org.springframework.web.multipart.MultipartFile file) {
        Student student = students.findById(studentId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy học sinh"));

        if (!student.getSchool().getId().equals(school.getId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Học sinh không thuộc trường này");
        }

        try {
            // "avatars" is the folder name in Cloudinary
            String url = fileStorageService.uploadFile(file, "avatars");
            student.setAvatarUrl(url);
            students.save(student);
            return url;
        } catch (java.io.IOException e) {
            log.error("Error uploading avatar for student {}", studentId, e);
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Lỗi khi upload ảnh đại diện: " + e.getMessage());
        }
    }

    // @Transactional - REMOVED to allow partial success (each delete is its own
    // transaction)
    public com.schoolmanagement.backend.dto.admin.BulkDeleteResponse deleteStudents(School school,
            com.schoolmanagement.backend.dto.admin.BulkDeleteRequest request) {
        log.info("Starting bulk delete for {} students", request.ids().size());

        int deleted = 0;
        int failed = 0;
        List<String> errors = new ArrayList<>();

        for (UUID id : request.ids()) {
            Student student = null;
            try {
                // Ensure student belongs to school first
                student = students.findById(id)
                        .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy học sinh"));
                if (!student.getSchool().getId().equals(school.getId())) {
                    throw new ApiException(HttpStatus.FORBIDDEN, "Học sinh không thuộc trường này");
                }

                if (student.getUser() != null) {
                    // Automatically delete account if exists
                    try {
                        studentAccountService.deleteAccountForStudent(school, student.getId());
                    } catch (Exception e) {
                        log.warn("Failed to delete account for student {}: {}", id, e.getMessage());
                        // Continue to try deleting student, or maybe throw?
                        // If account deletion fails, student deletion will likely fail too due to FK.
                        throw new ApiException(HttpStatus.BAD_REQUEST,
                                "Không thể xóa tài khoản của học sinh: " + e.getMessage());
                    }
                }

                // Call helper for isolated transaction deletion
                bulkDeleteHelper.deleteSingleStudent(id);
                deleted++;
            } catch (ApiException e) {
                failed++;
                errors.add(e.getMessage());
            } catch (org.springframework.dao.DataIntegrityViolationException e) {
                failed++;
                String name = (student != null) ? student.getFullName() : "ID " + id;
                errors.add("Không thể xóa học sinh (" + name + ") do dữ liệu liên quan.");
                log.error("Data integrity violation deleting student {}", id, e);
            } catch (Exception e) {
                failed++;
                errors.add("Lỗi hệ thống: " + e.getMessage());
                log.error("Error deleting student {}", id, e);
            }
        }

        return new com.schoolmanagement.backend.dto.admin.BulkDeleteResponse(deleted, failed, errors);
    }

    @Transactional
    public StudentDto updateStudent(School school, UUID studentId, UpdateStudentRequest req) {
        Student student = students.findById(studentId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy học sinh"));

        if (!student.getSchool().getId().equals(school.getId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Học sinh không thuộc trường này");
        }

        // Validate date of birth must be in the past
        if (req.dateOfBirth() != null && !req.dateOfBirth().isBefore(java.time.LocalDate.now())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Ngày sinh phải nhỏ hơn ngày hiện tại");
        }

        // Update basic info
        student.setFullName(req.fullName());
        student.setDateOfBirth(req.dateOfBirth());
        student.setGender(req.gender());
        student.setBirthPlace(req.birthPlace());
        student.setAddress(req.address());
        student.setAddress(req.address());

        // Validate Email Update
        String newEmail = req.email() != null ? req.email().trim().toLowerCase() : null;
        if (newEmail != null && !newEmail.isBlank()) {
            // Only check if email changed
            if (!newEmail.equals(student.getEmail())) {
                // Check collision with Guardian
                if (!guardians.findByEmailIgnoreCase(newEmail).isEmpty()) {
                    throw new ApiException(HttpStatus.CONFLICT, "Email học sinh trùng với email của một Phụ huynh.");
                }
                // Check collision with User (Role != STUDENT)
                Optional<User> userOptional = users.findByEmailIgnoreCase(newEmail);
                if (userOptional.isPresent() && userOptional.get().getRole() != Role.STUDENT) {
                    throw new ApiException(HttpStatus.CONFLICT,
                            "Email đã được sử dụng bởi tài khoản " + userOptional.get().getRole());
                }
                // Check duplicate student email (other students) - handled by DB constraint
                // usually, but service check is safer
                if (students.existsByEmail(newEmail)) { // This might return true for self if not careful, but
                                                        // existsByEmail matches ANY.
                    // Need exclude self. Repository doesn't have it standard.
                    // Let DB constraint handle same-table duplicate for now or fetch.
                    // students.findByEmail(newEmail) -> if present and id != studentId -> Conflict.
                }
                student.setEmail(newEmail);
            }
        } else {
            student.setEmail(null);
        }

        student.setPhone(req.phone());

        // Update status if provided
        if (req.status() != null) {
            student.setStatus(req.status());
        }

        // Update guardian
        if (req.guardian() != null) {
            UpdateStudentRequest.GuardianRequest guardianRequest = req.guardian();
            if (guardianRequest.fullName() != null && !guardianRequest.fullName().isBlank()) {
                Guardian guardian = null;

                // 1. Find or Create Guardian
                if (guardianRequest.email() != null && !guardianRequest.email().isBlank()) {
                    String cleanEmail = guardianRequest.email().trim().toLowerCase();

                    // Validate Guardian Email vs Student
                    if (students.existsByEmail(cleanEmail)) {
                        throw new ApiException(HttpStatus.CONFLICT,
                                "Email phụ huynh trùng với email của một Học sinh.");
                    }
                    if (student.getEmail() != null && student.getEmail().equals(cleanEmail)) {
                        throw new ApiException(HttpStatus.CONFLICT,
                                "Email học sinh và phụ huynh không được trùng nhau.");
                    }
                    Optional<User> userOptional = users.findByEmailIgnoreCase(cleanEmail);
                    if (userOptional.isPresent() && userOptional.get().getRole() != Role.GUARDIAN) {
                        throw new ApiException(HttpStatus.CONFLICT,
                                "Email phụ huynh đã được sử dụng bởi tài khoản " + userOptional.get().getRole());
                    }

                    List<Guardian> existing = guardians.findByEmailIgnoreCase(cleanEmail);
                    if (!existing.isEmpty()) {
                        guardian = existing.get(0);
                        // Update existing guardian details
                        guardian.setFullName(guardianRequest.fullName().trim());
                        if (guardianRequest.phone() != null)
                            guardian.setPhone(guardianRequest.phone().trim());
                        if (guardianRequest.relationship() != null && !guardianRequest.relationship().isBlank())
                            guardian.setRelationship(guardianRequest.relationship().trim());
                        guardian = guardians.save(guardian);
                    } else {
                        guardian = Guardian.builder()
                                .fullName(guardianRequest.fullName().trim())
                                .phone(guardianRequest.phone() != null ? guardianRequest.phone().trim() : null)
                                .email(cleanEmail)
                                .relationship(guardianRequest.relationship() != null ? guardianRequest.relationship().trim() : null)
                                .build();
                        guardian = guardians.save(guardian);
                    }
                } else {
                    // No email -> Force create with NULL email
                    guardian = Guardian.builder()
                            .fullName(guardianRequest.fullName() != null ? guardianRequest.fullName().trim() : "Người giám hộ")
                            .phone(guardianRequest.phone() != null ? guardianRequest.phone().trim() : null)
                            .email(null)
                            .relationship(guardianRequest.relationship() != null ? guardianRequest.relationship().trim() : null)
                            .build();
                    guardian = guardians.save(guardian);
                }
                student.setGuardian(guardian);
            }
        }

        student = students.save(student);

        // Handle class enrollment change
        if (req.classId() != null) {
            // Get current enrollment for this academic year
            AcademicYear academicYear = req.academicYear() != null 
                ? semesterService.getAcademicYearByName(school, req.academicYear())
                : semesterService.getActiveAcademicYear(school);

            Optional<ClassEnrollment> currentEnrollment = enrollments
                    .findTopByStudentAndAcademicYearOrderByEnrolledAtDesc(student,
                            academicYear);

            // Check if the class is changing
            boolean needsNewEnrollment = currentEnrollment.isEmpty() ||
                    !currentEnrollment.get().getClassRoom().getId().equals(req.classId());

            if (needsNewEnrollment) {
                ClassRoom newClass = classRooms.findById(req.classId())
                        .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy lớp học"));

                if (!newClass.getSchool().getId().equals(school.getId())) {
                    throw new ApiException(HttpStatus.FORBIDDEN, "Lớp học không thuộc trường này");
                }

                // Check class is active
                if (newClass.getStatus() != ClassRoomStatus.ACTIVE) {
                    throw new ApiException(HttpStatus.BAD_REQUEST, "Không thể chuyển học sinh vào lớp không hoạt động");
                }

                // Check class capacity (excluding current student if already in this class)
                long currentCount = enrollments.countByClassRoom(newClass);
                if (currentEnrollment.isPresent()
                        && currentEnrollment.get().getClassRoom().getId().equals(req.classId())) {
                    currentCount--; // Don't count current student
                }
                if (currentCount >= newClass.getMaxCapacity()) {
                    throw new ApiException(HttpStatus.BAD_REQUEST,
                            "Lớp đã đủ sĩ số (" + newClass.getMaxCapacity() + " học sinh)");
                }

                // Check combination match if provided in request OR if existing
                if (newClass.getCombination() != null) {
                    if (req.combinationId() != null) {
                        if (!newClass.getCombination().getId().equals(req.combinationId())) {
                            throw new ApiException(HttpStatus.BAD_REQUEST,
                                    "Tổ hợp của lớp mới không khớp với tổ hợp mong muốn.");
                        }
                    } else if (currentEnrollment.isPresent()
                            && currentEnrollment.get().getClassRoom().getCombination() != null) {
                        if (!newClass.getCombination().getId()
                                .equals(currentEnrollment.get().getClassRoom().getCombination().getId())) {
                            throw new ApiException(HttpStatus.BAD_REQUEST,
                                    "Tổ hợp của lớp mới không khớp với tổ hợp hiện tại của học sinh.");
                        }
                    }
                }

                // Remove old enrollment if exists
                currentEnrollment.ifPresent(enrollments::delete);

                // Create new enrollment
                ClassEnrollment newEnrollment = ClassEnrollment.builder()
                        .student(student)
                        .classRoom(newClass)
                        .academicYear(academicYear)
                        .enrolledAt(Instant.now())
                        .build();
                enrollments.save(newEnrollment);
            }
        }

        return toStudentDto(student);
    }

    /**
     * Generate next student code in format HS0001, HS0002, etc.
     */
    private String generateNextStudentCode(School school) {
        // Find the highest student code in the school
        Optional<Student> latestStudent = students.findTopBySchoolOrderByStudentCodeDesc(school);

        if (latestStudent.isEmpty()) {
            return "HS0001";
        }

        String lastCode = latestStudent.get().getStudentCode();

        try {
            if (lastCode.startsWith("HS")) {
                int lastNumber = Integer.parseInt(lastCode.substring(2));
                int nextNumber = lastNumber + 1;
                return String.format("HS%04d", nextNumber);
            }
        } catch (NumberFormatException e) {
            // If parsing fails, fall through to default
        }

        long studentCount = students.countBySchool(school);
        return String.format("HS%04d", studentCount + 1);
    }

    /**
     * Fast DTO mapping — no DB queries. Used by listStudents() with pre-fetched data.
     */
    private StudentDto toStudentDtoFast(Student student, ClassEnrollment enrollment) {
        StudentGuardianDto guardianDto = null;
        if (student.getGuardian() != null) {
            guardianDto = new StudentGuardianDto(
                    student.getGuardian().getId(),
                    student.getGuardian().getFullName(),
                    student.getGuardian().getPhone(),
                    student.getGuardian().getEmail(),
                    student.getGuardian().getRelationship());
        }

        String currentClassName = enrollment != null ? enrollment.getClassRoom().getName() : null;
        UUID currentClassId = enrollment != null ? enrollment.getClassRoom().getId() : null;

        return new StudentDto(
                student.getId(),
                student.getStudentCode(),
                student.getFullName(),
                student.getDateOfBirth(),
                student.getGender() != null ? student.getGender().name() : null,
                student.getBirthPlace(),
                student.getAddress(),
                student.getEmail(),
                student.getPhone(),
                student.getAvatarUrl(),
                student.getStatus().name(),
                student.getEnrollmentDate(),
                currentClassName,
                currentClassId,
                student.getUser() != null,
                guardianDto);
    }

    /**
     * Original DTO mapping with DB queries — used for single-student operations.
     */
    private StudentDto toStudentDto(Student student) {
        AcademicYear currentYear = semesterService.getActiveAcademicYearSafe(student.getSchool());
        ClassEnrollment enrollment = null;
        if (currentYear != null) {
            enrollment = enrollments.findTopByStudentAndAcademicYearOrderByEnrolledAtDesc(
                    student, currentYear).orElse(null);
        }
        return toStudentDtoFast(student, enrollment);
    }

    private void autoAssignStudentToClass(School school, Student student,
            UUID combinationId, AcademicYear academicYear, int grade) {
        // Find all active classes for the grade
        List<ClassRoom> classes = classRooms.findAllBySchoolAndGradeAndAcademicYearAndStatus(
                school, grade, academicYear, ClassRoomStatus.ACTIVE);

        if (classes.isEmpty())
            return;

        // Get enrollment counts
        java.util.Map<UUID, Long> counts = new java.util.HashMap<>();
        for (ClassRoom c : classes) {
            counts.put(c.getId(), enrollments.countByClassRoom(c));
        }

        // Filter by connection to combination
        List<ClassRoom> candidates = classes.stream()
                .filter(classroom -> classroom.getCombination() != null && classroom.getCombination().getId().equals(combinationId))
                .sorted(java.util.Comparator.comparingLong(classroom -> counts.get(classroom.getId())))
                .toList();

        // Fallback if no matching stream class found: try any class in grade
        if (candidates.isEmpty()) {
            candidates = classes.stream()
                    .sorted(java.util.Comparator.comparingLong(classroom -> counts.get(classroom.getId())))
                    .toList();
        }

        // Pick first one with capacity
        for (ClassRoom classroom : candidates) {
            if (counts.get(classroom.getId()) < classroom.getMaxCapacity()) {
                ClassEnrollment enrollment = ClassEnrollment.builder()
                        .student(student)
                        .classRoom(classroom)
                        .academicYear(academicYear)
                        .enrolledAt(Instant.now())
                        .build();
                enrollments.save(enrollment);
                break;
            }
        }
    }

    // ==================== STUDENT PROFILE ====================

    /**
     * Get detailed student profile with enrollment history.
     */
    @Transactional(readOnly = true)
    public StudentProfileDto getStudentProfile(School school, UUID studentId) {
        Student student = students.findByIdAndSchool(studentId, school)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy học sinh"));

        // Get guardian (Many-to-One)
        StudentProfileDto.GuardianDto guardianDto = null;
        if (student.getGuardian() != null) {
            guardianDto = new StudentProfileDto.GuardianDto(
                    student.getGuardian().getId(),
                    student.getGuardian().getFullName(),
                    student.getGuardian().getPhone(),
                    student.getGuardian().getEmail(),
                    student.getGuardian().getRelationship());
        }

        // Get enrollment history
        List<ClassEnrollment> enrollmentList = enrollments.findAllByStudent(student);
        List<StudentProfileDto.ClassEnrollmentHistoryDto> historyDtos = enrollmentList.stream()
                .sorted((a, b) -> b.getEnrolledAt().compareTo(a.getEnrolledAt())) // newest first
                .map(e -> new StudentProfileDto.ClassEnrollmentHistoryDto(
                        e.getId(),
                        e.getClassRoom().getId(),
                        e.getClassRoom().getName(),
                        e.getAcademicYear().getName(),
                        e.getEnrolledAt()))
                .toList();

        // Get current class info
        String currentClassName = null;
        UUID currentClassId = null;
        AcademicYear currentYear = semesterService.getActiveAcademicYearSafe(school);

        Optional<ClassEnrollment> currentEnrollment = Optional.empty();
        if (currentYear != null) {
            currentEnrollment = enrollments.findTopByStudentAndAcademicYearOrderByEnrolledAtDesc(
                    student,
                    currentYear);
        }
        if (currentEnrollment.isPresent()) {
            currentClassName = currentEnrollment.get().getClassRoom().getName();
            currentClassId = currentEnrollment.get().getClassRoom().getId();
        }

        return new StudentProfileDto(
                student.getId(),
                student.getStudentCode(),
                student.getFullName(),
                student.getDateOfBirth(),
                student.getGender() != null ? student.getGender().name() : null,
                student.getBirthPlace(),
                student.getAddress(),
                student.getEmail(),
                student.getPhone(),
                student.getAvatarUrl(),
                student.getStatus().name(),
                student.getEnrollmentDate(),
                currentClassName,
                currentClassId,
                guardianDto,
                historyDtos);
    }

    /**
     * Transfer student to a new class. Creates new enrollment, keeps history.
     */
    @Transactional
    public StudentProfileDto transferStudent(School school, UUID studentId, UUID newClassId) {
        Student student = students.findByIdAndSchool(studentId, school)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy học sinh"));

        ClassRoom newClass = classRooms.findByIdAndSchool(newClassId, school)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy lớp đích"));

        if (newClass.getStatus() != ClassRoomStatus.ACTIVE) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Lớp đích không đang hoạt động");
        }

        AcademicYear academicYear = newClass.getAcademicYear();

        // Check if already in this class for this academic year
        boolean alreadyEnrolled = enrollments.existsByStudentAndClassRoomAndAcademicYear(student, newClass,
                academicYear);
        if (alreadyEnrolled) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Học sinh đã thuộc lớp này trong năm học " + academicYear);
        }

        // Check class capacity
        long currentCount = enrollments.countByClassRoom(newClass);
        if (currentCount >= newClass.getMaxCapacity()) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "Lớp đích đã đạt sĩ số tối đa (" + newClass.getMaxCapacity() + ")");
        }

        // Check combination match
        Optional<ClassEnrollment> existingEnrollment = enrollments
                .findTopByStudentAndAcademicYearOrderByEnrolledAtDesc(student, academicYear);

        if (existingEnrollment.isPresent()) {
            ClassRoom currentClass = existingEnrollment.get().getClassRoom();
            if (currentClass.getCombination() != null && newClass.getCombination() != null) {
                if (!currentClass.getCombination().getId().equals(newClass.getCombination().getId())) {
                    throw new ApiException(HttpStatus.BAD_REQUEST,
                            "Tổ hợp của lớp mới không khớp với tổ hợp hiện tại của học sinh.");
                }
            }
        }

        // Do not delete existing enrollment to preserve history

        // Create new enrollment
        ClassEnrollment newEnrollment = ClassEnrollment.builder()
                .student(student)
                .classRoom(newClass)
                .academicYear(academicYear)
                .enrolledAt(Instant.now())
                .build();
        enrollments.save(newEnrollment);

        log.info("Transferred student {} from {} to class {} for year {}",
                student.getStudentCode(),
                existingEnrollment.map(e -> e.getClassRoom().getName()).orElse("N/A"),
                newClass.getName(),
                academicYear);

        return getStudentProfile(school, studentId);
    }

    // ==================== BULK PROMOTION ====================

    /**
     * Promote multiple students to a new grade in a new academic year.
     * Auto-assigns each student to an available class in the target grade.
     */
    @Transactional
    public BulkPromoteResponse promoteStudents(School school, BulkPromoteRequest request) {
        int promoted = 0;
        int skipped = 0;
        List<String> errors = new ArrayList<>();

        // Find and validate target Academic Year
        AcademicYear targetYear = semesterService.getAcademicYearByName(school, request.targetAcademicYear());
        if (targetYear == null) {
            errors.add("Năm học '" + request.targetAcademicYear() + "' không tồn tại.");
            return new BulkPromoteResponse(0, request.studentIds().size(), errors);
        }

        // Find all active classes for the target grade + academic year
        List<ClassRoom> targetClasses = classRooms.findAllBySchoolAndGradeAndAcademicYearAndStatus(
                school, request.targetGrade(), targetYear, ClassRoomStatus.ACTIVE);

        if (targetClasses.isEmpty()) {
            errors.add("Không có lớp ACTIVE nào ở khối " + request.targetGrade()
                    + " cho năm học " + targetYear.getName());
            return new BulkPromoteResponse(0, request.studentIds().size(), errors);
        }

        // Pre-compute enrollment counts for target classes
        java.util.Map<UUID, Long> counts = new java.util.HashMap<>();
        for (ClassRoom c : targetClasses) {
            counts.put(c.getId(), enrollments.countByClassRoom(c));
        }

        for (UUID studentId : request.studentIds()) {
            try {
                Student student = students.findByIdAndSchool(studentId, school)
                        .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND,
                                "Không tìm thấy học sinh (ID: " + studentId + ")"));

                // Skip if not ACTIVE
                if (student.getStatus() != StudentStatus.ACTIVE) {
                    skipped++;
                    errors.add(student.getFullName() + ": Trạng thái không phải Đang học");
                    continue;
                }

                // Skip if already has enrollment in target academic year
                Optional<ClassEnrollment> existing = enrollments
                        .findTopByStudentAndAcademicYearOrderByEnrolledAtDesc(
                                student, targetYear);
                if (existing.isPresent()) {
                    skipped++;
                    errors.add(student.getFullName() + ": Đã có lớp ("
                            + existing.get().getClassRoom().getName() + ") trong năm học "
                            + targetYear.getName());
                    continue;
                }

                // Find a class with available capacity (load-balanced: pick least filled)
                List<ClassRoom> sorted = targetClasses.stream()
                        .sorted(java.util.Comparator.comparingLong(c -> counts.get(c.getId())))
                        .toList();

                boolean assigned = false;
                for (ClassRoom c : sorted) {
                    if (counts.get(c.getId()) < c.getMaxCapacity()) {
                        ClassEnrollment enrollment = ClassEnrollment.builder()
                                .student(student)
                                .classRoom(c)
                                .academicYear(targetYear)
                                .enrolledAt(Instant.now())
                                .build();
                        enrollments.save(enrollment);
                        counts.put(c.getId(), counts.get(c.getId()) + 1);
                        promoted++;
                        assigned = true;
                        break;
                    }
                }

                if (!assigned) {
                    skipped++;
                    errors.add(student.getFullName() + ": Tất cả lớp khối "
                            + request.targetGrade() + " đã đầy");
                }
            } catch (ApiException e) {
                skipped++;
                errors.add(e.getMessage());
            } catch (Exception e) {
                skipped++;
                errors.add("Lỗi khi xử lý HS (ID: " + studentId + "): " + e.getMessage());
                log.error("Error promoting student {}", studentId, e);
            }
        }

        log.info("Bulk promotion completed: {} promoted, {} skipped out of {} total",
                promoted, skipped, request.studentIds().size());

        return new BulkPromoteResponse(promoted, skipped, errors);
    }

}
