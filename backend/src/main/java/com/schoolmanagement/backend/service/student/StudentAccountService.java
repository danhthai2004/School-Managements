package com.schoolmanagement.backend.service.student;

import com.schoolmanagement.backend.domain.entity.student.Guardian;
import com.schoolmanagement.backend.domain.entity.classes.ClassEnrollment;

import com.schoolmanagement.backend.service.notification.MailService;
import com.schoolmanagement.backend.domain.entity.admin.School;
import com.schoolmanagement.backend.domain.entity.auth.User;
import com.schoolmanagement.backend.domain.entity.student.Student;
import com.schoolmanagement.backend.domain.entity.admin.AcademicYear;
import com.schoolmanagement.backend.service.admin.SemesterService;

import com.schoolmanagement.backend.domain.auth.Role;
import com.schoolmanagement.backend.domain.student.StudentStatus;

import com.schoolmanagement.backend.dto.admin.BulkAccountCreationResponse;
import com.schoolmanagement.backend.dto.student.GuardianDto;
import com.schoolmanagement.backend.dto.student.StudentDto;
import com.schoolmanagement.backend.dto.student.StudentGuardianDto;
import com.schoolmanagement.backend.dto.auth.UserDto;
import com.schoolmanagement.backend.exception.ApiException;
import com.schoolmanagement.backend.repo.classes.ClassEnrollmentRepository;
import com.schoolmanagement.backend.repo.student.GuardianRepository;
import com.schoolmanagement.backend.repo.student.StudentRepository;
import com.schoolmanagement.backend.repo.auth.UserRepository;
import com.schoolmanagement.backend.util.RandomUtil;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import com.schoolmanagement.backend.repo.auth.AuthChallengeRepository;

/**
 * Handles account creation for students and guardians.
 * Extracted from StudentManagementService for single responsibility.
 */
@Slf4j
@Service
public class StudentAccountService {

    private final StudentRepository students;
    private final GuardianRepository guardians;
    private final ClassEnrollmentRepository enrollments;
    private final UserRepository users;
    private final PasswordEncoder passwordEncoder;
    private final MailService mailService;
    private final AuthChallengeRepository authChallenges;
    private final SemesterService semesterService;

    @org.springframework.beans.factory.annotation.Autowired
    @org.springframework.context.annotation.Lazy
    private StudentAccountService self;

    public StudentAccountService(StudentRepository students, GuardianRepository guardians,
            ClassEnrollmentRepository enrollments,
            UserRepository users, PasswordEncoder passwordEncoder, MailService mailService,
            AuthChallengeRepository authChallenges, SemesterService semesterService) {
        this.students = students;
        this.guardians = guardians;
        this.enrollments = enrollments;
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.mailService = mailService;
        this.authChallenges = authChallenges;
        this.semesterService = semesterService;
    }

    // ==================== STUDENT ACCOUNT MANAGEMENT ====================

    /**
     * Get list of students eligible for account creation:
     * - Status is ACTIVE
     * - Has email
     * - No user linked yet
     */
    @Transactional(readOnly = true)
    public Page<StudentDto> getStudentsEligibleForAccount(School school, Pageable pageable) {
        return students.findAllBySchoolAndStatusAndUserIsNullAndEmailIsNotNull(school, StudentStatus.ACTIVE, pageable)
                .map(this::toStudentDto);
    }

    /**
     * Create account for a single student
     */
    @Transactional(propagation = org.springframework.transaction.annotation.Propagation.REQUIRES_NEW)
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
                .email(student.getEmail().trim().toLowerCase())
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
                school.getCode(), user.isEnabled());
    }

    /**
     * Delete/Unlink account for a student
     */
    @Transactional
    public void deleteAccountForStudent(School school, UUID studentId) {
        Student student = students.findById(studentId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy học sinh"));

        if (!student.getSchool().getId().equals(school.getId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Học sinh không thuộc trường này");
        }

        User user = student.getUser();
        if (user == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Học sinh chưa có tài khoản");
        }

        // Unlink user from student first
        student.setUser(null);
        students.save(student);

        // Unlink from guardian if referenced (to resolve FK constraint)
        Optional<Guardian> linkedGuardian = guardians.findByUser(user);
        if (linkedGuardian.isPresent()) {
            Guardian g = linkedGuardian.get();
            g.setUser(null);
            guardians.save(g);
        }

        // Delete user
        authChallenges.deleteByUser(user);
        users.delete(user);
    }

    /**
     * Create accounts for multiple students (bulk)
     */
    // @Transactional - Removed to allow partial success
    public BulkAccountCreationResponse createAccountsForStudents(School school, List<UUID> studentIds) {
        int created = 0;
        int skipped = 0;
        List<String> errors = new ArrayList<>();

        for (UUID studentId : studentIds) {
            try {
                self.createAccountForStudent(school, studentId);
                created++;
            } catch (ApiException e) {
                skipped++;
                errors.add(studentId + ": " + e.getMessage());
            }
        }

        return new BulkAccountCreationResponse(created, skipped, errors);
    }

    // ==================== GUARDIAN ACCOUNT MANAGEMENT ====================

    @Transactional(readOnly = true)
    public Page<GuardianDto> getGuardiansEligibleForAccount(School school, Pageable pageable) {
        AcademicYear currentAcademicYear = semesterService.getActiveAcademicYear(school);

        return guardians.findGuardiansWithoutAccount(school, pageable)
                .map(g -> {
                    // Try to find one student for this guardian to display info
                    // We pick the first one for simplicity in the list view (Many-to-One Refactor)
                    // Updated to use g.getStudents() instead of studentGuardianRepo
                    List<Student> students = g.getStudents();
                    String studentName = students.isEmpty() ? "N/A" : students.get(0).getFullName();
                    // Relationship is no longer stored in link table. Hardcode or generic?
                    // In Many-to-One, guardian is parent.
                    String relationship = g.getRelationship();

                    Student student = students.isEmpty() ? null : students.get(0);
                    String className = "N/A";

                    if (student != null) {
                        className = enrollments
                                .findTopByStudentAndAcademicYearOrderByEnrolledAtDesc(student, currentAcademicYear)
                                .map(e -> e.getClassRoom().getName())
                                .orElse("N/A");
                    }

                    return new GuardianDto(
                            g.getId(),
                            g.getFullName(),
                            g.getEmail(),
                            g.getPhone(),
                            relationship,
                            studentName,
                            className);
                });
    }

    // @Transactional - Removed
    public BulkAccountCreationResponse createAccountsForGuardians(School school, List<UUID> guardianIds) {
        int created = 0;
        int linked = 0;
        int skipped = 0;
        List<String> errors = new ArrayList<>();

        for (UUID id : guardianIds) {
            try {
                int result = self.createAccountForGuardian(school, id);
                if (result == 1)
                    created++;
                else if (result == 2)
                    linked++;
                else
                    skipped++; // Should not happen if exception thrown for errors
            } catch (ApiException e) {
                skipped++;
                errors.add(id + ": " + e.getMessage());
            } catch (Exception e) {
                skipped++;
                errors.add("ID " + id + ": " + e.getMessage());
                log.error("Failed to process guardian {}", id, e);
            }
        }

        return new BulkAccountCreationResponse(created + linked, skipped, errors);

    }

    @Transactional(propagation = org.springframework.transaction.annotation.Propagation.REQUIRES_NEW)
    public int createAccountForGuardian(School school, UUID id) {
        Guardian guardian = guardians.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy phụ huynh"));

        // Verify guardian belongs to school (indirectly via students)
        // We check if ANY of the students belong to this school
        boolean belongsToSchool = guardian.getStudents().stream()
                .anyMatch(s -> s.getSchool().getId().equals(school.getId()));

        if (!belongsToSchool) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Phụ huynh không thuộc trường này");
        }

        if (guardian.getUser() != null) {
            throw new ApiException(HttpStatus.CONFLICT, "Phụ huynh đã có tài khoản");
        }

        if (guardian.getEmail() == null || guardian.getEmail().isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, guardian.getFullName() + ": Không có email");
        }

        boolean isNewUser = !users.existsByEmailIgnoreCase(guardian.getEmail());
        User user = processGuardianUser(school, guardian.getEmail().trim().toLowerCase(),
                guardian.getFullName());
        guardian.setUser(user);
        guardians.saveAndFlush(guardian);

        return isNewUser ? 1 : 2; // 1=Created, 2=Linked
    }

    // ==================== PRIVATE HELPERS ====================

    private User processGuardianUser(School school, String email, String fullName) {
        // Check if user exists
        Optional<User> existingUser = users.findByEmailIgnoreCase(email);
        if (existingUser.isPresent()) {
            User user = existingUser.get();
            // Only allow linking if the existing user is also a GUARDIAN
            if (user.getRole() != Role.GUARDIAN) {
                throw new ApiException(HttpStatus.CONFLICT,
                        "Email đã được sử dụng cho tài khoản " + user.getRole()
                                + ". Không thể liên kết làm Phụ huynh.");
            }
            return user;
        }

        // Create new user
        String tempPassword = RandomUtil.generateTempPassword(12);
        User user = User.builder()
                .email(email.trim().toLowerCase())
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
        StudentGuardianDto guardianDto = null;
        if (student.getGuardian() != null) {
            guardianDto = new StudentGuardianDto(
                    student.getGuardian().getId(),
                    student.getGuardian().getFullName(),
                    student.getGuardian().getPhone(),
                    student.getGuardian().getEmail(),
                    student.getGuardian().getRelationship());
        }

        // Get current class enrollment
        String currentClassName = null;
        UUID currentClassId = null;
        AcademicYear currentYear = semesterService.getActiveAcademicYear(student.getSchool());

        Optional<ClassEnrollment> currentEnrollment = enrollments.findTopByStudentAndAcademicYearOrderByEnrolledAtDesc(
                student,
                currentYear);
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
}
