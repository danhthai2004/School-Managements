package com.schoolmanagement.backend.controller.grade;

import com.schoolmanagement.backend.dto.grade.GradeEntryStatusDto;
import com.schoolmanagement.backend.dto.grade.GradingConfigDto;
import com.schoolmanagement.backend.dto.grade.GradeHistoryDto;
import com.schoolmanagement.backend.dto.grade.StudentRankingDto;
import com.schoolmanagement.backend.dto.grade.GradeBookDto;
import com.schoolmanagement.backend.exception.ApiException;
import com.schoolmanagement.backend.security.UserPrincipal;
import com.schoolmanagement.backend.service.auth.UserLookupService;
import com.schoolmanagement.backend.service.grade.AdminGradeService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * REST Controller for School Admin grade management.
 * Handles grading configuration, grade entry locks, and progress monitoring.
 */
@RestController
@RequestMapping("/api/school/grades")
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminGradeController {

    private final AdminGradeService adminGradeService;
    private final UserLookupService userLookup;

    // ==================== WEIGHT CONFIGURATION ====================

    @GetMapping("/config")
    public ResponseEntity<GradingConfigDto> getGradingConfig(
            @AuthenticationPrincipal UserPrincipal principal) {
        var admin = requireSchoolAdmin(principal);
        return ResponseEntity.ok(adminGradeService.getGradingConfig(admin.getSchool()));
    }

    @Transactional
    @PutMapping("/config")
    public ResponseEntity<GradingConfigDto> updateGradingConfig(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody GradingConfigDto dto) {
        var admin = requireSchoolAdmin(principal);
        return ResponseEntity.ok(
                adminGradeService.updateGradingConfig(admin.getSchool(), admin, dto));
    }

    // ==================== GRADE ENTRY LOCKING ====================

    @Transactional
    @PostMapping("/lock")
    public ResponseEntity<Void> lockGradeEntry(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody LockRequest request) {
        var admin = requireSchoolAdmin(principal);
        adminGradeService.lockGradeEntry(
                admin.getSchool(), admin,
                request.classId(), request.semesterId(), request.reason());
        return ResponseEntity.ok().build();
    }

    @Transactional
    @PostMapping("/unlock")
    public ResponseEntity<Void> unlockGradeEntry(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody UnlockRequest request) {
        var admin = requireSchoolAdmin(principal);
        adminGradeService.unlockGradeEntry(
                admin.getSchool(), admin,
                request.classId(), request.semesterId());
        return ResponseEntity.ok().build();
    }

    // ==================== GRADE ENTRY STATUS ====================

    @GetMapping("/entry-status")
    public ResponseEntity<GradeEntryStatusDto> getGradeEntryStatus(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(required = false) UUID semesterId) {
        var admin = requireSchoolAdmin(principal);
        return ResponseEntity.ok(
                adminGradeService.getGradeEntryStatus(admin.getSchool(), semesterId));
    }

    // ==================== AUDIT / HISTORY ====================

    @GetMapping("/history")
    public ResponseEntity<org.springframework.data.domain.Page<GradeHistoryDto>> getGradeHistory(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(required = false) UUID semesterId,
            @RequestParam(required = false) UUID classId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        var admin = requireSchoolAdmin(principal);
        return ResponseEntity.ok(
                adminGradeService.getGradeHistory(admin.getSchool(), semesterId, classId, page, size));
    }

    // ==================== RANKING & GPA ====================

    @Transactional
    @PostMapping("/rankings/calculate")
    public ResponseEntity<List<StudentRankingDto>> calculateRankings(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam UUID classId,
            @RequestParam(required = false) UUID semesterId) {
        var admin = requireSchoolAdmin(principal);
        return ResponseEntity.ok(
                adminGradeService.calculateClassRankings(admin.getSchool(), admin, classId, semesterId));
    }

    @GetMapping("/rankings")
    public ResponseEntity<List<StudentRankingDto>> getClassRankings(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam UUID classId,
            @RequestParam(required = false) UUID semesterId) {
        var admin = requireSchoolAdmin(principal);
        return ResponseEntity.ok(
                adminGradeService.getClassRankings(admin.getSchool(), classId, semesterId));
    }

    // ==================== ADMIN SUPER EDIT (OVERRIDE) ====================

    @GetMapping("/book")
    public ResponseEntity<GradeBookDto> getGradeBookByAdmin(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam UUID classId,
            @RequestParam UUID subjectId,
            @RequestParam(required = false) String semesterId) {
        var admin = requireSchoolAdmin(principal);
        return ResponseEntity.ok(
                adminGradeService.getGradeBookByAdmin(admin.getSchool(), classId, subjectId, semesterId));
    }

    @Transactional
    @PutMapping("/book")
    public ResponseEntity<Void> saveGradesByAdmin(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody GradeSaveByAdminRequest request) {
        var admin = requireSchoolAdmin(principal);
        adminGradeService.saveGradesByAdmin(
                admin.getSchool(),
                admin,
                request.classId(),
                request.subjectId(),
                request.semesterId(),
                request.gradeData(),
                request.reason()
        );
        return ResponseEntity.ok().build();
    }

    // ==================== HELPERS ====================

    private com.schoolmanagement.backend.domain.entity.auth.User requireSchoolAdmin(UserPrincipal principal) {
        var admin = userLookup.requireById(principal.getId());
        if (admin.getSchool() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "School admin chưa được gán trường.");
        }
        return admin;
    }

    // ==================== REQUEST RECORDS ====================

    public record LockRequest(UUID classId, UUID semesterId, String reason) {}
    public record UnlockRequest(UUID classId, UUID semesterId) {}
    public record GradeSaveByAdminRequest(
            UUID classId,
            UUID subjectId,
            String semesterId,
            List<GradeBookDto.StudentGradeDto> gradeData,
            String reason
    ) {}
}
