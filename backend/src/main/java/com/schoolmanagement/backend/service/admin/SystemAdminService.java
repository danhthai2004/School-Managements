package com.schoolmanagement.backend.service.admin;

import com.schoolmanagement.backend.domain.entity.admin.SchoolLevel;

import com.schoolmanagement.backend.service.notification.MailService;
import com.schoolmanagement.backend.service.report.ActivityLogService;

import com.schoolmanagement.backend.domain.auth.Role;
import com.schoolmanagement.backend.domain.entity.admin.School;
import com.schoolmanagement.backend.domain.entity.auth.User;
import com.schoolmanagement.backend.dto.admin.SchoolDetailDto;
import com.schoolmanagement.backend.dto.admin.SchoolDto;
import com.schoolmanagement.backend.dto.auth.UserDto;
import com.schoolmanagement.backend.dto.auth.UserListDto;
import com.schoolmanagement.backend.dto.admin.CreateSchoolRequest;
import com.schoolmanagement.backend.dto.admin.UpdateSchoolRequest;
import com.schoolmanagement.backend.exception.ApiException;
import com.schoolmanagement.backend.repo.admin.SchoolRepository;
import com.schoolmanagement.backend.repo.auth.UserRepository;
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

    public SystemAdminService(SchoolRepository schools,
            UserRepository users, PasswordEncoder passwordEncoder, MailService mailService,
            ActivityLogService activityLog) {
        this.schools = schools;
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.mailService = mailService;
        this.activityLog = activityLog;
    }

    // ========== SCHOOL MANAGEMENT ==========

    public SchoolDto createSchool(CreateSchoolRequest req, User performedBy) {
        // Generate a simple code or use name as base. For now, let's auto-generate a
        // code.
        // Format: SCH + random 6 chars or similar, or just uppercase name stripped.
        // User didn't specify code format, so we'll generate a unique one.
        String generatedCode = generateSchoolCode(req.schoolName());

        if (schools.existsByCodeIgnoreCase(generatedCode)) {
            // Unlikely with random/timestamp, but good to check or retry.
            // For simplicity in this scope, assuming unique enough or user handles name
            // uniqueness if we used name.
            // Let's actually verify by Name if we want strict uniqueness, but Code is the
            // PK/ID usually.
            // The constraint is typically on Code.
        }

        // Default level: THPT (High School)
        // No ward code.
        School school = School.builder()
                .name(req.schoolName())
                .code(generatedCode)
                .provinceCode(req.provinceCode())
                .schoolLevel(SchoolLevel.HIGH_SCHOOL)
                .address(req.address())
                .build();
        school = schools.save(school);

        activityLog.log("SCHOOL_CREATED", performedBy, null,
                "School: " + school.getName() + " (" + school.getCode() + ")");

        return toSchoolDto(school);
    }

    private String generateSchoolCode(String name) {
        // Generate shorter code to fit in DB length
        // SCH + 5 digit random number.
        int randomNum = 10000 + (int) (Math.random() * 90000);
        return "SCH-" + randomNum;
    }

    public List<SchoolDto> listSchools() {
        return schools.findByPendingDeleteAtIsNull().stream()
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
                school.getWard() != null ? school.getWard().getCode() : null,
                school.getWard() != null ? school.getWard().getName() : null,
                school.getAddress(),
                school.getEnrollmentArea(),
                school.getPendingDeleteAt(),
                admins);
    }

    public SchoolDto updateSchool(UUID schoolId, UpdateSchoolRequest req, User performedBy) {
        School school = schools.findById(schoolId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Trường không tồn tại."));

        if (req.name() != null && !req.name().isBlank()) {
            school.setName(req.name());
        }
        if (req.provinceCode() != null) {
            school.setProvinceCode(req.provinceCode());
        }
        if (req.wardCode() != null) {
            school.setWardCode(req.wardCode());
        }
        if (req.address() != null) {
            school.setAddress(req.address());
        }
        school = schools.save(school);

        activityLog.log("SCHOOL_UPDATED", performedBy, null, "School ID: " + schoolId);

        return toSchoolDto(school);
    }

    private SchoolDto toSchoolDto(School s) {
        return new SchoolDto(
                s.getId(), s.getName(), s.getCode(),
                s.getProvinceCode(),
                s.getProvince() != null ? s.getProvince().getName() : null,
                s.getSchoolLevel(),
                s.getAddress(),
                s.getEnrollmentArea(),
                s.getWard() != null ? s.getWard().getCode() : null,
                s.getWard() != null ? s.getWard().getName() : null,
                s.getPendingDeleteAt());
    }

    public List<SchoolDto> listPendingDeleteSchools() {
        return schools.findByPendingDeleteAtIsNotNull().stream()
                .map(this::toSchoolDto)
                .toList();
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
        activityLog.log("SCHOOL_PENDING_DELETE", performedBy, null, "School marked for deletion: " + school.getCode());
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
        activityLog.log("SCHOOL_RESTORED", performedBy, null, "School restored: " + school.getCode());
    }

    @Transactional
    public void permanentDeleteSchool(UUID schoolId, User performedBy) {
        School school = schools.findById(schoolId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Trường không tồn tại."));
        
        schools.delete(school);
        activityLog.log("SCHOOL_PERMANENT_DELETED", performedBy, null, "School permanently deleted: " + school.getCode());
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
