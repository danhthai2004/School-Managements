package com.schoolmanagement.backend.service;

import com.schoolmanagement.backend.domain.Role;
import com.schoolmanagement.backend.domain.StudentStatus;
import com.schoolmanagement.backend.domain.entity.*;
import com.schoolmanagement.backend.dto.BulkAccountCreationResponse;
import com.schoolmanagement.backend.dto.GuardianDto;
import com.schoolmanagement.backend.dto.StudentDto;
import com.schoolmanagement.backend.dto.StudentGuardianDto;
import com.schoolmanagement.backend.dto.UserDto;
import com.schoolmanagement.backend.exception.ApiException;
import com.schoolmanagement.backend.repo.ClassEnrollmentRepository;
import com.schoolmanagement.backend.repo.ClassRoomRepository;
import com.schoolmanagement.backend.repo.GuardianRepository;
import com.schoolmanagement.backend.repo.StudentRepository;
import com.schoolmanagement.backend.repo.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Handles account creation for students and guardians.
 * Extracted from StudentManagementService for single responsibility.
 */
@Slf4j
@Service
public class StudentAccountService {

    private final StudentRepository students;
    private final GuardianRepository guardians;
    private final ClassRoomRepository classRooms;
    private final ClassEnrollmentRepository enrollments;
    private final UserRepository users;
    private final PasswordEncoder passwordEncoder;
    private final MailService mailService;

    public StudentAccountService(StudentRepository students, GuardianRepository guardians,
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
                school.getCode(), user.isEnabled());
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

    // ==================== GUARDIAN ACCOUNT MANAGEMENT ====================

    @Transactional(readOnly = true)
    public List<GuardianDto> getGuardiansEligibleForAccount(School school) {
        String currentAcademicYear = classRooms.findFirstBySchoolOrderByAcademicYearDesc(school)
                .map(ClassRoom::getAcademicYear).orElse("");

        return guardians.findOrphanGuardians(school).stream()
                .map(g -> {
                    String className = enrollments
                            .findTopByStudentAndAcademicYearOrderByEnrolledAtDesc(g.getStudent(), currentAcademicYear)
                            .map(e -> e.getClassRoom().getName())
                            .orElse("N/A");

                    return new GuardianDto(
                            g.getId(),
                            g.getFullName(),
                            g.getEmail(),
                            g.getPhone(),
                            g.getRelationship(),
                            g.getStudent().getFullName(),
                            className);
                })
                .toList();
    }

    @Transactional
    public BulkAccountCreationResponse createAccountsForGuardians(School school, List<UUID> guardianIds) {
        int created = 0;
        int linked = 0;
        int skipped = 0;
        List<String> errors = new ArrayList<>();

        for (UUID id : guardianIds) {
            try {
                Guardian guardian = guardians.findById(id)
                        .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy phụ huynh"));

                if (!guardian.getStudent().getSchool().getId().equals(school.getId())) {
                    throw new ApiException(HttpStatus.FORBIDDEN, "Phụ huynh không thuộc trường này");
                }

                if (guardian.getUser() != null) {
                    skipped++; // Already processed
                    continue;
                }

                if (guardian.getEmail() == null || guardian.getEmail().isBlank()) {
                    skipped++;
                    errors.add(guardian.getFullName() + ": Không có email");
                    continue;
                }

                boolean isNewUser = !users.existsByEmailIgnoreCase(guardian.getEmail());
                User user = processGuardianUser(school, guardian.getEmail(), guardian.getFullName());
                guardian.setUser(user);
                guardians.save(guardian);

                if (isNewUser) {
                    created++;
                } else {
                    linked++;
                }
            } catch (Exception e) {
                skipped++;
                errors.add("ID " + id + ": " + e.getMessage());
                log.error("Failed to process guardian {}", id, e);
            }
        }

        return new BulkAccountCreationResponse(created + linked, skipped, errors);
    }

    // ==================== PRIVATE HELPERS ====================

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
        List<StudentGuardianDto> guardianDtos = studentGuardians.stream()
                .map(g -> new StudentGuardianDto(g.getId(), g.getFullName(), g.getPhone(), g.getEmail(),
                        g.getRelationship()))
                .toList();

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
                guardianDtos);
    }
}
