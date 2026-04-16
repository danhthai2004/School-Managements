package com.schoolmanagement.backend.controller.teacher;

import com.schoolmanagement.backend.dto.attendance.*;
import com.schoolmanagement.backend.dto.common.*;
import com.schoolmanagement.backend.dto.exam.ExamScheduleDto;
import com.schoolmanagement.backend.dto.student.HomeroomStudentDto;
import com.schoolmanagement.backend.dto.student.StudentRiskAnalysisDto;
import com.schoolmanagement.backend.dto.student.StudentProfileDto;
import com.schoolmanagement.backend.dto.grade.ScoreDto;
import com.schoolmanagement.backend.dto.teacher.TeacherDashboardStatsDto;
import com.schoolmanagement.backend.dto.teacher.TeacherProfileDto;

import com.schoolmanagement.backend.service.teacher.HomeroomStudentExportService;
import com.schoolmanagement.backend.service.teacher.TeacherPortalService;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.Workbook;
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
    private final com.schoolmanagement.backend.service.attendance.AttendanceService attendanceService;
    private final HomeroomStudentExportService homeroomStudentExportService;

    @GetMapping("/profile")
    public ResponseEntity<TeacherProfileDto> getProfile(
            @AuthenticationPrincipal UserDetails userDetails) {
        TeacherProfileDto profile = teacherPortalService.getTeacherProfile(userDetails.getUsername());
        return ResponseEntity.ok(profile);
    }

    @GetMapping("/stats")
    public ResponseEntity<TeacherDashboardStatsDto> getStats(
            @AuthenticationPrincipal UserDetails userDetails) {
        TeacherDashboardStatsDto stats = teacherPortalService.getDashboardStats(userDetails.getUsername());
        return ResponseEntity.ok(stats);
    }

    @GetMapping("/schedule/today")
    public ResponseEntity<List<TodayScheduleItemDto>> getTodaySchedule(
            @AuthenticationPrincipal UserDetails userDetails) {
        List<TodayScheduleItemDto> schedule = teacherPortalService.getTodaySchedule(userDetails.getUsername());
        return ResponseEntity.ok(schedule);
    }

    @GetMapping("/schedule/weekly")
    public ResponseEntity<List<com.schoolmanagement.backend.dto.timetable.TimetableDetailDto>> getWeeklySchedule(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(required = false) String semesterId) {
        return ResponseEntity.ok(teacherPortalService.getWeeklySchedule(userDetails.getUsername(), semesterId));
    }

    @GetMapping("/schedule/exam")
    public ResponseEntity<List<ExamScheduleDto>> getExamSchedule(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam(required = false) String semesterId) {
        return ResponseEntity
                .ok(teacherPortalService.getExamSchedule(userDetails.getUsername(), semesterId));
    }

    @GetMapping("/students")
    public ResponseEntity<List<HomeroomStudentDto>> getHomeroomStudents(
            @AuthenticationPrincipal UserDetails userDetails) {
        List<HomeroomStudentDto> students = teacherPortalService.getHomeroomStudents(userDetails.getUsername());
        return ResponseEntity.ok(students);
    }

    @GetMapping("/students/{id}/profile")
    public ResponseEntity<StudentProfileDto> getStudentProfile(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable java.util.UUID id) {
        return ResponseEntity.ok(teacherPortalService.getHomeroomStudentProfile(userDetails.getUsername(), id));
    }

    @GetMapping("/students/{id}/scores")
    public ResponseEntity<List<ScoreDto>> getStudentScores(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable java.util.UUID id,
            @RequestParam(required = false) java.util.UUID semesterId) {
        return ResponseEntity
                .ok(teacherPortalService.getHomeroomStudentScores(userDetails.getUsername(), id, semesterId));
    }

    @GetMapping("/students/export")
    public void exportHomeroomStudents(
            @AuthenticationPrincipal UserDetails userDetails,
            jakarta.servlet.http.HttpServletResponse response) throws java.io.IOException {
        Workbook workbook = homeroomStudentExportService.exportHomeroomStudents(userDetails.getUsername());

        response.setContentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        response.setHeader("Content-Disposition", "attachment; filename=danh-sach-hoc-sinh.xlsx");
        workbook.write(response.getOutputStream());
        workbook.close();
    }

    @GetMapping("/ai/risk-analysis")
    public ResponseEntity<List<StudentRiskAnalysisDto>> getRiskAnalysis(
            @AuthenticationPrincipal UserDetails userDetails) {
        List<StudentRiskAnalysisDto> analysis = teacherPortalService.getRiskAnalysis(userDetails.getUsername());
        return ResponseEntity.ok(analysis);
    }

    @GetMapping("/ai/recommendations")
    public ResponseEntity<List<AIRecommendationDto>> getRecommendations(
            @AuthenticationPrincipal UserDetails userDetails) {
        List<AIRecommendationDto> recommendations = teacherPortalService.getRecommendations(userDetails.getUsername());
        return ResponseEntity.ok(recommendations);
    }

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

    @PostMapping("/attendance/slot")
    public ResponseEntity<Void> saveAttendance(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody SaveAttendanceRequest request) {
        attendanceService.saveAttendance(userDetails.getUsername(), request);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/attendance/daily-summary")
    public ResponseEntity<DailyAttendanceSummaryDto> getDailySummary(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam String date) {
        DailyAttendanceSummaryDto summary = attendanceService.getDailyAttendanceSummary(
                userDetails.getUsername(),
                java.time.LocalDate.parse(date));
        return ResponseEntity.ok(summary);
    }

    @GetMapping("/attendance/report")
    public ResponseEntity<com.schoolmanagement.backend.dto.attendance.AttendanceReportSummaryDto> getAttendanceReport(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam String startDate,
            @RequestParam String endDate,
            @RequestParam String reportType) {
        com.schoolmanagement.backend.dto.attendance.AttendanceReportSummaryDto report = attendanceService
                .getAttendanceReport(
                        userDetails.getUsername(),
                        java.time.LocalDate.parse(startDate),
                        java.time.LocalDate.parse(endDate),
                        reportType);
        return ResponseEntity.ok(report);
    }

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
