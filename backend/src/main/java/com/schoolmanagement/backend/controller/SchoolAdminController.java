package com.schoolmanagement.backend.controller;

import com.schoolmanagement.backend.domain.Role;
import com.schoolmanagement.backend.dto.BulkImportResponse;
import com.schoolmanagement.backend.dto.SchoolStatsDto;
import com.schoolmanagement.backend.dto.UserDto;
import com.schoolmanagement.backend.dto.UserListDto;
import com.schoolmanagement.backend.dto.request.CreateUserRequest;
import com.schoolmanagement.backend.exception.ApiException;
import com.schoolmanagement.backend.security.UserPrincipal;
import com.schoolmanagement.backend.service.SchoolAdminService;
import com.schoolmanagement.backend.service.UserLookupService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

/**
 * Handles school-level admin endpoints that are NOT handled by the dedicated
 * controllers (ClassController, StudentController, TeacherController,
 * AccountController, CurriculumController).
 *
 * Specifically: statistics, user management, and user lifecycle management.
 */
@RestController
@RequestMapping("/api/school")
@Transactional(readOnly = true)
@lombok.extern.slf4j.Slf4j
public class SchoolAdminController {

    private final SchoolAdminService schoolAdminService;
    private final UserLookupService userLookup;

    public SchoolAdminController(SchoolAdminService schoolAdminService,
            UserLookupService userLookup) {
        this.schoolAdminService = schoolAdminService;
        this.userLookup = userLookup;
    }

    // ==================== STATISTICS ====================

    @GetMapping("/stats")
    public SchoolStatsDto getStats(@AuthenticationPrincipal UserPrincipal principal) {
        var admin = userLookup.requireById(principal.getId());
        if (admin.getSchool() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "School admin chưa được gán trường.");
        }
        return schoolAdminService.getSchoolStats(admin.getSchool());
    }

    // ==================== USER MANAGEMENT ====================

    @Transactional
    @PostMapping("/users")
    public UserDto createUser(@AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody CreateUserRequest req) {

        var admin = userLookup.requireById(principal.getId());
        if (admin.getSchool() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "School admin chưa được gán trường.");
        }

        Role role = req.role();
        if (role == null || role == Role.SCHOOL_ADMIN || role == Role.SYSTEM_ADMIN) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Role không hợp lệ.");
        }

        return schoolAdminService.createUserForSchool(admin.getSchool(), req.email(), req.fullName(), role);
    }

    @GetMapping("/users")
    public List<UserDto> listUsers(@AuthenticationPrincipal UserPrincipal principal) {
        var admin = userLookup.requireById(principal.getId());
        if (admin.getSchool() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "School admin chưa được gán trường.");
        }
        return schoolAdminService.listUsersInSchool(admin.getSchool());
    }

    @GetMapping("/teachers")
    public List<UserDto> listTeachers(@AuthenticationPrincipal UserPrincipal principal) {
        var admin = userLookup.requireById(principal.getId());
        if (admin.getSchool() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "School admin chưa được gán trường.");
        }
        return schoolAdminService.listTeachersInSchool(admin.getSchool());
    }

    /**
     * CSV header: email, fullName (optional), role (optional)
     */
    @Transactional
    @PostMapping("/users/import")
    public BulkImportResponse importUsers(@AuthenticationPrincipal UserPrincipal principal,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "defaultRole", required = false, defaultValue = "STUDENT") String defaultRole) {
        var admin = userLookup.requireById(principal.getId());
        if (admin.getSchool() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "School admin chưa được gán trường.");
        }
        Role role;
        try {
            role = Role.valueOf(defaultRole.trim().toUpperCase());
        } catch (Exception e) {
            role = Role.STUDENT;
        }
        if (role == Role.SCHOOL_ADMIN || role == Role.SYSTEM_ADMIN) {
            role = Role.STUDENT;
        }
        return schoolAdminService.importCsv(admin.getSchool(), file, role);
    }

    // ==================== USER LIFECYCLE MANAGEMENT ====================

    @GetMapping("/users/manage")
    public List<UserListDto> listUsersWithStatus(
            @AuthenticationPrincipal UserPrincipal principal) {
        var admin = userLookup.requireById(principal.getId());
        if (admin.getSchool() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "School admin chưa được gán trường.");
        }
        return schoolAdminService.listUsersWithStatus(admin.getSchool());
    }

    @GetMapping("/users/pending")
    public List<UserListDto> listPendingDeleteUsers(
            @AuthenticationPrincipal UserPrincipal principal) {
        var admin = userLookup.requireById(principal.getId());
        if (admin.getSchool() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "School admin chưa được gán trường.");
        }
        return schoolAdminService.listPendingDeleteUsersInSchool(admin.getSchool());
    }

    @Transactional
    @PutMapping("/users/{id}/enable")
    public void enableUser(@AuthenticationPrincipal UserPrincipal principal,
            @PathVariable("id") UUID userId) {
        var admin = userLookup.requireById(principal.getId());
        if (admin.getSchool() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "School admin chưa được gán trường.");
        }
        schoolAdminService.enableUser(admin.getSchool(), userId, admin);
    }

    @Transactional
    @PutMapping("/users/{id}/disable")
    public void disableUser(@AuthenticationPrincipal UserPrincipal principal,
            @PathVariable("id") UUID userId) {
        var admin = userLookup.requireById(principal.getId());
        if (admin.getSchool() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "School admin chưa được gán trường.");
        }
        schoolAdminService.disableUser(admin.getSchool(), userId, admin);
    }

    @Transactional
    @DeleteMapping("/users/{id}")
    public void markPendingDeleteUser(@AuthenticationPrincipal UserPrincipal principal,
            @PathVariable("id") UUID userId) {
        var admin = userLookup.requireById(principal.getId());
        if (admin.getSchool() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "School admin chưa được gán trường.");
        }
        schoolAdminService.markPendingDelete(admin.getSchool(), userId, admin);
    }

    @Transactional
    @PutMapping("/users/{id}/restore")
    public void restoreUser(@AuthenticationPrincipal UserPrincipal principal,
            @PathVariable("id") UUID userId) {
        var admin = userLookup.requireById(principal.getId());
        if (admin.getSchool() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "School admin chưa được gán trường.");
        }
        schoolAdminService.restoreUser(admin.getSchool(), userId, admin);
    }

    @Transactional
    @DeleteMapping("/users/{id}/permanent")
    public void permanentDeleteUser(@AuthenticationPrincipal UserPrincipal principal,
            @PathVariable("id") UUID userId) {
        var admin = userLookup.requireById(principal.getId());
        if (admin.getSchool() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "School admin chưa được gán trường.");
        }
        schoolAdminService.permanentDeleteUser(admin.getSchool(), userId, admin);
    }

}
