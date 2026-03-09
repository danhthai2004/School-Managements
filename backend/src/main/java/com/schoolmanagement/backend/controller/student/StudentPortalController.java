package com.schoolmanagement.backend.controller.student;

import com.schoolmanagement.backend.dto.student.StudentProfileDto;
import com.schoolmanagement.backend.dto.exam.ExamScheduleDto;

import com.schoolmanagement.backend.dto.timetable.StudentTimetableDto;
import com.schoolmanagement.backend.dto.grade.ScoreDto;
import com.schoolmanagement.backend.dto.attendance.AttendanceSummaryDto;
import com.schoolmanagement.backend.dto.student.StudentDashboardDto;
import com.schoolmanagement.backend.dto.timetable.TimetableSlotDto;
import com.schoolmanagement.backend.dto.student.StudentAnalysisDto;

import com.schoolmanagement.backend.domain.auth.Role;
import com.schoolmanagement.backend.domain.entity.student.Student;
import com.schoolmanagement.backend.dto.notification.NotificationDto;

import com.schoolmanagement.backend.exception.ApiException;
import com.schoolmanagement.backend.repo.student.StudentRepository;
import com.schoolmanagement.backend.security.UserPrincipal;
import com.schoolmanagement.backend.service.notification.NotificationService;
import com.schoolmanagement.backend.service.student.StudentPortalService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
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
    private final StudentRepository studentRepository;

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
     */
    @GetMapping("/timetable")
    public ResponseEntity<StudentTimetableDto> getTimetable(@AuthenticationPrincipal UserPrincipal principal) {
        StudentTimetableDto timetable = studentPortalService.getTimetable(principal.getId());
        return ResponseEntity.ok(timetable);
    }

    /**
     * Get exam schedule for the student.
     * Supports filtering by academic year and semester.
     */
    @GetMapping("/exams")
    public ResponseEntity<List<ExamScheduleDto>> getExamSchedule(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(required = false) String academicYear,
            @RequestParam(required = false) Integer semester) {
        List<ExamScheduleDto> exams = studentPortalService.getExamSchedule(principal.getId(), academicYear, semester);
        return ResponseEntity.ok(exams);
    }

    /**
     * Get scores for the student.
     * 
     * @param semester Optional semester filter (1 or 2)
     */
    @GetMapping("/scores")
    public ResponseEntity<List<ScoreDto>> getScores(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(required = false) Integer semester) {
        List<ScoreDto> scores = studentPortalService.getScores(principal.getId(), semester);
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
     * Get all visible notifications for the student.
     * Includes system-wide + school-specific notifications.
     */
    @GetMapping("/notifications")
    public ResponseEntity<List<NotificationDto>> getNotifications(@AuthenticationPrincipal UserPrincipal principal) {
        Student student = getStudentByUserId(principal.getId());
        List<NotificationDto> notifications = notificationService.getVisibleForUser(
                student.getSchool().getId(), Role.STUDENT);
        return ResponseEntity.ok(notifications);
    }

    /**
     * Get count of recent notifications (for badge on bell icon).
     */
    @GetMapping("/notifications/count")
    public ResponseEntity<NotificationCountResponse> getNotificationCount(
            @AuthenticationPrincipal UserPrincipal principal) {
        Student student = getStudentByUserId(principal.getId());
        long count = notificationService.countRecentForSchool(student.getSchool().getId());
        return ResponseEntity.ok(new NotificationCountResponse(count));
    }

    private Student getStudentByUserId(java.util.UUID userId) {
        return studentRepository.findByUserIdWithDetails(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Student not found"));
    }

    /**
     * Get notification detail by ID.
     */
    @GetMapping("/notifications/{id}")
    public ResponseEntity<NotificationDto> getNotificationDetail(
            @PathVariable java.util.UUID id,
            @AuthenticationPrincipal UserPrincipal principal) {
        Student student = getStudentByUserId(principal.getId());
        NotificationDto notification = notificationService.getById(id, student.getSchool().getId());
        return ResponseEntity.ok(notification);
    }

    public record NotificationCountResponse(long count) {
    }
}
