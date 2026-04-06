package com.schoolmanagement.backend.controller.risk;

import com.schoolmanagement.backend.dto.risk.ClassRiskOverviewDto;
import com.schoolmanagement.backend.dto.risk.RiskAssessmentDto;
import com.schoolmanagement.backend.dto.risk.TeacherFeedbackRequest;
import com.schoolmanagement.backend.exception.ApiException;
import com.schoolmanagement.backend.security.UserPrincipal;
import com.schoolmanagement.backend.service.auth.UserLookupService;
import com.schoolmanagement.backend.service.risk.RiskAnalyticsService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

/**
 * REST Controller cho tính năng AI Risk Analytics.
 * Phục vụ cho: Admin Dashboard, Giáo viên chủ nhiệm, và Học sinh.
 */
@RestController
@RequestMapping("/api/risk")
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class RiskAnalyticsController {

    private final RiskAnalyticsService riskAnalyticsService;
    private final UserLookupService userLookup;

    // ══════════════════════════════════════════════
    // Dashboard (Admin / BGH)
    // ══════════════════════════════════════════════

    /**
     * GET /api/risk/overview — Tổng quan rủi ro toàn trường (Heatmap data).
     */
    @GetMapping("/overview")
    public List<ClassRiskOverviewDto> getSchoolOverview(@AuthenticationPrincipal UserPrincipal principal) {
        var admin = userLookup.requireById(principal.getId());
        if (admin.getSchool() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Chưa được gán trường.");
        }
        return riskAnalyticsService.getSchoolRiskOverview(admin.getSchool());
    }

    /**
     * GET /api/risk/alerts — Danh sách cảnh báo rủi ro chưa xử lý.
     */
    @GetMapping("/alerts")
    public List<RiskAssessmentDto> getPendingAlerts(@AuthenticationPrincipal UserPrincipal principal) {
        var admin = userLookup.requireById(principal.getId());
        if (admin.getSchool() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Chưa được gán trường.");
        }
        return riskAnalyticsService.getPendingAlerts(admin.getSchool());
    }

    // ══════════════════════════════════════════════
    // Student Profile (Admin / GV / Học sinh)
    // ══════════════════════════════════════════════

    /**
     * GET /api/risk/students/{id}/history — Lịch sử rủi ro cho LineChart.
     */
    @GetMapping("/students/{id}/history")
    public List<RiskAssessmentDto> getStudentHistory(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable("id") UUID studentId) {
        var user = userLookup.requireById(principal.getId());
        if (user.getSchool() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Chưa được gán trường.");
        }
        return riskAnalyticsService.getStudentRiskHistory(user.getSchool(), studentId);
    }

    /**
     * GET /api/risk/students/{id}/latest — Đánh giá mới nhất.
     */
    @GetMapping("/students/{id}/latest")
    public ResponseEntity<RiskAssessmentDto> getLatestAssessment(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable("id") UUID studentId) {
        var user = userLookup.requireById(principal.getId());
        if (user.getSchool() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Chưa được gán trường.");
        }
        RiskAssessmentDto dto = riskAnalyticsService.getLatestRiskAssessment(user.getSchool(), studentId);
        return dto != null ? ResponseEntity.ok(dto) : ResponseEntity.noContent().build();
    }

    // ══════════════════════════════════════════════
    // Teacher Feedback
    // ══════════════════════════════════════════════

    /**
     * POST /api/risk/feedback — GVCN xác nhận hoặc bác bỏ cảnh báo rủi ro.
     */
    @Transactional
    @PostMapping("/feedback")
    public RiskAssessmentDto submitFeedback(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody TeacherFeedbackRequest request) {
        return riskAnalyticsService.submitTeacherFeedback(request);
    }

    // ══════════════════════════════════════════════
    // Manual Trigger (Admin only)
    // ══════════════════════════════════════════════

    /**
     * POST /api/risk/trigger — Kích hoạt phân tích AI thủ công.
     */
    @Transactional
    @PostMapping("/trigger")
    public List<RiskAssessmentDto> triggerAnalysis(@AuthenticationPrincipal UserPrincipal principal) {
        var admin = userLookup.requireById(principal.getId());
        if (admin.getSchool() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Chưa được gán trường.");
        }
        return riskAnalyticsService.triggerAnalysis(admin.getSchool());
    }
}
