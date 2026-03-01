package com.schoolmanagement.backend.controller;

import com.schoolmanagement.backend.dto.teacher.*;
import com.schoolmanagement.backend.service.TeacherPortalService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Controller for Teacher Portal API endpoints.
 * Handles both Subject Teachers and Homeroom Teachers.
 */
@RestController
@RequestMapping("/api/teacher")
@PreAuthorize("hasRole('TEACHER')")
@RequiredArgsConstructor
public class TeacherPortalController {

    private final TeacherPortalService teacherPortalService;
    private final com.schoolmanagement.backend.service.AttendanceService attendanceService;

    /**
     * Get teacher profile including isHomeroomTeacher flag
     */
    @GetMapping("/profile")
    public ResponseEntity<TeacherProfileDto> getProfile(
            @AuthenticationPrincipal UserDetails userDetails) {
        TeacherProfileDto profile = teacherPortalService.getTeacherProfile(userDetails.getUsername());
        return ResponseEntity.ok(profile);
    }

    /**
     * Get dashboard statistics (varies by teacher type)
     */
    @GetMapping("/stats")
    public ResponseEntity<TeacherDashboardStatsDto> getStats(
            @AuthenticationPrincipal UserDetails userDetails) {
        TeacherDashboardStatsDto stats = teacherPortalService.getDashboardStats(userDetails.getUsername());
        return ResponseEntity.ok(stats);
    }

    /**
     * Get today's teaching schedule
     */
    @GetMapping("/schedule/today")
    public ResponseEntity<List<TodayScheduleItemDto>> getTodaySchedule(
            @AuthenticationPrincipal UserDetails userDetails) {
        List<TodayScheduleItemDto> schedule = teacherPortalService.getTodaySchedule(userDetails.getUsername());
        return ResponseEntity.ok(schedule);
    }

    /**
     * Get weekly teaching schedule
     */
    @GetMapping("/schedule/weekly")
    public ResponseEntity<List<com.schoolmanagement.backend.dto.TimetableDetailDto>> getWeeklySchedule(
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(teacherPortalService.getWeeklySchedule(userDetails.getUsername()));
    }

    /**
     * Get homeroom students list (403 for subject-only teachers)
     */
    @GetMapping("/students")
    public ResponseEntity<List<HomeroomStudentDto>> getHomeroomStudents(
            @AuthenticationPrincipal UserDetails userDetails) {
        List<HomeroomStudentDto> students = teacherPortalService.getHomeroomStudents(userDetails.getUsername());
        return ResponseEntity.ok(students);
    }

    /**
     * Get AI risk analysis (homeroom only - placeholder for now)
     */
    @GetMapping("/ai/risk-analysis")
    public ResponseEntity<List<StudentRiskAnalysisDto>> getRiskAnalysis(
            @AuthenticationPrincipal UserDetails userDetails) {
        List<StudentRiskAnalysisDto> analysis = teacherPortalService.getRiskAnalysis(userDetails.getUsername());
        return ResponseEntity.ok(analysis);
    }

    /**
     * Get AI recommendations (homeroom only - placeholder for now)
     */
    @GetMapping("/ai/recommendations")
    public ResponseEntity<List<AIRecommendationDto>> getRecommendations(
            @AuthenticationPrincipal UserDetails userDetails) {
        List<AIRecommendationDto> recommendations = teacherPortalService.getRecommendations(userDetails.getUsername());
        return ResponseEntity.ok(recommendations);
    }

    /**
     * Get attendance for a specific slot
     */
    @GetMapping("/attendance/slot")
    public ResponseEntity<List<AttendanceDto>> getAttendanceForSlot(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam String date,
            @RequestParam int slotIndex) {
        List<AttendanceDto> attendance = attendanceService.getAttendanceForSlot(
                userDetails.getUsername(),
                java.time.LocalDate.parse(date),
                slotIndex);
        return ResponseEntity.ok(attendance);
    }

    /**
     * Save attendance for a specific slot
     */
    @PostMapping("/attendance/slot")
    public ResponseEntity<Void> saveAttendance(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody SaveAttendanceRequest request) {
        attendanceService.saveAttendance(userDetails.getUsername(), request);
        return ResponseEntity.ok().build();
    }

    /**
     * Get daily attendance summary (Homeroom only)
     */
    @GetMapping("/attendance/daily-summary")
    public ResponseEntity<DailyAttendanceSummaryDto> getDailySummary(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam String date) {
        DailyAttendanceSummaryDto summary = attendanceService.getDailyAttendanceSummary(
                userDetails.getUsername(),
                java.time.LocalDate.parse(date));
        return ResponseEntity.ok(summary);
    }

    /**
     * Get attendance report (weekly/monthly) for Homeroom Teacher
     */
    @GetMapping("/attendance/report")
    public ResponseEntity<com.schoolmanagement.backend.dto.teacher.AttendanceReportSummaryDto> getAttendanceReport(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam String startDate,
            @RequestParam String endDate,
            @RequestParam String reportType) {
        com.schoolmanagement.backend.dto.teacher.AttendanceReportSummaryDto report = attendanceService
                .getAttendanceReport(
                        userDetails.getUsername(),
                        java.time.LocalDate.parse(startDate),
                        java.time.LocalDate.parse(endDate),
                        reportType);
        return ResponseEntity.ok(report);
    }

    /**
     * Get detailed attendance records for a specific student (Homeroom)
     */
    @GetMapping("/attendance/student-detail")
    public ResponseEntity<StudentAttendanceDetailDto> getStudentAttendanceDetail(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam String studentId,
            @RequestParam String startDate,
            @RequestParam String endDate,
            @RequestParam(required = false) String status) {
        StudentAttendanceDetailDto detail = attendanceService.getStudentAttendanceDetail(
                userDetails.getUsername(),
                java.util.UUID.fromString(studentId),
                java.time.LocalDate.parse(startDate),
                java.time.LocalDate.parse(endDate),
                status);
        return ResponseEntity.ok(detail);
    }

}
