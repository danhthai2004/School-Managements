package com.schoolmanagement.backend.controller.student;

import com.schoolmanagement.backend.dto.student.StudentProfileDto;
import com.schoolmanagement.backend.dto.exam.ExamScheduleDto;

import com.schoolmanagement.backend.dto.timetable.StudentTimetableDto;
import com.schoolmanagement.backend.dto.grade.ScoreDto;
import com.schoolmanagement.backend.dto.attendance.AttendanceSummaryDto;
import com.schoolmanagement.backend.dto.student.StudentDashboardDto;
import com.schoolmanagement.backend.dto.timetable.TimetableSlotDto;
import com.schoolmanagement.backend.dto.student.StudentAnalysisDto;

import com.schoolmanagement.backend.dto.notification.NotificationPageResponse;

import com.schoolmanagement.backend.security.UserPrincipal;
import com.schoolmanagement.backend.service.notification.NotificationService;
import com.schoolmanagement.backend.service.student.StudentPortalService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST Controller for Student Portal APIs.
 * All endpoints require STUDENT role authentication.
 */
@RestController
@RequestMapping("/api/student")
@RequiredArgsConstructor
@PreAuthorize("hasRole('STUDENT')")
public class StudentPortalController {

    private final StudentPortalService studentPortalService;
    private final NotificationService notificationService;

    /**
     * Get the profile of the logged-in student.
     */
    @GetMapping("/profile")
    public ResponseEntity<StudentProfileDto> getProfile(@AuthenticationPrincipal UserPrincipal principal) {
        StudentProfileDto profile = studentPortalService.getProfile(principal.getId());
        return ResponseEntity.ok(profile);
    }

    /**
     * Get the timetable for the student's current class.
     * Supports filtering by semester.
     */
    @GetMapping("/timetable")
    public ResponseEntity<StudentTimetableDto> getTimetable(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(required = false) String semesterId) {
        StudentTimetableDto timetable = studentPortalService.getTimetable(principal.getId(), semesterId);
        return ResponseEntity.ok(timetable);
    }

    /**
     * Get exam schedule for the student.
     * Supports filtering by academic year and semester.
     */
    @GetMapping("/exams")
    public ResponseEntity<List<ExamScheduleDto>> getExamSchedule(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(required = false) String semesterId) {
        List<ExamScheduleDto> exams = studentPortalService.getExamSchedule(principal.getId(), semesterId);
        return ResponseEntity.ok(exams);
    }

    /**
     * Get scores for the student.
     * 
     * @param semesterId Optional semester ID filter
     */
    @GetMapping("/scores")
    public ResponseEntity<List<ScoreDto>> getScores(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(required = false) String semesterId) {
        List<ScoreDto> scores = studentPortalService.getScores(principal.getId(), semesterId);
        return ResponseEntity.ok(scores);
    }

    /**
     * Get attendance summary for the student.
     * 
     * @param month Optional month filter
     * @param year  Optional year filter
     */
    @GetMapping("/attendance")
    public ResponseEntity<AttendanceSummaryDto> getAttendance(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(required = false) Integer month,
            @RequestParam(required = false) Integer year) {
        AttendanceSummaryDto attendance = studentPortalService.getAttendance(principal.getId(), month, year);
        return ResponseEntity.ok(attendance);
    }

    /**
     * Get dashboard data for the student overview page.
     * Includes profile, today's schedule, upcoming exams, and summary statistics.
     */
    @GetMapping("/dashboard")
    public ResponseEntity<StudentDashboardDto> getDashboard(@AuthenticationPrincipal UserPrincipal principal) {
        StudentDashboardDto dashboard = studentPortalService.getDashboard(principal.getId());
        return ResponseEntity.ok(dashboard);
    }

    /**
     * Get today's class schedule for the student.
     */
    @GetMapping("/today-schedule")
    public ResponseEntity<List<TimetableSlotDto>> getTodaySchedule(@AuthenticationPrincipal UserPrincipal principal) {
        List<TimetableSlotDto> schedule = studentPortalService.getTodaySchedule(principal.getId());
        return ResponseEntity.ok(schedule);
    }

    /**
     * Get detailed learning analysis and statistics for the student.
     * Includes score distribution, subject performance, and attendance trends.
     */
    @GetMapping("/analysis")
    public ResponseEntity<StudentAnalysisDto> getAnalysis(@AuthenticationPrincipal UserPrincipal principal) {
        StudentAnalysisDto analysis = studentPortalService.getAnalysis(principal.getId());
        return ResponseEntity.ok(analysis);
    }

    /**
     * Lấy danh sách thông báo cá nhân (phân trang, kèm unreadCount).
     */
    @GetMapping("/notifications")
    public ResponseEntity<NotificationPageResponse> getNotifications(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        NotificationPageResponse response = notificationService.getUserNotifications(principal.getId(), page, size);
        return ResponseEntity.ok(response);
    }

    /**
     * Đánh dấu 1 thông báo đã đọc.
     */
    @PatchMapping("/notifications/{id}/read")
    public ResponseEntity<Void> markNotificationAsRead(
            @PathVariable java.util.UUID id,
            @AuthenticationPrincipal UserPrincipal principal) {
        notificationService.markAsRead(id, principal.getId());
        return ResponseEntity.ok().build();
    }

    /**
     * Đánh dấu tất cả thông báo đã đọc.
     */
    @PatchMapping("/notifications/read-all")
    public ResponseEntity<Void> markAllNotificationsAsRead(
            @AuthenticationPrincipal UserPrincipal principal) {
        notificationService.markAllAsRead(principal.getId());
        return ResponseEntity.ok().build();
    }
}
