package com.schoolmanagement.backend.controller.exam;

import com.schoolmanagement.backend.service.exam.ExamSessionService;
import com.schoolmanagement.backend.service.auth.UserLookupService;
import com.schoolmanagement.backend.dto.exam.ExamSessionDto;
import com.schoolmanagement.backend.dto.exam.ExamScheduleDetailDto;
import com.schoolmanagement.backend.exception.ApiException;
import com.schoolmanagement.backend.security.UserPrincipal;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import jakarta.validation.Valid;

import java.util.List;
import java.util.UUID;

/**
 * Controller cho quản lý lịch thi nâng cao (Exam Session + Allocation).
 */
@RestController
@RequestMapping("/api/school/exam-admin")
@RequiredArgsConstructor
public class ExamAdminController {

    private final ExamSessionService examSessionService;
    private final UserLookupService userLookup;

    // ==================== Helper ====================
    private com.schoolmanagement.backend.domain.entity.admin.School getSchool(UserPrincipal principal) {
        var admin = userLookup.requireById(principal.getId());
        if (admin.getSchool() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "School admin chưa được gán trường.");
        }
        return admin.getSchool();
    }

    // ==================== ExamSession CRUD ====================

    @GetMapping("/sessions")
    public List<ExamSessionDto> listSessions(
            @RequestParam(required = false) String academicYear,
            @RequestParam(required = false) Integer semester,
            @AuthenticationPrincipal UserPrincipal principal) {
        return examSessionService.listSessions(getSchool(principal).getId(), academicYear, semester);
    }

    @GetMapping("/sessions/{id}")
    public ExamSessionDto getSession(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal) {
        return examSessionService.getSession(id, getSchool(principal).getId());
    }

    @Transactional
    @PostMapping("/sessions")
    public ExamSessionDto createSession(
            @Valid @RequestBody ExamSessionDto dto,
            @AuthenticationPrincipal UserPrincipal principal) {
        return examSessionService.createSession(dto, getSchool(principal).getId());
    }

    @Transactional
    @PutMapping("/sessions/{id}")
    public ExamSessionDto updateSession(
            @PathVariable UUID id,
            @Valid @RequestBody ExamSessionDto dto,
            @AuthenticationPrincipal UserPrincipal principal) {
        return examSessionService.updateSession(id, dto, getSchool(principal).getId());
    }

    @Transactional
    @DeleteMapping("/sessions/{id}")
    public void deleteSession(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal) {
        examSessionService.deleteSession(id, getSchool(principal).getId());
    }

    @Transactional
    @PatchMapping("/sessions/{id}/status")
    public ExamSessionDto updateSessionStatus(
            @PathVariable UUID id,
            @RequestBody java.util.Map<String, String> body,
            @AuthenticationPrincipal UserPrincipal principal) {
        String status = body.get("status");
        if (status == null || status.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Thiếu trường 'status'");
        }
        return examSessionService.updateSessionStatus(id, status, getSchool(principal).getId());
    }

    // ==================== View Schedule Details ====================

    @GetMapping("/sessions/{id}/schedules")
    public List<ExamScheduleDetailDto> getSessionSchedules(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal) {
        return examSessionService.getSessionSchedules(id, getSchool(principal).getId());
    }

    @Transactional
    @PostMapping("/sessions/{id}/schedules")
    public void bulkCreateSchedules(
            @PathVariable UUID id,
            @RequestBody List<ExamScheduleDetailDto> dtos,
            @AuthenticationPrincipal UserPrincipal principal) {
        examSessionService.bulkCreateSchedules(id, dtos, getSchool(principal).getId());
    }

    @Transactional
    @PutMapping("/schedules/{id}")
    public ExamScheduleDetailDto updateSchedule(
            @PathVariable UUID id,
            @RequestBody ExamScheduleDetailDto dto,
            @AuthenticationPrincipal UserPrincipal principal) {
        return examSessionService.updateSchedule(id, dto, getSchool(principal).getId());
    }

    @Transactional
    @DeleteMapping("/schedules/{id}")
    public void deleteSchedule(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal) {
        examSessionService.deleteSchedule(id, getSchool(principal).getId());
    }
}
