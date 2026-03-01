package com.schoolmanagement.backend.controller;

import com.schoolmanagement.backend.domain.Role;
import com.schoolmanagement.backend.domain.entity.User;
import com.schoolmanagement.backend.dto.SchoolDetailDto;
import com.schoolmanagement.backend.dto.SchoolDto;
import com.schoolmanagement.backend.dto.UserDto;
import com.schoolmanagement.backend.dto.UserListDto;
import com.schoolmanagement.backend.dto.request.CreateSchoolAdminForSchoolRequest;
import com.schoolmanagement.backend.dto.request.CreateSchoolRequest;
import com.schoolmanagement.backend.dto.request.CreateUserRequest;
import com.schoolmanagement.backend.dto.request.UpdateSchoolRequest;
import com.schoolmanagement.backend.exception.ApiException;
import com.schoolmanagement.backend.repo.UserRepository;
import com.schoolmanagement.backend.security.UserPrincipal;
import com.schoolmanagement.backend.service.SystemAdminService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
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
    public List<SchoolDto> listSchools() {
        return systemAdmin.listSchools();
    }

    @GetMapping("/schools/pending")
    public List<SchoolDto> listPendingDeleteSchools() {
        return systemAdmin.listPendingDeleteSchools();
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
    public List<UserListDto> listUsers(
            @RequestParam(required = false) Role role,
            @RequestParam(required = false) UUID schoolId,
            @RequestParam(required = false) Boolean enabled,
            @RequestParam(defaultValue = "false") boolean pendingDelete) {
        return systemAdmin.listUsers(role, schoolId, enabled, pendingDelete);
    }

    @GetMapping("/users/pending")
    public List<UserListDto> listPendingDeleteUsers() {
        return systemAdmin.listPendingDeleteUsers();
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
