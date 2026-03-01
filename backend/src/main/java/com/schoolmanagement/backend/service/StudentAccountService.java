package com.schoolmanagement.backend.service;

import com.schoolmanagement.backend.domain.Role;
import com.schoolmanagement.backend.domain.StudentStatus;
import com.schoolmanagement.backend.domain.entity.*;
import com.schoolmanagement.backend.dto.BulkAccountCreationResponse;
import com.schoolmanagement.backend.dto.GuardianDto;
import com.schoolmanagement.backend.dto.StudentDto;
import com.schoolmanagement.backend.dto.UserDto;
import com.schoolmanagement.backend.exception.ApiException;
import com.schoolmanagement.backend.repo.ClassEnrollmentRepository;
import com.schoolmanagement.backend.repo.ClassRoomRepository;
import com.schoolmanagement.backend.repo.GuardianRepository;
import com.schoolmanagement.backend.repo.StudentRepository;
import com.schoolmanagement.backend.repo.UserRepository;
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
import com.schoolmanagement.backend.repo.AuthChallengeRepository;

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
    private final AuthChallengeRepository authChallenges;

    @org.springframework.beans.factory.annotation.Autowired
    @org.springframework.context.annotation.Lazy
    private StudentAccountService self;

    public StudentAccountService(StudentRepository students, GuardianRepository guardians,
            ClassRoomRepository classRooms, ClassEnrollmentRepository enrollments,
            UserRepository users, PasswordEncoder passwordEncoder, MailService mailService,
            AuthChallengeRepository authChallenges) {
        this.students = students;
        this.guardians = guardians;
        this.classRooms = classRooms;
        this.enrollments = enrollments;
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.mailService = mailService;
        this.authChallenges = authChallenges;
    }

    // ==================== STUDENT ACCOUNT MANAGEMENT ====================

    @Transactional(readOnly = true)
    public List<StudentDto> getStudentsEligibleForAccount(School school) {
        return students.findAllBySchoolAndStatusAndUserIsNullAndEmailIsNotNull(school, StudentStatus.ACTIVE)
                .stream()
                .map(this::toStudentDto)
                .toList();
    }

    @Transactional(propagation = org.springframework.transaction.annotation.Propagation.REQUIRES_NEW)
    public UserDto createAccountForStudent(School school, UUID studentId) {
        Student student = students.findById(studentId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy học sinh"));

        if (!student.getSchool().getId().equals(school.getId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Học sinh không thuộc trường này");
        }
        if (student.getStatus() != StudentStatus.ACTIVE) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Chỉ có thể tạo tài khoản cho học sinh đang theo học");
        }
        if (student.getEmail() == null || student.getEmail().isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Học sinh chưa có email");
        }
        if (student.getUser() != null) {
            throw new ApiException(HttpStatus.CONFLICT, "Học sinh đã có tài khoản");
        }
        if (users.existsByEmailIgnoreCase(student.getEmail())) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "Email đã được sử dụng cho tài khoản khác: " + student.getEmail());
        }

        String tempPassword = RandomUtil.generateTempPassword(12);
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
        student.setUser(user);
        students.save(student);

        mailService.sendTempPasswordEmail(user.getEmail(), user.getFullName(), tempPassword);

        return new UserDto(user.getId(), user.getEmail(), user.getFullName(), user.getRole(), school.getId(),
                school.getCode());
    }

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

        student.setUser(null);
        students.save(student);

        List<Guardian> linkedGuardians = guardians.findAllByUserId(user.getId());
        for (Guardian g : linkedGuardians) {
            g.setUser(null);
            guardians.save(g);
        }

        authChallenges.deleteByUserId(user.getId());
        users.delete(user);
    }

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
    public List<GuardianDto> getGuardiansEligibleForAccount(School school) {
        String currentAcademicYear = classRooms.findFirstBySchoolOrderByAcademicYearDesc(school)
                .map(ClassRoom::getAcademicYear).orElse("");

        return guardians.findGuardiansWithoutAccount(school).stream()
                .map(g -> {
                    // Guardian has ManyToOne student → each row is one student
                    Student student = g.getStudent();
                    String studentName = student != null ? student.getFullName() : "N/A";
                    String relationship = g.getRelationship() != null ? g.getRelationship() : "Phụ huynh";

                    String className = "N/A";
                    if (student != null) {
                        className = enrollments
                                .findByStudentAndAcademicYear(student, currentAcademicYear)
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
                })
                .toList();
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
                    skipped++;
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

        // Verify guardian belongs to school via linked student
        Student student = guardian.getStudent();
        if (student == null || !student.getSchool().getId().equals(school.getId())) {
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
        Optional<User> existingUser = users.findByEmailIgnoreCase(email);
        if (existingUser.isPresent()) {
            User user = existingUser.get();
            if (user.getRole() != Role.GUARDIAN) {
                throw new ApiException(HttpStatus.CONFLICT,
                        "Email đã được sử dụng cho tài khoản " + user.getRole()
                                + ". Không thể liên kết làm Phụ huynh.");
            }
            return user;
        }

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
        mailService.sendTempPasswordEmail(user.getEmail(), user.getFullName(), tempPassword);
        return user;
    }

    private StudentDto toStudentDto(Student student) {
        // Get guardians for this student
        List<Guardian> studentGuardians = guardians.findAllByStudent(student);
        List<StudentDto.GuardianDto> guardianDtos = studentGuardians.stream()
                .map(g -> new StudentDto.GuardianDto(g.getId(), g.getFullName(), g.getPhone(), g.getEmail(),
                        g.getRelationship()))
                .toList();

        // Get current class enrollment
        String currentClassName = null;
        UUID currentClassId = null;
        Optional<ClassEnrollment> currentEnrollment = enrollments.findByStudentAndAcademicYear(
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
                guardianDtos);
    }
}
