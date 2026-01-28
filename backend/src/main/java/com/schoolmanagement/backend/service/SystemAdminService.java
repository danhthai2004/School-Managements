package com.schoolmanagement.backend.service;

import com.schoolmanagement.backend.domain.Role;
import com.schoolmanagement.backend.domain.entity.School;
import com.schoolmanagement.backend.domain.entity.SchoolRegistry;
import com.schoolmanagement.backend.domain.entity.User;
import com.schoolmanagement.backend.dto.SchoolDetailDto;
import com.schoolmanagement.backend.dto.SchoolDto;
import com.schoolmanagement.backend.dto.UserDto;
import com.schoolmanagement.backend.dto.UserListDto;
import com.schoolmanagement.backend.dto.request.CreateSchoolRequest;
import com.schoolmanagement.backend.dto.request.UpdateSchoolRequest;
import com.schoolmanagement.backend.exception.ApiException;
import com.schoolmanagement.backend.repo.SchoolRegistryRepository;
import com.schoolmanagement.backend.repo.SchoolRepository;
import com.schoolmanagement.backend.repo.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
public class SystemAdminService {

    private final SchoolRepository schools;
    private final SchoolRegistryRepository schoolRegistry;
    private final UserRepository users;
    private final PasswordEncoder passwordEncoder;
    private final MailService mailService;
    private final ActivityLogService activityLog;

    public SystemAdminService(SchoolRepository schools, SchoolRegistryRepository schoolRegistry,
            UserRepository users, PasswordEncoder passwordEncoder, MailService mailService,
            ActivityLogService activityLog) {
        this.schools = schools;
        this.schoolRegistry = schoolRegistry;
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.mailService = mailService;
        this.activityLog = activityLog;
    }

    // ========== SCHOOL MANAGEMENT ==========

    public SchoolDto createSchool(CreateSchoolRequest req, User performedBy) {
        SchoolRegistry registry = schoolRegistry.findById(req.registryCode())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Mã trường không tồn tại trong danh mục."));

        if (schools.existsByCodeIgnoreCase(req.registryCode())) {
            throw new ApiException(HttpStatus.CONFLICT, "Trường đã được thêm vào hệ thống.");
        }

        School school = School.builder()
                .name(registry.getName())
                .code(registry.getCode())
                .provinceCode(req.provinceCode())
                .wardCode(req.wardCode())
                .schoolLevel(registry.getSchoolLevel())
                .address(req.address())
                .enrollmentArea(registry.getEnrollmentArea())
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

        return new SchoolDetailDto(school.getId(), school.getName(), school.getCode(), admins);
    }

    public SchoolDto updateSchool(UUID schoolId, UpdateSchoolRequest req, User performedBy) {
        School school = schools.findById(schoolId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Trường không tồn tại."));

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
                s.getWardCode(),
                s.getWard() != null ? s.getWard().getName() : null,
                s.getSchoolLevel(),
                s.getAddress(),
                s.getEnrollmentArea());
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
                school.getCode());
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
