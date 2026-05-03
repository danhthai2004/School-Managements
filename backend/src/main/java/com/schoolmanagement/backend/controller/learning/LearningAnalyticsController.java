package com.schoolmanagement.backend.controller.learning;

import com.schoolmanagement.backend.dto.learning.ClassLearningOverviewDto;
import com.schoolmanagement.backend.dto.learning.LearningAnalysisDto;
import com.schoolmanagement.backend.exception.ApiException;
import com.schoolmanagement.backend.security.UserPrincipal;
import com.schoolmanagement.backend.service.auth.UserLookupService;
import com.schoolmanagement.backend.service.learning.LearningAnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * REST Controller cho tính năng AI Learning Analytics.
 * Phục vụ cho: Admin Dashboard, Giáo viên (xem/trigger), và Học sinh (xem).
 */
@RestController
@RequestMapping("/api/learning-analytics")
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class LearningAnalyticsController {

    private final LearningAnalyticsService learningAnalyticsService;
    private final UserLookupService userLookup;

    // ══════════════════════════════════════════════
    // Admin Dashboard: Tổng quan toàn trường
    // ══════════════════════════════════════════════

    /**
     * GET /api/learning-analytics/overview — Tổng quan chất lượng học tập toàn trường.
     */
    @GetMapping("/overview")
    public List<ClassLearningOverviewDto> getSchoolOverview(
            @AuthenticationPrincipal UserPrincipal principal) {
        var user = userLookup.requireById(principal.getId());
        if (user.getSchool() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Chưa được gán trường.");
        }
        return learningAnalyticsService.getSchoolOverview(user);
    }

    // ══════════════════════════════════════════════
    // Teacher Dashboard: Homeroom Students
    // ══════════════════════════════════════════════

    /**
     * GET /api/learning-analytics/homeroom/students — Danh sách báo cáo học tập của học sinh trong lớp chủ nhiệm.
     */
    @GetMapping("/homeroom/students")
    public List<LearningAnalysisDto> getHomeroomStudentsReports(
            @AuthenticationPrincipal UserPrincipal principal) {
        var user = userLookup.requireById(principal.getId());
        if (user.getSchool() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Chưa được gán trường.");
        }
        return learningAnalyticsService.getHomeroomStudentsReports(user);
    }

    // ══════════════════════════════════════════════
    // Teacher/Admin: Xem báo cáo của 1 học sinh
    // ══════════════════════════════════════════════

    /**
     * GET /api/learning-analytics/students/{id} — Báo cáo mới nhất của 1 HS.
     */
    @GetMapping("/students/{id}")
    public ResponseEntity<LearningAnalysisDto> getStudentReport(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable("id") UUID studentId) {
        var user = userLookup.requireById(principal.getId());
        if (user.getSchool() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Chưa được gán trường.");
        }
        LearningAnalysisDto dto = learningAnalyticsService.getStudentReport(user, studentId);
        return dto != null ? ResponseEntity.ok(dto) : ResponseEntity.noContent().build();
    }

    /**
     * GET /api/learning-analytics/students/{id}/history — Lịch sử báo cáo cho biểu đồ xu hướng.
     */
    @GetMapping("/students/{id}/history")
    public List<LearningAnalysisDto> getStudentHistory(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable("id") UUID studentId) {
        var user = userLookup.requireById(principal.getId());
        if (user.getSchool() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Chưa được gán trường.");
        }
        return learningAnalyticsService.getStudentReportHistory(user, studentId);
    }

    // ══════════════════════════════════════════════
    // Teacher: Trigger phân tích 1 học sinh
    // ══════════════════════════════════════════════

    /**
     * POST /api/learning-analytics/students/{id}/trigger — Phân tích thủ công 1 HS.
     */
    @Transactional
    @PostMapping("/students/{id}/trigger")
    public ResponseEntity<LearningAnalysisDto> triggerStudentAnalysis(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable("id") UUID studentId) {
        var user = userLookup.requireById(principal.getId());
        if (user.getSchool() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Chưa được gán trường.");
        }
        LearningAnalysisDto dto = learningAnalyticsService.triggerStudentAnalysis(user, studentId);
        return dto != null ? ResponseEntity.ok(dto) : ResponseEntity.noContent().build();
    }

    // ══════════════════════════════════════════════
    // Admin: Trigger phân tích toàn trường
    // ══════════════════════════════════════════════

    /**
     * POST /api/learning-analytics/trigger — Trigger phân tích toàn trường.
     */
    @Transactional
    @PostMapping("/trigger")
    public List<LearningAnalysisDto> triggerSchoolAnalysis(
            @AuthenticationPrincipal UserPrincipal principal) {
        var user = userLookup.requireById(principal.getId());
        if (user.getSchool() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Chưa được gán trường.");
        }
        return learningAnalyticsService.triggerSchoolAnalysis(user.getSchool());
    }
}
