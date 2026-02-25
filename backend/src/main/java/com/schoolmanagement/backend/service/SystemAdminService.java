package com.schoolmanagement.backend.service;

import com.schoolmanagement.backend.domain.Role;
import com.schoolmanagement.backend.domain.entity.School;
import com.schoolmanagement.backend.domain.entity.User;
import com.schoolmanagement.backend.dto.SchoolDetailDto;
import com.schoolmanagement.backend.dto.SchoolDto;
import com.schoolmanagement.backend.dto.UserDto;
import com.schoolmanagement.backend.dto.UserListDto;
import com.schoolmanagement.backend.dto.request.CreateSchoolRequest;
import com.schoolmanagement.backend.dto.request.UpdateSchoolRequest;
import com.schoolmanagement.backend.exception.ApiException;
import com.schoolmanagement.backend.repo.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.schoolmanagement.backend.util.RandomUtil;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
public class SystemAdminService {

    private final SchoolRepository schools;
    private final UserRepository users;
    private final PasswordEncoder passwordEncoder;
    private final MailService mailService;
    private final ActivityLogService activityLog;
    private final TeacherRepository teachers;
    private final StudentRepository students;
    private final ClassRoomRepository classRooms;
    private final LessonSlotRepository lessonSlots;
    private final TimetableRepository timetables;
    private final TeacherAssignmentRepository teacherAssignments;
    private final CombinationRepository combinations;
    private final AuthChallengeRepository authChallenges;
    private final GuardianRepository guardians;

    public SystemAdminService(SchoolRepository schools,
            UserRepository users, PasswordEncoder passwordEncoder, MailService mailService,
            ActivityLogService activityLog, TeacherRepository teachers, StudentRepository students,
            ClassRoomRepository classRooms, LessonSlotRepository lessonSlots,
            TimetableRepository timetables, TeacherAssignmentRepository teacherAssignments,
            CombinationRepository combinations, AuthChallengeRepository authChallenges,
            GuardianRepository guardians) {
        this.schools = schools;
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.mailService = mailService;
        this.activityLog = activityLog;
        this.teachers = teachers;
        this.students = students;
        this.classRooms = classRooms;
        this.lessonSlots = lessonSlots;
        this.timetables = timetables;
        this.teacherAssignments = teacherAssignments;
        this.combinations = combinations;
        this.authChallenges = authChallenges;
        this.guardians = guardians;
    }

    // ========== SCHOOL MANAGEMENT ==========

    public SchoolDto createSchool(CreateSchoolRequest req, User performedBy) {
        // Use the provided school code (manual entry per MOE requirement), nullable
        String schoolCode = req.schoolCode() != null ? req.schoolCode().trim() : null;
        if (schoolCode != null && schoolCode.isBlank()) {
            schoolCode = null;
        }

        if (schoolCode != null && schools.existsByCodeIgnoreCase(schoolCode)) {
            throw new ApiException(HttpStatus.CONFLICT, "Mã trường đã tồn tại.");
        }

        // Auto-prefix "THPT " to display name (since all schools are high school)
        String displayName = "THPT " + req.schoolName().trim();

        School school = School.builder()
                .name(displayName)
                .code(schoolCode)
                .provinceCode(req.provinceCode())
                .wardCode(req.wardCode())
                .schoolLevel(com.schoolmanagement.backend.domain.entity.SchoolLevel.HIGH_SCHOOL)
                .address(req.address())
                .enrollmentArea(req.enrollmentArea())
                .build();
        school = schools.save(school);

        activityLog.log("SCHOOL_CREATED", performedBy, null,
                "School: " + school.getName() + " (" + school.getCode() + ")");

        return toSchoolDto(school);
    }

    public List<SchoolDto> listSchools() {
        return schools.findAll().stream()
                .map(this::toSchoolDto)
                .toList();
    }

    public SchoolDetailDto getSchoolWithAdmins(UUID schoolId) {
        School school = schools.findById(schoolId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Trường không tồn tại."));

        List<UserListDto> admins = users.findBySchoolIdAndRole(schoolId, Role.SCHOOL_ADMIN).stream()
                .map(this::toUserListDto)
                .toList();

        return new SchoolDetailDto(
                school.getId(),
                school.getName(),
                school.getCode(),
                school.getProvinceCode(),
                school.getProvince() != null ? school.getProvince().getName() : null,
                school.getWardCode(),
                school.getWard() != null ? school.getWard().getName() : null,
                school.getEnrollmentArea(),
                school.getAddress(),
                admins,
                school.getPendingDeleteAt());
    }

    public SchoolDto updateSchool(UUID schoolId, UpdateSchoolRequest req, User performedBy) {
        School school = schools.findById(schoolId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Trường không tồn tại."));

        // Update name if provided
        if (req.name() != null && !req.name().isBlank()) {
            school.setName(req.name().trim());
        }

        // Update code if provided (check for uniqueness)
        if (req.code() != null && !req.code().isBlank()) {
            String newCode = req.code().trim();
            if (!newCode.equalsIgnoreCase(school.getCode()) && schools.existsByCodeIgnoreCase(newCode)) {
                throw new ApiException(HttpStatus.CONFLICT, "Mã trường đã tồn tại.");
            }
            school.setCode(newCode);
        }

        // Update provinceCode if provided
        if (req.provinceCode() != null) {
            school.setProvinceCode(req.provinceCode());
            // Reset wardCode if province changes (ward belongs to different province)
            if (!req.provinceCode().equals(school.getProvinceCode())) {
                school.setWardCode(null);
            }
        }

        // Update wardCode if provided
        if (req.wardCode() != null) {
            school.setWardCode(req.wardCode());
        }

        // Update enrollmentArea if provided
        if (req.enrollmentArea() != null) {
            school.setEnrollmentArea(req.enrollmentArea().isBlank() ? null : req.enrollmentArea().trim());
        }

        // Update address if provided
        if (req.address() != null) {
            school.setAddress(req.address().isBlank() ? null : req.address().trim());
        }

        school = schools.save(school);

        activityLog.log("SCHOOL_UPDATED", performedBy, null, "School ID: " + schoolId);

        return toSchoolDto(school);
    }

    @Transactional
    public void deleteSchool(UUID schoolId, User performedBy) {
        School school = schools.findById(schoolId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Trường không tồn tại."));

        if (school.getPendingDeleteAt() != null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Trường đã đang chờ xóa.");
        }

        school.setPendingDeleteAt(Instant.now());
        schools.save(school);

        activityLog.log("SCHOOL_PENDING_DELETE", performedBy, null,
                "School marked for deletion: " + school.getName() + " (" + school.getCode() + ")");
    }

    @Transactional
    public void restoreSchool(UUID schoolId, User performedBy) {
        School school = schools.findById(schoolId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Trường không tồn tại."));

        if (school.getPendingDeleteAt() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Trường không đang chờ xóa.");
        }

        school.setPendingDeleteAt(null);
        schools.save(school);

        activityLog.log("SCHOOL_RESTORED", performedBy, null,
                "School restored: " + school.getName() + " (" + school.getCode() + ")");
    }

    @Transactional
    public void permanentDeleteSchool(UUID schoolId, User performedBy) {
        School school = schools.findById(schoolId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Trường không tồn tại."));

        String schoolName = school.getName();
        String schoolCode = school.getCode();

        // 1. Delete teacher assignments first (references teachers, classrooms)
        teacherAssignments.deleteBySchoolId(schoolId);

        // 2. Delete timetables (references classrooms, lesson slots)
        timetables.deleteBySchoolId(schoolId);

        // 3. Delete combinations (references school)
        combinations.deleteBySchoolId(schoolId);

        // 4. Delete lesson slots (references school)
        lessonSlots.deleteBySchoolId(schoolId);

        // 5. Delete teachers (references school and users)
        teachers.deleteBySchoolId(schoolId);

        // 6. Delete guardians (references students via user_id)
        List<User> schoolUsers = users.findBySchoolId(schoolId);
        for (User u : schoolUsers) {
            guardians.deleteByUserId(u.getId());
        }

        // 7. Delete students (references school and users)
        students.deleteBySchoolId(schoolId);

        // 8. Delete classrooms (references school)
        classRooms.deleteBySchoolId(schoolId);

        // 9. Delete auth challenges for users
        for (User u : schoolUsers) {
            authChallenges.deleteByUserId(u.getId());
        }

        // 10. Delete all users belonging to this school
        if (!schoolUsers.isEmpty()) {
            users.deleteAll(schoolUsers);
            activityLog.log("USERS_DELETED_WITH_SCHOOL", performedBy, null,
                    schoolUsers.size() + " users deleted with school " + schoolCode);
        }

        // 11. Finally delete the school
        schools.delete(school);

        activityLog.log("SCHOOL_PERMANENT_DELETED", performedBy, null,
                "School permanently deleted: " + schoolName + " (" + schoolCode + ")");
    }

    private SchoolDto toSchoolDto(School s) {
        return new SchoolDto(
                s.getId(), s.getName(), s.getCode(),
                s.getProvinceCode(),
                s.getProvince() != null ? s.getProvince().getName() : null,
                s.getWardCode(),
                s.getWard() != null ? s.getWard().getName() : null,
                s.getSchoolLevel(),
                s.getAddress(),
                s.getEnrollmentArea(),
                s.getPendingDeleteAt());
    }

    // ========== USER MANAGEMENT ==========

    public UserDto createSchoolAdmin(UUID schoolId, String email, String fullName, User performedBy) {
        School school = schools.findById(schoolId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Trường không tồn tại."));
        if (users.existsByEmailIgnoreCase(email)) {
            throw new ApiException(HttpStatus.CONFLICT, "Email đã tồn tại.");
        }

        String tempPassword = RandomUtil.generateTempPassword(12);

        User user = User.builder()
                .email(email)
                .fullName(fullName)
                .role(Role.SCHOOL_ADMIN)
                .school(school)
                .passwordHash(passwordEncoder.encode(tempPassword))
                .firstLogin(true)
                .enabled(true)
                .build();

        user = users.save(user);
        mailService.sendTempPasswordEmail(user.getEmail(), user.getFullName(), tempPassword);

        activityLog.log("USER_CREATED", performedBy, user.getId(),
                "SCHOOL_ADMIN created: " + email + " for school " + school.getCode());

        return new UserDto(user.getId(), user.getEmail(), user.getFullName(), user.getRole(), school.getId(),
                school.getCode(), user.isEnabled());
    }

    public List<UserListDto> listUsers(Role role, UUID schoolId, Boolean enabled, boolean pendingDelete) {
        return users.findWithFilters(role, schoolId, enabled, pendingDelete).stream()
                .map(this::toUserListDto)
                .toList();
    }

    public List<UserListDto> listPendingDeleteUsers() {
        return users.findByPendingDeleteAtIsNotNull().stream()
                .map(this::toUserListDto)
                .toList();
    }

    @Transactional
    public void enableUser(UUID userId, User performedBy) {
        User user = findUserOrThrow(userId);
        if (user.getPendingDeleteAt() != null) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "Không thể kích hoạt tài khoản đang chờ xóa. Vui lòng khôi phục trước.");
        }
        user.setEnabled(true);
        users.save(user);
        activityLog.log("USER_ENABLED", performedBy, userId, "User enabled: " + user.getEmail());
    }

    @Transactional
    public void disableUser(UUID userId, User performedBy) {
        User user = findUserOrThrow(userId);
        if (user.getRole() == Role.SYSTEM_ADMIN) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Không thể vô hiệu hoá SYSTEM_ADMIN.");
        }
        user.setEnabled(false);
        users.save(user);
        activityLog.log("USER_DISABLED", performedBy, userId, "User disabled: " + user.getEmail());
    }

    @Transactional
    public void markPendingDelete(UUID userId, User performedBy) {
        User user = findUserOrThrow(userId);
        if (user.getRole() == Role.SYSTEM_ADMIN) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Không thể xóa SYSTEM_ADMIN.");
        }
        if (user.getPendingDeleteAt() != null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Tài khoản đã đang chờ xóa.");
        }

        // Store current enabled state before marking for delete
        user.setWasEnabledBeforePendingDelete(user.isEnabled());
        user.setPendingDeleteAt(Instant.now());
        user.setEnabled(false);
        users.save(user);

        activityLog.log("USER_PENDING_DELETE", performedBy, userId, "User marked for deletion: " + user.getEmail());
    }

    @Transactional
    public void restoreUser(UUID userId, User performedBy) {
        User user = findUserOrThrow(userId);
        if (user.getPendingDeleteAt() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Tài khoản không đang chờ xóa.");
        }

        // Restore previous enabled state
        boolean wasEnabled = user.getWasEnabledBeforePendingDelete() != null
                ? user.getWasEnabledBeforePendingDelete()
                : true;

        user.setPendingDeleteAt(null);
        user.setWasEnabledBeforePendingDelete(null);
        user.setEnabled(wasEnabled);
        users.save(user);

        activityLog.log("USER_RESTORED", performedBy, userId, "User restored: " + user.getEmail());
    }

    @Transactional
    public void permanentDeleteUser(UUID userId, User performedBy) {
        User user = findUserOrThrow(userId);
        if (user.getRole() == Role.SYSTEM_ADMIN) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Không thể xóa SYSTEM_ADMIN.");
        }

        String email = user.getEmail();
        users.delete(user);

        activityLog.log("USER_PERMANENT_DELETED", performedBy, userId, "User permanently deleted: " + email);
    }

    // ========== HELPERS ==========

    private User findUserOrThrow(UUID userId) {
        return users.findById(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Tài khoản không tồn tại."));
    }

    private UserListDto toUserListDto(User user) {
        return new UserListDto(
                user.getId(),
                user.getEmail(),
                user.getFullName(),
                user.getRole(),
                user.getSchool() != null ? user.getSchool().getId() : null,
                user.getSchool() != null ? user.getSchool().getCode() : null,
                user.getSchool() != null ? user.getSchool().getName() : null,
                user.isEnabled(),
                user.getPendingDeleteAt());
    }
}
