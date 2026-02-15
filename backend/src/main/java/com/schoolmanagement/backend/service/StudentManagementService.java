package com.schoolmanagement.backend.service;

import com.schoolmanagement.backend.domain.ClassRoomStatus;
import com.schoolmanagement.backend.domain.StudentStatus;
import com.schoolmanagement.backend.domain.entity.*;
import com.schoolmanagement.backend.dto.BulkPromoteResponse;
import com.schoolmanagement.backend.dto.StudentDto;
import com.schoolmanagement.backend.dto.StudentGuardianDto;
import com.schoolmanagement.backend.dto.StudentProfileDto;
import com.schoolmanagement.backend.dto.request.BulkPromoteRequest;
import com.schoolmanagement.backend.dto.request.CreateStudentRequest;
import com.schoolmanagement.backend.dto.request.UpdateStudentRequest;
import com.schoolmanagement.backend.exception.ApiException;
import com.schoolmanagement.backend.repo.ClassEnrollmentRepository;
import com.schoolmanagement.backend.repo.ClassRoomRepository;
import com.schoolmanagement.backend.repo.GuardianRepository;
import com.schoolmanagement.backend.repo.StudentRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
public class StudentManagementService {

    private final StudentRepository students;
    private final GuardianRepository guardians;
    private final ClassRoomRepository classRooms;
    private final ClassEnrollmentRepository enrollments;

    @org.springframework.beans.factory.annotation.Autowired
    private BulkDeleteHelperService bulkDeleteHelper;

    public StudentManagementService(StudentRepository students, GuardianRepository guardians,
            ClassRoomRepository classRooms, ClassEnrollmentRepository enrollments) {
        this.students = students;
        this.guardians = guardians;
        this.classRooms = classRooms;
        this.enrollments = enrollments;
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

        // Create student
        Student student = Student.builder()
                .studentCode(studentCode)
                .fullName(req.fullName())
                .dateOfBirth(req.dateOfBirth())
                .gender(req.gender())
                .birthPlace(req.birthPlace())
                .address(req.address())
                .email(req.email())
                .phone(req.phone())
                .enrollmentDate(req.enrollmentDate() != null ? req.enrollmentDate() : java.time.LocalDate.now())
                .status(StudentStatus.ACTIVE)
                .school(school)
                .build();

        // Process Guardian
        if (req.guardian() != null) {
            CreateStudentRequest.GuardianRequest g = req.guardian();
            if (g.fullName() != null && !g.fullName().isBlank()) {
                Guardian guardian = null;

                // 1. Find or Create Guardian
                if (g.email() != null && !g.email().isBlank()) {
                    Optional<Guardian> existing = guardians.findByEmail(g.email());
                    if (existing.isPresent()) {
                        guardian = existing.get();
                    } else {
                        guardian = Guardian.builder()
                                .fullName(g.fullName())
                                .phone(g.phone())
                                .email(g.email())
                                .build();
                        guardian = guardians.save(guardian);
                    }
                } else {
                    // No email -> Force create
                    guardian = Guardian.builder()
                            .fullName(g.fullName())
                            .phone(g.phone())
                            .email(null)
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
            if (classRoom.getStatus() != com.schoolmanagement.backend.domain.ClassRoomStatus.ACTIVE) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Không thể thêm học sinh vào lớp không hoạt động");
            }

            // Check class capacity
            long currentEnrollment = enrollments.countByClassRoom(classRoom);
            if (currentEnrollment >= classRoom.getMaxCapacity()) {
                throw new ApiException(HttpStatus.BAD_REQUEST,
                        "Lớp đã đủ sĩ số (" + classRoom.getMaxCapacity() + " học sinh)");
            }

            String academicYear = req.academicYear() != null ? req.academicYear() : classRoom.getAcademicYear();

            ClassEnrollment enrollment = ClassEnrollment.builder()
                    .student(student)
                    .classRoom(classRoom)
                    .academicYear(academicYear)
                    .enrolledAt(Instant.now())
                    .build();
            enrollments.save(enrollment);
        } else if (req.department() != null && req.grade() != null) {
            // Auto-assign to class based on department
            String academicYear = req.academicYear() != null ? req.academicYear()
                    : classRooms.findFirstBySchoolOrderByAcademicYearDesc(school)
                            .map(ClassRoom::getAcademicYear).orElse("");

            if (!academicYear.isBlank()) {
                autoAssignStudentToClass(school, student, req.department(), academicYear, req.grade());
            }
        }

        return toStudentDto(student);
    }

    @Transactional(readOnly = true)
    public List<StudentDto> listStudents(School school, UUID classId) {
        if (classId != null) {
            ClassRoom classRoom = classRooms.findById(classId)
                    .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy lớp học"));

            if (!classRoom.getSchool().getId().equals(school.getId())) {
                throw new ApiException(HttpStatus.FORBIDDEN, "Lớp học không thuộc trường này");
            }

            return enrollments.findAllByClassRoom(classRoom).stream()
                    .map(enrollment -> toStudentDto(enrollment.getStudent()))
                    .toList();
        }

        return students.findAllBySchoolOrderByFullNameAsc(school).stream()
                .map(this::toStudentDto)
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

    // @Transactional - REMOVED to allow partial success (each delete is its own
    // transaction)
    public com.schoolmanagement.backend.dto.BulkDeleteResponse deleteStudents(School school,
            com.schoolmanagement.backend.dto.request.BulkDeleteRequest request) {
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
                    throw new ApiException(HttpStatus.BAD_REQUEST,
                            "Không thể xóa học sinh đã có tài khoản người dùng (" + student.getFullName()
                                    + "). Vui lòng xóa tài khoản trước.");
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

        return new com.schoolmanagement.backend.dto.BulkDeleteResponse(deleted, failed, errors);
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
        student.setEmail(req.email());
        student.setPhone(req.phone());

        // Update status if provided
        if (req.status() != null) {
            student.setStatus(req.status());
        }

        // Update guardian
        if (req.guardian() != null) {
            UpdateStudentRequest.GuardianRequest g = req.guardian();
            if (g.fullName() != null && !g.fullName().isBlank()) {
                Guardian guardian = null;

                // 1. Find or Create Guardian
                if (g.email() != null && !g.email().isBlank()) {
                    Optional<Guardian> existing = guardians.findByEmail(g.email());
                    if (existing.isPresent()) {
                        guardian = existing.get();
                    } else {
                        guardian = Guardian.builder()
                                .fullName(g.fullName())
                                .phone(g.phone())
                                .email(g.email())
                                .build();
                        guardian = guardians.save(guardian);
                    }
                } else {
                    // No email -> Force create
                    guardian = Guardian.builder()
                            .fullName(g.fullName())
                            .phone(g.phone())
                            .email(null)
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
            String academicYear = req.academicYear() != null ? req.academicYear()
                    : classRooms.findFirstBySchoolOrderByAcademicYearDesc(school)
                            .map(ClassRoom::getAcademicYear)
                            .orElse("");

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

    private StudentDto toStudentDto(Student student) {
        StudentGuardianDto guardianDto = null;
        if (student.getGuardian() != null) {
            guardianDto = new StudentGuardianDto(
                    student.getGuardian().getId(),
                    student.getGuardian().getFullName(),
                    student.getGuardian().getPhone(),
                    student.getGuardian().getEmail(),
                    "Phụ huynh" // Default relationship
            );
        }

        // Get current class enrollment
        String currentClassName = null;
        UUID currentClassId = null;
        Optional<ClassEnrollment> currentEnrollment = enrollments.findTopByStudentAndAcademicYearOrderByEnrolledAtDesc(
                student,
                classRooms.findFirstBySchoolOrderByAcademicYearDesc(student.getSchool())
                        .map(ClassRoom::getAcademicYear).orElse(""));
        if (currentEnrollment.isPresent()) {
            currentClassName = currentEnrollment.get().getClassRoom().getName();
            currentClassId = currentEnrollment.get().getClassRoom().getId();
        }

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

    private void autoAssignStudentToClass(School school, Student student,
            com.schoolmanagement.backend.domain.ClassDepartment department, String academicYear, int grade) {
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

        // Filter by connection to department/stream
        List<ClassRoom> candidates = classes.stream()
                .filter(c -> matchesDepartment(c, department))
                .sorted(java.util.Comparator.comparingLong(c -> counts.get(c.getId())))
                .toList();

        // Fallback if no matching stream class found: try any class in grade
        if (candidates.isEmpty()) {
            candidates = classes.stream()
                    .sorted(java.util.Comparator.comparingLong(c -> counts.get(c.getId())))
                    .toList();
        }

        // Pick first one with capacity
        for (ClassRoom c : candidates) {
            if (counts.get(c.getId()) < c.getMaxCapacity()) {
                ClassEnrollment enrollment = ClassEnrollment.builder()
                        .student(student)
                        .classRoom(c)
                        .academicYear(academicYear)
                        .enrolledAt(Instant.now())
                        .build();
                enrollments.save(enrollment);
                break;
            }
        }
    }

    private boolean matchesDepartment(ClassRoom classRoom,
            com.schoolmanagement.backend.domain.ClassDepartment studentDept) {
        if (studentDept == null || studentDept == com.schoolmanagement.backend.domain.ClassDepartment.KHONG_PHAN_BAN) {
            return true;
        }

        // Check combination stream first
        if (classRoom.getCombination() != null && classRoom.getCombination().getStream() != null) {
            String streamName = classRoom.getCombination().getStream().name();
            if (streamName.equals(studentDept.name())) {
                return true;
            }
        }

        // Check class department as fallback
        if (classRoom.getDepartment() == studentDept) {
            return true;
        }

        return false;
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
                    "Phụ huynh" // Default relationship
            );
        }

        // Get enrollment history
        List<ClassEnrollment> enrollmentList = enrollments.findAllByStudent(student);
        List<StudentProfileDto.ClassEnrollmentHistoryDto> historyDtos = enrollmentList.stream()
                .sorted((a, b) -> b.getEnrolledAt().compareTo(a.getEnrolledAt())) // newest first
                .map(e -> new StudentProfileDto.ClassEnrollmentHistoryDto(
                        e.getId(),
                        e.getClassRoom().getId(),
                        e.getClassRoom().getName(),
                        e.getAcademicYear(),
                        e.getEnrolledAt()))
                .toList();

        // Get current class info
        String currentClassName = null;
        UUID currentClassId = null;
        Optional<ClassEnrollment> currentEnrollment = enrollments.findTopByStudentAndAcademicYearOrderByEnrolledAtDesc(
                student,
                classRooms.findFirstBySchoolOrderByAcademicYearDesc(school)
                        .map(ClassRoom::getAcademicYear).orElse(""));
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

        String academicYear = newClass.getAcademicYear();

        // Check if already in this class for this academic year
        boolean alreadyEnrolled = enrollments.existsByStudentAndClassRoomAndAcademicYear(student, newClass,
                academicYear);
        if (alreadyEnrolled) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Học sinh đã thuộc lớp này trong năm học " + academicYear);
        }

        // Get existing enrollment for logging
        Optional<ClassEnrollment> existingEnrollment = enrollments
                .findTopByStudentAndAcademicYearOrderByEnrolledAtDesc(student, academicYear);
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

        // Find all active classes for the target grade + academic year
        List<ClassRoom> targetClasses = classRooms.findAllBySchoolAndGradeAndAcademicYearAndStatus(
                school, request.targetGrade(), request.targetAcademicYear(), ClassRoomStatus.ACTIVE);

        if (targetClasses.isEmpty()) {
            errors.add("Không có lớp ACTIVE nào ở khối " + request.targetGrade()
                    + " cho năm học " + request.targetAcademicYear());
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
                                student, request.targetAcademicYear());
                if (existing.isPresent()) {
                    skipped++;
                    errors.add(student.getFullName() + ": Đã có lớp ("
                            + existing.get().getClassRoom().getName() + ") trong năm học "
                            + request.targetAcademicYear());
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
                                .academicYear(request.targetAcademicYear())
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
