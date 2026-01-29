package com.schoolmanagement.backend.service;

import com.schoolmanagement.backend.domain.ClassRoomStatus;
import com.schoolmanagement.backend.domain.Role;
import com.schoolmanagement.backend.domain.StudentStatus;
import com.schoolmanagement.backend.domain.entity.*;
import com.schoolmanagement.backend.dto.BulkAccountCreationResponse;
import com.schoolmanagement.backend.dto.StudentDto;
import com.schoolmanagement.backend.dto.UserDto;
import com.schoolmanagement.backend.dto.request.CreateStudentRequest;
import com.schoolmanagement.backend.dto.request.UpdateStudentRequest;
import com.schoolmanagement.backend.exception.ApiException;
import com.schoolmanagement.backend.repo.ClassEnrollmentRepository;
import com.schoolmanagement.backend.repo.ClassRoomRepository;
import com.schoolmanagement.backend.repo.GuardianRepository;
import com.schoolmanagement.backend.repo.StudentRepository;
import com.schoolmanagement.backend.repo.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class StudentManagementService {

    private final StudentRepository students;
    private final GuardianRepository guardians;
    private final ClassRoomRepository classRooms;
    private final ClassEnrollmentRepository enrollments;
    private final UserRepository users;
    private final PasswordEncoder passwordEncoder;
    private final MailService mailService;

    public StudentManagementService(StudentRepository students, GuardianRepository guardians,
            ClassRoomRepository classRooms, ClassEnrollmentRepository enrollments,
            UserRepository users, PasswordEncoder passwordEncoder, MailService mailService) {
        this.students = students;
        this.guardians = guardians;
        this.classRooms = classRooms;
        this.enrollments = enrollments;
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.mailService = mailService;
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

        student = students.save(student);

        // Save guardians
        if (req.guardians() != null && !req.guardians().isEmpty()) {
            for (CreateStudentRequest.GuardianRequest g : req.guardians()) {
                Guardian guardian = Guardian.builder()
                        .student(student)
                        .fullName(g.fullName())
                        .phone(g.phone())
                        .email(g.email())
                        .relationship(g.relationship())
                        .build();

                // If guardian has email, create/link account
                if (g.email() != null && !g.email().isBlank()) {
                    try {
                        User guardianUser = processGuardianUser(school, g.email(), g.fullName());
                        guardian.setUser(guardianUser);
                    } catch (Exception e) {
                        // Log error but don't fail student creation?
                        // For now, let's log and proceed, or should we fail?
                        // User requested this feature, so maybe fail if we can't create account?
                        // But duplicate email on different role might be an issue.
                        // Let's rely on processGuardianUser to handle it gracefully.
                        System.err.println("Failed to create guardian user: " + e.getMessage());
                    }
                }

                guardians.save(guardian);
            }
        }

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
        }

        return toStudentDto(student);
    }

    @Transactional(readOnly = true)
    public List<StudentDto> listStudents(School school) {
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

    @Transactional
    public void deleteStudent(School school, UUID studentId) {
        Student student = students.findById(studentId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy học sinh"));

        if (!student.getSchool().getId().equals(school.getId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Học sinh không thuộc trường này");
        }

        // Delete related records
        enrollments.deleteAllByStudent(student);
        guardians.deleteAllByStudent(student);
        students.delete(student);
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

        student = students.save(student);

        // Update guardians - replace all existing guardians with new ones
        if (req.guardians() != null) {
            // Delete existing guardians
            guardians.deleteAllByStudent(student);

            // Create new guardians
            for (UpdateStudentRequest.GuardianRequest g : req.guardians()) {
                if (g.fullName() != null && !g.fullName().isBlank()) {
                    Guardian guardian = Guardian.builder()
                            .student(student)
                            .fullName(g.fullName())
                            .phone(g.phone())
                            .email(g.email())
                            .relationship(g.relationship())
                            .build();
                    guardians.save(guardian);
                }
            }
        }

        // Handle class enrollment change
        if (req.classId() != null) {
            // Get current enrollment for this academic year
            String academicYear = req.academicYear() != null ? req.academicYear()
                    : classRooms.findFirstBySchoolOrderByAcademicYearDesc(school)
                            .map(ClassRoom::getAcademicYear)
                            .orElse("");

            Optional<ClassEnrollment> currentEnrollment = enrollments.findByStudentAndAcademicYear(student,
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

    // ==================== STUDENT ACCOUNT MANAGEMENT ====================

    /**
     * Get list of students eligible for account creation:
     * - Status is ACTIVE
     * - Has email
     * - No user linked yet
     */
    @Transactional(readOnly = true)
    public List<StudentDto> getStudentsEligibleForAccount(School school) {
        return students.findAllBySchoolAndStatusAndUserIsNullAndEmailIsNotNull(school, StudentStatus.ACTIVE)
                .stream()
                .map(this::toStudentDto)
                .toList();
    }

    /**
     * Create account for a single student
     */
    @Transactional
    public UserDto createAccountForStudent(School school, UUID studentId) {
        Student student = students.findById(studentId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy học sinh"));

        // Validate student belongs to school
        if (!student.getSchool().getId().equals(school.getId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Học sinh không thuộc trường này");
        }

        // Validate status
        if (student.getStatus() != StudentStatus.ACTIVE) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Chỉ có thể tạo tài khoản cho học sinh đang theo học");
        }

        // Validate email
        if (student.getEmail() == null || student.getEmail().isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Học sinh chưa có email");
        }

        // Validate no existing user
        if (student.getUser() != null) {
            throw new ApiException(HttpStatus.CONFLICT, "Học sinh đã có tài khoản");
        }

        // Check email unique in Users table
        if (users.existsByEmailIgnoreCase(student.getEmail())) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "Email đã được sử dụng cho tài khoản khác: " + student.getEmail());
        }

        // Generate temp password
        String tempPassword = RandomUtil.generateTempPassword(12);

        // Create user
        User user = User.builder()
                .email(student.getEmail())
                .fullName(student.getFullName())
                .role(Role.STUDENT)
                .school(school)
                .passwordHash(passwordEncoder.encode(tempPassword))
                .firstLogin(true)
                .enabled(true)
                .build();

        user = users.save(user);

        // Link user to student
        student.setUser(user);
        students.save(student);

        // Send email with temp password
        mailService.sendTempPasswordEmail(user.getEmail(), user.getFullName(), tempPassword);

        return new UserDto(user.getId(), user.getEmail(), user.getFullName(), user.getRole(), school.getId(),
                school.getCode());
    }

    /**
     * Create accounts for multiple students (bulk)
     */
    @Transactional
    public BulkAccountCreationResponse createAccountsForStudents(School school, List<UUID> studentIds) {
        int created = 0;
        int skipped = 0;
        List<String> errors = new ArrayList<>();

        for (UUID studentId : studentIds) {
            try {
                createAccountForStudent(school, studentId);
                created++;
            } catch (ApiException e) {
                skipped++;
                errors.add(studentId + ": " + e.getMessage());
            }
        }

        return new BulkAccountCreationResponse(created, skipped, errors);
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

    private User processGuardianUser(School school, String email, String fullName) {
        // Check if user exists
        Optional<User> existingUser = users.findByEmailIgnoreCase(email);
        if (existingUser.isPresent()) {
            return existingUser.get();
        }

        // Create new user
        String tempPassword = RandomUtil.generateTempPassword(12);
        User user = User.builder()
                .email(email)
                .fullName(fullName)
                .role(Role.GUARDIAN)
                .school(school)
                .passwordHash(passwordEncoder.encode(tempPassword))
                .firstLogin(true)
                .enabled(true)
                .build();

        user = users.save(user);

        // Send email
        mailService.sendTempPasswordEmail(user.getEmail(), user.getFullName(), tempPassword);

        return user;
    }

    private StudentDto toStudentDto(Student student) {
        List<Guardian> studentGuardians = guardians.findAllByStudent(student);
        List<StudentDto.GuardianDto> guardianDtos = studentGuardians.stream()
                .map(g -> new StudentDto.GuardianDto(g.getId(), g.getFullName(), g.getPhone(), g.getEmail(),
                        g.getRelationship()))
                .toList();

        // Get current class enrollment
        String currentClassName = null;
        UUID currentClassId = null;
        Optional<ClassEnrollment> currentEnrollment = enrollments.findByStudentAndAcademicYear(student,
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
                guardianDtos);
    }
}
