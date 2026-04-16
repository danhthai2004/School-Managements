package com.schoolmanagement.backend.controller.report;

import com.schoolmanagement.backend.dto.report.ReportOverviewDto;
import com.schoolmanagement.backend.dto.report.ClassReportDto;
import com.schoolmanagement.backend.dto.report.AcademicReportDto;

import com.schoolmanagement.backend.dto.attendance.AttendanceReportDto;
import com.schoolmanagement.backend.dto.timetable.TimetableReportDto;

import com.schoolmanagement.backend.dto.student.StudentReportDto;
import com.schoolmanagement.backend.dto.student.StudentDetailedListDto;
import com.schoolmanagement.backend.dto.student.StudentsWithoutAccountDto;
import com.schoolmanagement.backend.dto.common.EnrollmentTrendDto;
import com.schoolmanagement.backend.dto.teacher.TeacherReportDto;

import com.schoolmanagement.backend.exception.ApiException;
import com.schoolmanagement.backend.security.UserPrincipal;
import com.schoolmanagement.backend.service.report.ReportService;
import com.schoolmanagement.backend.service.auth.UserLookupService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * Controller cho các API báo cáo của School Admin
 */
@RestController
@RequestMapping("/api/reports")
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ReportController {

    private final ReportService reportService;
    private final UserLookupService userLookup;

    // ==================== DASHBOARD OVERVIEW ====================

    /**
     * Lấy thống kê tổng quan trường học
     * Endpoint: GET /api/reports/dashboard/overview
     */
    @GetMapping("/dashboard/overview")
    public ReportOverviewDto getDashboardOverview(@AuthenticationPrincipal UserPrincipal principal) {
        var admin = userLookup.requireById(principal.getId());
        if (admin.getSchool() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "School admin chưa được gán trường.");
        }
        return reportService.getSchoolOverview(admin.getSchool());
    }

    // ==================== STUDENT REPORTS ====================

    /**
     * Lấy báo cáo thống kê học sinh
     * Endpoint: GET /api/reports/students
     */
    @GetMapping("/students")
    public StudentReportDto getStudentReport(@AuthenticationPrincipal UserPrincipal principal) {
        var admin = userLookup.requireById(principal.getId());
        if (admin.getSchool() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "School admin chưa được gán trường.");
        }
        return reportService.getStudentReport(admin.getSchool());
    }

    /**
     * Lấy danh sách học sinh chi tiết theo lớp
     * Endpoint: GET /api/reports/students/by-class/{classId}
     */
    @GetMapping("/students/by-class/{classId}")
    public StudentDetailedListDto getStudentsByClass(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable java.util.UUID classId) {
        var admin = userLookup.requireById(principal.getId());
        if (admin.getSchool() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "School admin chưa được gán trường.");
        }
        return reportService.getStudentsByClass(admin.getSchool(), classId);
    }

    /**
     * Lấy danh sách học sinh chưa có tài khoản
     * Endpoint: GET /api/reports/students/no-account
     */
    @GetMapping("/students/no-account")
    public StudentsWithoutAccountDto getStudentsWithoutAccount(@AuthenticationPrincipal UserPrincipal principal) {
        var admin = userLookup.requireById(principal.getId());
        if (admin.getSchool() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "School admin chưa được gán trường.");
        }
        return reportService.getStudentsWithoutAccount(admin.getSchool());
    }

    /**
     * Lấy xu hướng nhập học theo năm học
     * Endpoint: GET /api/reports/students/enrollment-trend?academicYear=2024-2025
     */
    @GetMapping("/students/enrollment-trend")
    public EnrollmentTrendDto getEnrollmentTrend(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(required = false) UUID academicYearId) {
        var admin = userLookup.requireById(principal.getId());
        if (admin.getSchool() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "School admin chưa được gán trường.");
        }
        return reportService.getEnrollmentTrend(admin.getSchool(), academicYearId);
    }

    // ==================== TEACHER REPORTS ====================

    /**
     * Lấy báo cáo thống kê giáo viên và khối lượng công việc
     * Endpoint: GET /api/reports/teachers
     */
    @GetMapping("/teachers")
    public TeacherReportDto getTeacherReport(@AuthenticationPrincipal UserPrincipal principal) {
        var admin = userLookup.requireById(principal.getId());
        if (admin.getSchool() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "School admin chưa được gán trường.");
        }
        return reportService.getTeacherReport(admin.getSchool());
    }

    // ==================== CLASS REPORTS ====================

    /**
     * Lấy báo cáo thống kê lớp học
     * Endpoint: GET /api/reports/classes
     */
    @GetMapping("/classes")
    public ClassReportDto getClassReport(@AuthenticationPrincipal UserPrincipal principal) {
        var admin = userLookup.requireById(principal.getId());
        if (admin.getSchool() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "School admin chưa được gán trường.");
        }
        return reportService.getClassReport(admin.getSchool());
    }

    // ==================== ATTENDANCE REPORTS ====================

    /**
     * Lấy báo cáo điểm danh tổng hợp
     * Endpoint: GET /api/reports/attendance
     */
    @GetMapping("/attendance")
    public AttendanceReportDto getAttendanceReport(@AuthenticationPrincipal UserPrincipal principal) {
        var admin = userLookup.requireById(principal.getId());
        if (admin.getSchool() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "School admin chưa được gán trường.");
        }
        return reportService.getAttendanceReport(admin.getSchool());
    }

    // ==================== ACADEMIC REPORTS ====================

    /**
     * Lấy báo cáo học tập tổng hợp
     * Endpoint: GET /api/reports/academic?academicYear=2025-2026&semester=1
     */
    @GetMapping("/academic")
    public AcademicReportDto getAcademicReport(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(required = false) UUID academicYearId,
            @RequestParam(defaultValue = "0") int semester) {
        var admin = userLookup.requireById(principal.getId());
        if (admin.getSchool() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "School admin chưa được gán trường.");
        }
        return reportService.getAcademicReport(admin.getSchool(), academicYearId, semester);
    }

    // ==================== TIMETABLE REPORTS ====================

    /**
     * Lấy báo cáo thời khóa biểu
     * Endpoint: GET /api/reports/timetable
     */
    @GetMapping("/timetable")
    public TimetableReportDto getTimetableReport(@AuthenticationPrincipal UserPrincipal principal) {
        var admin = userLookup.requireById(principal.getId());
        if (admin.getSchool() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "School admin chưa được gán trường.");
        }
        return reportService.getTimetableReport(admin.getSchool());
    }
}
