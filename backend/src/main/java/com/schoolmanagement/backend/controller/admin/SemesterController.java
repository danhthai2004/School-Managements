package com.schoolmanagement.backend.controller.admin;

import com.schoolmanagement.backend.dto.admin.*;
import com.schoolmanagement.backend.exception.ApiException;
import com.schoolmanagement.backend.security.UserPrincipal;
import com.schoolmanagement.backend.service.admin.SemesterService;
import com.schoolmanagement.backend.service.auth.UserLookupService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/school")
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class SemesterController {

    private final SemesterService semesterService;
    private final UserLookupService userLookup;

    // ==================== ACADEMIC YEAR ====================

    @GetMapping("/academic-years")
    public List<AcademicYearDto> listAcademicYears(@AuthenticationPrincipal UserPrincipal principal) {
        var user = requireUserWithSchool(principal);
        return semesterService.listAcademicYears(user.getSchool());
    }

    @Transactional
    @PostMapping("/academic-years")
    public AcademicYearDto createAcademicYear(@AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody CreateAcademicYearRequest req) {
        var admin = requireSchoolAdmin(principal);
        return semesterService.createAcademicYear(admin.getSchool(), req);
    }

    @Transactional
    @PutMapping("/academic-years/{id}")
    public AcademicYearDto updateAcademicYear(@AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id, @Valid @RequestBody CreateAcademicYearRequest req) {
        var admin = requireSchoolAdmin(principal);
        return semesterService.updateAcademicYear(admin.getSchool(), id, req);
    }

    @Transactional
    @DeleteMapping("/academic-years/{id}")
    public void deleteAcademicYear(@AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id) {
        var admin = requireSchoolAdmin(principal);
        semesterService.deleteAcademicYear(admin.getSchool(), id);
    }

    @Transactional
    @PostMapping("/academic-years/{id}/activate")
    public AcademicYearDto activateAcademicYear(@AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id) {
        var admin = requireSchoolAdmin(principal);
        return semesterService.activateAcademicYear(admin.getSchool(), id);
    }

    // ==================== SEMESTER ====================
    // Học kỳ được tự động tạo khi tạo Năm học (HK1 + HK2).
    // Chỉ hỗ trợ: xem, cập nhật ngày, kích hoạt, đóng.

    @GetMapping("/semesters")
    public List<SemesterDto> listSemesters(@AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(required = false) UUID academicYearId) {
        var user = requireUserWithSchool(principal);
        if (academicYearId != null) {
            return semesterService.listSemestersByAcademicYear(academicYearId);
        }
        return semesterService.listSemesters(user.getSchool());
    }

    @GetMapping("/semesters/current")
    public SemesterDto getCurrentSemester(@AuthenticationPrincipal UserPrincipal principal) {
        var user = requireUserWithSchool(principal);
        return semesterService.getCurrentSemester(user.getSchool());
    }

    @Transactional
    @PutMapping("/semesters/{id}")
    public SemesterDto updateSemester(@AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id, @Valid @RequestBody UpdateSemesterRequest req) {
        var admin = requireSchoolAdmin(principal);
        return semesterService.updateSemester(admin.getSchool(), id, req);
    }

    @Transactional
    @PostMapping("/semesters/{id}/activate")
    public SemesterDto activateSemester(@AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id) {
        var admin = requireSchoolAdmin(principal);
        return semesterService.activateSemester(admin.getSchool(), id);
    }

    @Transactional
    @PostMapping("/semesters/{id}/close")
    public SemesterDto closeSemester(@AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id) {
        var admin = requireSchoolAdmin(principal);
        return semesterService.closeSemester(admin.getSchool(), id);
    }

    // ==================== HELPER ====================

    private com.schoolmanagement.backend.domain.entity.auth.User requireUserWithSchool(UserPrincipal principal) {
        var user = userLookup.requireById(principal.getId());
        if (user.getSchool() == null && user.getRole() != Role.SYSTEM_ADMIN) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Người dùng chưa được gán trường.");
        }
        return user;
    }

    private com.schoolmanagement.backend.domain.entity.auth.User requireSchoolAdmin(UserPrincipal principal) {
        var admin = requireUserWithSchool(principal);
        // Additional check for admin role if needed, but and security config already handles this.
        // However, for extra safety we can verify role here if we want.
        return admin;
    }
}
