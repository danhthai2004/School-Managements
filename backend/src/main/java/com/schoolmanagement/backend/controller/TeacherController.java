package com.schoolmanagement.backend.controller;

import com.schoolmanagement.backend.dto.ImportTeacherResult;
import com.schoolmanagement.backend.dto.TeacherDto;
import com.schoolmanagement.backend.dto.request.CreateTeacherRequest;
import com.schoolmanagement.backend.exception.ApiException;
import com.schoolmanagement.backend.security.UserPrincipal;
import com.schoolmanagement.backend.service.TeacherImportService;
import com.schoolmanagement.backend.service.TeacherManagementService;
import com.schoolmanagement.backend.service.UserLookupService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/school")
@Transactional(readOnly = true)
public class TeacherController {

    private final TeacherManagementService teacherManagementService;
    private final TeacherImportService teacherImportService;
    private final UserLookupService userLookup;

    public TeacherController(TeacherManagementService teacherManagementService,
            TeacherImportService teacherImportService,
            UserLookupService userLookup) {
        this.teacherManagementService = teacherManagementService;
        this.teacherImportService = teacherImportService;
        this.userLookup = userLookup;
    }

    @GetMapping("/teachers/profiles")
    public List<TeacherDto> listTeacherProfiles(
            @AuthenticationPrincipal UserPrincipal principal) {
        var admin = userLookup.requireById(principal.getId());
        if (admin.getSchool() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "School admin chưa được gán trường.");
        }
        return teacherManagementService.listTeachersProfile(admin.getSchool());
    }

    @Transactional
    @PostMapping("/teachers")
    public TeacherDto createTeacher(@AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody CreateTeacherRequest req) {
        var admin = userLookup.requireById(principal.getId());
        if (admin.getSchool() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "School admin chưa được gán trường.");
        }
        return teacherManagementService.createTeacher(admin.getSchool(), req);
    }

    @Transactional
    @PutMapping("/teachers/{teacherId}")
    public TeacherDto updateTeacher(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID teacherId,
            @Valid @RequestBody CreateTeacherRequest req) {
        var admin = userLookup.requireById(principal.getId());
        if (admin.getSchool() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "School admin chưa được gán trường.");
        }
        return teacherManagementService.updateTeacher(admin.getSchool(), teacherId, req);
    }

    @org.springframework.transaction.annotation.Transactional(propagation = org.springframework.transaction.annotation.Propagation.NOT_SUPPORTED)
    @PostMapping("/teachers/bulk-delete") // Changed to POST for reliable body payload support
    public com.schoolmanagement.backend.dto.BulkDeleteResponse bulkDeleteTeachers(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody com.schoolmanagement.backend.dto.request.BulkDeleteRequest request) {
        var admin = userLookup.requireById(principal.getId());
        if (admin.getSchool() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "School admin chưa được gán trường.");
        }
        return teacherManagementService.deleteTeachers(admin.getSchool(), request);
    }

    /**
     * Import teachers from Excel file
     * Excel columns: fullName/Họ tên (required), dateOfBirth/Ngày sinh, gender/Giới
     * tính, address/Địa chỉ, email, phone/SĐT, specialization/Chuyên môn,
     * degree/Bằng cấp
     */
    @Transactional
    @PostMapping("/teachers/import-excel")
    public ImportTeacherResult importTeachersFromExcel(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam("file") MultipartFile file) {
        var admin = userLookup.requireById(principal.getId());
        if (admin.getSchool() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "School admin chưa được gán trường.");
        }
        return teacherImportService.importTeachersFromExcel(admin.getSchool(), file);
    }
}
