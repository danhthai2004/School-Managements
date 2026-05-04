package com.schoolmanagement.backend.controller.student;

import com.schoolmanagement.backend.domain.auth.Role;
import com.schoolmanagement.backend.domain.entity.auth.User;
import com.schoolmanagement.backend.domain.entity.student.Student;
import com.schoolmanagement.backend.dto.attendance.AttendanceSummaryDto;
import com.schoolmanagement.backend.dto.exam.ExamScheduleDto;
import com.schoolmanagement.backend.dto.grade.ScoreDto;
import com.schoolmanagement.backend.dto.learning.LearningAnalysisDto;
import com.schoolmanagement.backend.dto.notification.NotificationPageResponse;
import com.schoolmanagement.backend.dto.student.StudentAnalysisDto;
import com.schoolmanagement.backend.dto.student.StudentDashboardDto;
import com.schoolmanagement.backend.dto.student.StudentProfileDto;
import com.schoolmanagement.backend.dto.timetable.StudentTimetableDto;
import com.schoolmanagement.backend.dto.timetable.TimetableSlotDto;
import com.schoolmanagement.backend.exception.ApiException;
import com.schoolmanagement.backend.repo.auth.UserRepository;
import com.schoolmanagement.backend.repo.student.StudentRepository;
import com.schoolmanagement.backend.security.UserPrincipal;
import com.schoolmanagement.backend.service.learning.LearningAnalyticsService;
import com.schoolmanagement.backend.service.notification.NotificationService;
import com.schoolmanagement.backend.service.student.StudentPortalService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.*;
import java.util.stream.Collectors;

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
    private final LearningAnalyticsService learningAnalyticsService;
    private final StudentRepository studentRepository;
    private final UserRepository userRepository;

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
            @RequestParam(required = false) String semesterId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate targetDate) {
        StudentTimetableDto timetable = studentPortalService.getTimetable(principal.getId(), semesterId, targetDate);
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
        List<ScoreDto> scores = studentPortalService.getScoresForUser(principal.getId(), semesterId);
        return ResponseEntity.ok(scores);
    }

    /**
     * [MOBILE] Get score summary shaped for the mobile app.
     * Accepts semester number (1 or 2) instead of a UUID.
     * Returns GuardianScoreSummary-compatible JSON.
     */
    @GetMapping("/scores/summary")
    public ResponseEntity<Map<String, Object>> getScoresSummary(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(required = false) Integer semester) {
        List<ScoreDto> scores = studentPortalService.getScoresForUser(principal.getId(), null);
        Map<String, Object> summary = buildScoreSummary(scores);
        return ResponseEntity.ok(summary);
    }

    /** Maps List<ScoreDto> → GuardianScoreSummary-shaped map for mobile. */
    private Map<String, Object> buildScoreSummary(List<ScoreDto> scores) {
        List<Map<String, Object>> subjects = new ArrayList<>();
        double totalAvg = 0;
        int counted = 0;
        for (ScoreDto s : scores) {
            List<Double> reg = s.getRegularScores() != null ? s.getRegularScores() : List.of();
            List<Double> oral = reg.size() > 0 ? List.of(reg.get(0)) : List.of();
            List<Double> t15 = reg.size() > 1 ? reg.subList(1, Math.min(reg.size(), 3)) : List.of();
            List<Double> t45 = reg.size() > 3 ? reg.subList(3, reg.size()) : List.of();
            Map<String, Object> subj = new LinkedHashMap<>();
            subj.put("subjectName", s.getSubjectName());
            subj.put("oralScores", oral);
            subj.put("test15MinScores", t15);
            subj.put("test45MinScores", t45);
            subj.put("midTermScore", s.getMidtermScore());
            subj.put("finalTermScore", s.getFinalScore());
            subj.put("averageScore", s.getAverageScore());
            subjects.add(subj);
            if (s.getAverageScore() != null) { totalAvg += s.getAverageScore(); counted++; }
        }
        double overall = counted > 0 ? Math.round((totalAvg / counted) * 10.0) / 10.0 : 0;
        String classification = overall >= 8.0 ? "Giỏi" : overall >= 6.5 ? "Khá" : overall >= 5.0 ? "Trung bình" : "Yếu";
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("subjects", subjects);
        result.put("overallAverage", counted > 0 ? overall : null);
        result.put("classification", counted > 0 ? classification : null);
        result.put("totalSubjects", subjects.size());
        return result;
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
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate targetDate) {
        AttendanceSummaryDto attendance = studentPortalService.getAttendanceForUser(principal.getId(), month, year, targetDate);
        return ResponseEntity.ok(attendance);
    }

    /**
     * Get dashboard data for the student overview page.
     * Includes profile, today's schedule, upcoming exams, and summary statistics.
     */
    @GetMapping("/dashboard")
    public ResponseEntity<StudentDashboardDto> getDashboard(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(required = false) String semesterId) {
        StudentDashboardDto dashboard = studentPortalService.getDashboard(principal.getId(), semesterId);
        return ResponseEntity.ok(dashboard);
    }

    /**
     * Get today's class schedule for the student.
     */
    @GetMapping("/today-schedule")
    public ResponseEntity<List<TimetableSlotDto>> getTodaySchedule(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(required = false) String semesterId) {
        List<TimetableSlotDto> schedule = studentPortalService.getTodaySchedule(principal.getId(), semesterId);
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
     * GET /api/student/learning-analytics — Học sinh xem báo cáo AI cố vấn học tập (read-only).
     */
    @GetMapping("/learning-analytics")
    public ResponseEntity<LearningAnalysisDto> getLearningAnalytics(
            @AuthenticationPrincipal UserPrincipal principal) {
        Student student = resolveStudent(principal.getId());
        LearningAnalysisDto dto = learningAnalyticsService.getMyReport(student);
        return dto != null ? ResponseEntity.ok(dto) : ResponseEntity.noContent().build();
    }

    private Student resolveStudent(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User không tồn tại"));
        if (user.getRole() != Role.STUDENT) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Chỉ học sinh mới có quyền truy cập");
        }
        return studentRepository.findByUserIdWithDetails(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy hồ sơ học sinh"));
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
            @PathVariable UUID id,
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
