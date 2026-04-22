package com.schoolmanagement.backend.controller.admin;

import com.schoolmanagement.backend.domain.auth.Role;
import com.schoolmanagement.backend.domain.entity.auth.User;
import com.schoolmanagement.backend.dto.admin.SchoolDetailDto;
import com.schoolmanagement.backend.dto.admin.SchoolDto;
import com.schoolmanagement.backend.dto.auth.UserDto;
import com.schoolmanagement.backend.dto.auth.UserListDto;
import com.schoolmanagement.backend.dto.admin.CreateSchoolAdminForSchoolRequest;
import com.schoolmanagement.backend.dto.admin.CreateSchoolRequest;
import com.schoolmanagement.backend.dto.auth.CreateUserRequest;
import com.schoolmanagement.backend.dto.admin.UpdateSchoolRequest;
import com.schoolmanagement.backend.exception.ApiException;
import com.schoolmanagement.backend.repo.auth.UserRepository;
import com.schoolmanagement.backend.security.UserPrincipal;
import com.schoolmanagement.backend.service.admin.SystemAdminService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;

import java.util.UUID;

@RestController
@RequestMapping("/api/system")
public class SystemAdminController {

    private final SystemAdminService systemAdmin;
    private final UserRepository users;

    public SystemAdminController(SystemAdminService systemAdmin, UserRepository users) {
        this.systemAdmin = systemAdmin;
        this.users = users;
    }

    // ========== SCHOOLS ==========

    @PostMapping("/schools")
    public SchoolDto createSchool(@Valid @RequestBody CreateSchoolRequest req,
            @AuthenticationPrincipal UserPrincipal principal) {
        User user = getCurrentUser(principal);
        return systemAdmin.createSchool(req, user);
    }

    @GetMapping("/schools")
    public Page<SchoolDto> listSchools(@PageableDefault(size = 20) Pageable pageable) {
        return systemAdmin.listSchools(pageable);
    }

    @GetMapping("/schools/pending")
    public Page<SchoolDto> listPendingDeleteSchools(@PageableDefault(size = 20) Pageable pageable) {
        return systemAdmin.listPendingDeleteSchools(pageable);
    }

    @GetMapping("/schools/{id}")
    public SchoolDetailDto getSchool(@PathVariable UUID id) {
        return systemAdmin.getSchoolWithAdmins(id);
    }

    @PutMapping("/schools/{id}")
    public SchoolDto updateSchool(@PathVariable UUID id,
            @Valid @RequestBody UpdateSchoolRequest req,
            @AuthenticationPrincipal UserPrincipal principal) {
        User user = getCurrentUser(principal);
        return systemAdmin.updateSchool(id, req, user);
    }

    @DeleteMapping("/schools/{id}")
    public void deleteSchool(@PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal) {
        User user = getCurrentUser(principal);
        systemAdmin.deleteSchool(id, user);
    }

    @PostMapping("/schools/{id}/restore")
    public void restoreSchool(@PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal) {
        User user = getCurrentUser(principal);
        systemAdmin.restoreSchool(id, user);
    }

    @DeleteMapping("/schools/{id}/permanent")
    public void permanentDeleteSchool(@PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal) {
        User user = getCurrentUser(principal);
        systemAdmin.permanentDeleteSchool(id, user);
    }

    @PostMapping("/schools/{schoolId}/admins")
    public UserDto createSchoolAdminForSchool(@PathVariable UUID schoolId,
            @Valid @RequestBody CreateSchoolAdminForSchoolRequest req,
            @AuthenticationPrincipal UserPrincipal principal) {
        User user = getCurrentUser(principal);
        return systemAdmin.createSchoolAdmin(schoolId, req.email(), req.fullName(), user);
    }

    // ========== SCHOOL ADMINS (legacy endpoint) ==========

    @PostMapping("/school-admins")
    public UserDto createSchoolAdmin(@Valid @RequestBody CreateUserRequest req,
            @AuthenticationPrincipal UserPrincipal principal) {
        if (req.schoolId() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "schoolId là bắt buộc.");
        }
        if (req.role() == null || !req.role().name().equals("SCHOOL_ADMIN")) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "role phải là SCHOOL_ADMIN.");
        }
        User user = getCurrentUser(principal);
        return systemAdmin.createSchoolAdmin(req.schoolId(), req.email(), req.fullName(), user);
    }

    // ========== USERS ==========

    @GetMapping("/users")
    public Page<UserListDto> listUsers(
            @RequestParam(required = false) Role role,
            @RequestParam(required = false) UUID schoolId,
            @RequestParam(required = false) Boolean enabled,
            @RequestParam(defaultValue = "false") boolean pendingDelete,
            @PageableDefault(size = 20) Pageable pageable) {
        return systemAdmin.listUsers(role, schoolId, enabled, pendingDelete, pageable);
    }

    @GetMapping("/users/pending")
    public Page<UserListDto> listPendingDeleteUsers(@PageableDefault(size = 20) Pageable pageable) {
        return systemAdmin.listPendingDeleteUsers(pageable);
    }

    @PutMapping("/users/{id}/enable")
    public void enableUser(@PathVariable UUID id, @AuthenticationPrincipal UserPrincipal principal) {
        User user = getCurrentUser(principal);
        systemAdmin.enableUser(id, user);
    }

    @PutMapping("/users/{id}/disable")
    public void disableUser(@PathVariable UUID id, @AuthenticationPrincipal UserPrincipal principal) {
        User user = getCurrentUser(principal);
        systemAdmin.disableUser(id, user);
    }

    @DeleteMapping("/users/{id}")
    public void markPendingDelete(@PathVariable UUID id, @AuthenticationPrincipal UserPrincipal principal) {
        User user = getCurrentUser(principal);
        systemAdmin.markPendingDelete(id, user);
    }

    @DeleteMapping("/users/{id}/permanent")
    public void permanentDelete(@PathVariable UUID id, @AuthenticationPrincipal UserPrincipal principal) {
        User user = getCurrentUser(principal);
        systemAdmin.permanentDeleteUser(id, user);
    }

    @PutMapping("/users/{id}/restore")
    public void restoreUser(@PathVariable UUID id, @AuthenticationPrincipal UserPrincipal principal) {
        User user = getCurrentUser(principal);
        systemAdmin.restoreUser(id, user);
    }

    // ========== HELPERS ==========

    private User getCurrentUser(UserPrincipal principal) {
        if (principal == null || principal.getId() == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "User not authenticated");
        }
        return users.findById(principal.getId())
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "User not found"));
    }
}
