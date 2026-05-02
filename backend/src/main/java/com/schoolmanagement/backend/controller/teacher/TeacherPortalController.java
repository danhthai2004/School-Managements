package com.schoolmanagement.backend.controller.teacher;

import com.schoolmanagement.backend.dto.HomeroomNotificationDto;
import com.schoolmanagement.backend.dto.attendance.*;
import com.schoolmanagement.backend.dto.common.*;
import com.schoolmanagement.backend.dto.exam.ExamScheduleDto;
import com.schoolmanagement.backend.dto.request.CreateHomeroomNotificationRequest;
import com.schoolmanagement.backend.dto.student.HomeroomStudentDto;
import com.schoolmanagement.backend.dto.student.StudentRiskAnalysisDto;
import com.schoolmanagement.backend.dto.student.StudentProfileDto;
import com.schoolmanagement.backend.dto.grade.ScoreDto;
import com.schoolmanagement.backend.dto.teacher.TeacherDashboardStatsDto;
import com.schoolmanagement.backend.dto.teacher.TeacherProfileDto;

import com.schoolmanagement.backend.service.teacher.HomeroomStudentExportService;
import com.schoolmanagement.backend.dto.teacher.ClassSeatMapDto;
import com.schoolmanagement.backend.dto.teacher.SaveClassSeatMapRequest;
import com.schoolmanagement.backend.service.ClassSeatMapService;
import com.schoolmanagement.backend.service.HomeroomNotificationService;
import com.schoolmanagement.backend.service.teacher.TeacherPortalService;
import com.schoolmanagement.backend.service.FacePhotoStorageService;
import com.schoolmanagement.backend.service.auth.UserLookupService;
import com.schoolmanagement.backend.security.UserPrincipal;
import com.schoolmanagement.backend.domain.entity.student.Student;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.Workbook;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

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
    private final HomeroomNotificationService homeroomNotificationService;
    private final ClassSeatMapService classSeatMapService;
    private final FacePhotoStorageService facePhotoStorageService;
    private final UserLookupService userLookup;

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
        List<HomeroomStudentDto> students = teacherPortalService.getHomeroomStudents(userDetails.getUsername(), null);
        return ResponseEntity.ok(students);
    }

    @GetMapping("/homeroom/students/{classId}")
    public ResponseEntity<List<HomeroomStudentDto>> getStudentsByClass(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable UUID classId) {
        List<HomeroomStudentDto> students = teacherPortalService.getHomeroomStudents(userDetails.getUsername(),
                classId);
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
    public ResponseEntity<SaveAttendanceResultDto> saveAttendance(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestBody SaveAttendanceRequest request) {
        SaveAttendanceResultDto result = attendanceService.saveAttendance(userDetails.getUsername(), request);
        return ResponseEntity.ok(result);
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

    /**
     * Lightweight slot status for subject teachers (non-homeroom).
     * Used by mobile app to show "Đã/Chưa điểm danh" per period.
     */
    @GetMapping("/attendance/daily-slot-status")
    public ResponseEntity<TeacherDailySlotStatusDto> getDailySlotStatus(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam String date) {
        TeacherDailySlotStatusDto dto = attendanceService.getTeacherDailySlotStatus(
                userDetails.getUsername(),
                java.time.LocalDate.parse(date));
        return ResponseEntity.ok(dto);
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

    // ========================= HOMEROOM NOTIFICATIONS =========================

    /**
     * Create a notification for the homeroom class.
     */
    @PostMapping("/notifications")
    public ResponseEntity<HomeroomNotificationDto> createNotification(
            @AuthenticationPrincipal UserDetails userDetails,
            @Valid @RequestBody CreateHomeroomNotificationRequest request) {
        HomeroomNotificationDto dto = homeroomNotificationService.create(request, userDetails.getUsername());
        return ResponseEntity.ok(dto);
    }

    /**
     * List notifications created by the current teacher.
     */
    @GetMapping("/notifications")
    public ResponseEntity<List<HomeroomNotificationDto>> listNotifications(
            @AuthenticationPrincipal UserDetails userDetails) {
        return ResponseEntity.ok(homeroomNotificationService.listByTeacher(userDetails.getUsername()));
    }

    /**
     * Delete a notification created by the current teacher.
     */
    @DeleteMapping("/notifications/{id}")
    public ResponseEntity<Void> deleteNotification(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable UUID id) {
        homeroomNotificationService.delete(id, userDetails.getUsername());
        return ResponseEntity.ok().build();
    }

    // ========================= CLASS SEAT MAP =========================

    /**
     * Get seating chart for a class (any teacher can view)
     */
    @GetMapping("/class-map/{classId}")
    public ResponseEntity<ClassSeatMapDto> getClassSeatMap(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable UUID classId) {
        return ResponseEntity.ok(classSeatMapService.getClassSeatMap(userDetails.getUsername(), classId));
    }

    /**
     * Save seating chart for a class (GVCN only)
     */
    @PostMapping("/class-map/{classId}")
    public ResponseEntity<ClassSeatMapDto> saveClassSeatMap(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable UUID classId,
            @Valid @RequestBody SaveClassSeatMapRequest request) {
        return ResponseEntity.ok(classSeatMapService.saveClassSeatMap(userDetails.getUsername(), classId, request));
    }

    /**
     * Delete/reset seating chart for a class (GVCN only)
     */
    @DeleteMapping("/class-map/{classId}")
    public ResponseEntity<Void> deleteClassSeatMap(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable UUID classId) {
        classSeatMapService.deleteClassSeatMap(userDetails.getUsername(), classId);
        return ResponseEntity.ok().build();
    }

    // ========================= HOMEROOM FACE DATA MANAGEMENT =========================

    /**
     * Get face registration status for all students in homeroom class.
     */
    @GetMapping("/homeroom/face-status")
    public ResponseEntity<com.schoolmanagement.backend.dto.teacher.FaceRegistrationStatusResponse> getHomeroomFaceStatus(
            @AuthenticationPrincipal UserPrincipal principal) {
        String classId = teacherPortalService.getHomeroomClassId(principal.getUsername());
        var teacherUser = userLookup.requireById(principal.getId());

        var detail = facePhotoStorageService.getClassDetail(teacherUser.getSchool(), UUID.fromString(classId));
        var dtoStudents = detail.students().stream().map(s ->
            new com.schoolmanagement.backend.dto.teacher.FaceRegistrationStatusResponse.FaceRegistrationStatusDto(
                s.studentId(), s.studentCode(), s.studentName(), s.avatarUrl(),
                s.isRegistered(), s.imageCount(), s.lastUpdated()
            )
        ).toList();

        var response = new com.schoolmanagement.backend.dto.teacher.FaceRegistrationStatusResponse(
            dtoStudents, detail.totalStudents(), detail.totalRegistered(), detail.totalUnregistered()
        );
        return ResponseEntity.ok(response);
    }

    /**
     * Register face data for a student in homeroom class (supports batch upload).
     */
    @PostMapping(value = "/homeroom/face-register", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, Object>> registerHomeroomStudentFace(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam String studentId,
            @RequestPart List<MultipartFile> files) {

        teacherPortalService.verifyStudentInHomeroom(userDetails.getUsername(), UUID.fromString(studentId));
        Student student = teacherPortalService.getStudentById(UUID.fromString(studentId));

        List<Map<String, Object>> results = new ArrayList<>();
        int successCount = 0;
        int failCount = 0;

        for (MultipartFile file : files) {
            try {
                var res = facePhotoStorageService.uploadFacePhoto(student.getSchool(), student.getId(), file);
                results.add(Map.of(
                        "success", res.success(),
                        "message", res.message(),
                        "fileName", file.getOriginalFilename() != null ? file.getOriginalFilename() : "unknown"
                ));
                if (res.success()) successCount++;
                else failCount++;
            } catch (Exception e) {
                failCount++;
                results.add(Map.of(
                        "success", false,
                        "fileName", file.getOriginalFilename() != null ? file.getOriginalFilename() : "unknown",
                        "error", e.getMessage()));
            }
        }

        return ResponseEntity.ok(Map.of(
                "totalFiles", files.size(),
                "successCount", successCount,
                "failCount", failCount,
                "details", results));
    }

    /**
     * Delete/reset all face data for a student in homeroom class.
     */
    @DeleteMapping("/homeroom/face/{studentId}")
    public ResponseEntity<Void> resetHomeroomStudentFace(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable UUID studentId) {
        teacherPortalService.verifyStudentInHomeroom(userDetails.getUsername(), studentId);
        Student student = teacherPortalService.getStudentById(studentId);
        facePhotoStorageService.deleteAllStudentPhotos(student.getSchool(), studentId);
        return ResponseEntity.ok().build();
    }

    /**
     * Get all face photos for a student in homeroom class.
     */
    @GetMapping("/homeroom/face/{studentId}/photos")
    public ResponseEntity<FacePhotoStorageService.StudentPhotosDto> getHomeroomStudentPhotos(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable UUID studentId) {
        teacherPortalService.verifyStudentInHomeroom(userDetails.getUsername(), studentId);
        Student student = teacherPortalService.getStudentById(studentId);
        return ResponseEntity.ok(facePhotoStorageService.getStudentPhotos(student.getSchool(), studentId));
    }

    /**
     * Delete a specific face photo/embedding for a student in homeroom class.
     */
    @DeleteMapping("/homeroom/face/{studentId}/photos/{embeddingId}")
    public ResponseEntity<Void> deleteHomeroomStudentPhoto(
            @AuthenticationPrincipal UserDetails userDetails,
            @PathVariable UUID studentId,
            @PathVariable int embeddingId) {
        teacherPortalService.verifyStudentInHomeroom(userDetails.getUsername(), studentId);
        Student student = teacherPortalService.getStudentById(studentId);
        facePhotoStorageService.deleteFacePhoto(student.getSchool(), studentId, embeddingId);
        return ResponseEntity.ok().build();
    }
}
