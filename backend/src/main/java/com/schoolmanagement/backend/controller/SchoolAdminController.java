package com.schoolmanagement.backend.controller;

import com.schoolmanagement.backend.domain.Role;
import com.schoolmanagement.backend.dto.BulkImportResponse;
import com.schoolmanagement.backend.dto.ClassRoomDto;
import com.schoolmanagement.backend.dto.SchoolStatsDto;
import com.schoolmanagement.backend.dto.UserDto;
import com.schoolmanagement.backend.dto.request.CreateClassRoomRequest;
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

@RestController
@RequestMapping("/api/school")
@Transactional(readOnly = true)
public class SchoolAdminController {

    private final SchoolAdminService schoolAdminService;
    private final UserLookupService userLookup;

    public SchoolAdminController(SchoolAdminService schoolAdminService, UserLookupService userLookup) {
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

    // ==================== CLASS ROOM MANAGEMENT ====================

    @GetMapping("/classes")
    public List<ClassRoomDto> listClasses(@AuthenticationPrincipal UserPrincipal principal) {
        var admin = userLookup.requireById(principal.getId());
        if (admin.getSchool() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "School admin chưa được gán trường.");
        }
        return schoolAdminService.listClassRooms(admin.getSchool());
    }

    @Transactional
    @PostMapping("/classes")
    public ClassRoomDto createClass(@AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody CreateClassRoomRequest req) {
        var admin = userLookup.requireById(principal.getId());
        if (admin.getSchool() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "School admin chưa được gán trường.");
        }
        return schoolAdminService.createClassRoom(admin.getSchool(), req);
    }

    @Transactional
    @PutMapping("/classes/{id}")
    public ClassRoomDto updateClass(@AuthenticationPrincipal UserPrincipal principal,
            @PathVariable("id") java.util.UUID classId,
            @Valid @RequestBody CreateClassRoomRequest req) {
        var admin = userLookup.requireById(principal.getId());
        if (admin.getSchool() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "School admin chưa được gán trường.");
        }
        return schoolAdminService.updateClassRoom(admin.getSchool(), classId, req);
    }

    @Transactional
    @DeleteMapping("/classes/{id}")
    public void deleteClass(@AuthenticationPrincipal UserPrincipal principal,
            @PathVariable("id") java.util.UUID classId) {
        var admin = userLookup.requireById(principal.getId());
        if (admin.getSchool() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "School admin chưa được gán trường.");
        }
        schoolAdminService.deleteClassRoom(admin.getSchool(), classId);
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
}
