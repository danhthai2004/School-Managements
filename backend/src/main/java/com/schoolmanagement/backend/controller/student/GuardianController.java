package com.schoolmanagement.backend.controller.student;

import com.schoolmanagement.backend.dto.exam.ExamScheduleDto;

import com.schoolmanagement.backend.domain.entity.auth.User;
import com.schoolmanagement.backend.domain.entity.student.Student;
import com.schoolmanagement.backend.domain.entity.student.Guardian;
import com.schoolmanagement.backend.domain.entity.classes.ClassRoom;

import com.schoolmanagement.backend.service.auth.UserLookupService;
import com.schoolmanagement.backend.service.timetable.TimetableService;
import com.schoolmanagement.backend.service.classes.ClassManagementService;
import com.schoolmanagement.backend.service.student.StudentPortalService;
import com.schoolmanagement.backend.service.student.GuardianService;
import com.schoolmanagement.backend.service.student.StudentManagementService;
import com.schoolmanagement.backend.service.notification.NotificationService;
import com.schoolmanagement.backend.service.admin.SemesterService;

import com.schoolmanagement.backend.domain.auth.Role;

import com.schoolmanagement.backend.dto.timetable.SimpleTimetableDetailDto;
import com.schoolmanagement.backend.dto.timetable.TimetableSlotDto;
import com.schoolmanagement.backend.dto.student.StudentDto;
import com.schoolmanagement.backend.dto.student.GuardianDto;
import com.schoolmanagement.backend.dto.attendance.AttendanceSummaryDto;
import com.schoolmanagement.backend.dto.notification.NotificationPageResponse;
import com.schoolmanagement.backend.repo.student.GuardianRepository;
import com.schoolmanagement.backend.repo.classes.ClassEnrollmentRepository;
import com.schoolmanagement.backend.security.UserPrincipal;

import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/guardian")
@Transactional(readOnly = true)
@RequiredArgsConstructor
public class GuardianController {

    private static final Logger log = LoggerFactory.getLogger(GuardianController.class);

    private final StudentManagementService studentManagementService;
    private final UserLookupService userLookupService;
    private final TimetableService timetableService;
    private final ClassManagementService classManagementService;
    private final StudentPortalService studentPortalService;
    private final GuardianService guardianService;
    private final GuardianRepository guardianRepository;
    private final ClassEnrollmentRepository classEnrollmentRepository;
    private final SemesterService semesterService;
    private final NotificationService notificationService;

    // ====================== INTERNAL HELPER ======================

    /**
     * Resolves the first linked student for the authenticated guardian user.
     * Throws 404 if guardian or student is not found.
     */
    private Student resolveLinkedStudent(UserPrincipal principal) {
        User user = userLookupService.requireById(principal.getId());
        Guardian guardian = guardianRepository.findByUser(user)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Không tìm thấy thông tin phụ huynh"));
        if (guardian.getStudents() == null || guardian.getStudents().isEmpty()) {
            throw new ResponseStatusException(
                    HttpStatus.NOT_FOUND, "Phụ huynh chưa được liên kết với học sinh nào");
        }
        return guardian.getStudents().get(0);
    }

    // ====================== MOBILE ENDPOINTS ======================

    /**
     * [MOBILE] Get basic info about the guardian's linked child.
     * GET /api/guardian/child
     */
    @GetMapping("/child")
    public ResponseEntity<Map<String, Object>> getChildInfo(
            @AuthenticationPrincipal UserPrincipal principal) {
        log.info("[MOBILE] GET /guardian/child");
        Student student = resolveLinkedStudent(principal);

        Map<String, Object> childInfo = new HashMap<>();
        childInfo.put("childId", student.getId().toString());
        childInfo.put("childName", student.getFullName());
        childInfo.put("studentCode", student.getStudentCode() != null ? student.getStudentCode() : "");
        childInfo.put("avatarUrl", student.getAvatarUrl());

        // Attendance stats
        try {
            AttendanceSummaryDto attendance = studentPortalService.getAttendance(
                    student.getId(), null, null);
            childInfo.put("attendanceRate", attendance.getAttendanceRate());
        } catch (Exception e) {
            log.warn("Could not compute attendance for student {}: {}", student.getId(), e.getMessage());
            childInfo.put("attendanceRate", null);
        }

        // Class enrollment
        try {
            com.schoolmanagement.backend.domain.entity.admin.AcademicYear ay =
                    semesterService.getActiveAcademicYear(student.getSchool());
            classEnrollmentRepository
                    .findTopByStudentAndAcademicYearOrderByEnrolledAtDesc(student, ay)
                    .ifPresent(e -> {
                        childInfo.put("className", e.getClassRoom().getName());
                        childInfo.put("classId", e.getClassRoom().getId().toString());
                    });
        } catch (Exception e) {
            log.warn("Could not resolve class for student {}: {}", student.getId(), e.getMessage());
        }
        childInfo.putIfAbsent("className", "");
        childInfo.putIfAbsent("classId", null);

        return ResponseEntity.ok(childInfo);
    }

    /**
     * [MOBILE] Get today's schedule for the guardian's linked child.
     * GET /api/guardian/schedule/today
     */
    @GetMapping("/schedule/today")
    public ResponseEntity<List<TimetableSlotDto>> getTodayScheduleForChild(
            @AuthenticationPrincipal UserPrincipal principal) {
        log.info("[MOBILE] GET /guardian/schedule/today");
        Student student = resolveLinkedStudent(principal);
        if (student.getUser() == null) {
            log.warn("Student {} has no linked user account — returning empty schedule", student.getId());
            return ResponseEntity.ok(List.of());
        }
        List<TimetableSlotDto> slots = studentPortalService.getTodaySchedule(
                student.getUser().getId(), null);
        return ResponseEntity.ok(slots);
    }

    /**
     * [MOBILE] Get weekly timetable for the guardian's linked child.
     * GET /api/guardian/schedule/weekly
     */
    @GetMapping("/schedule/weekly")
    public ResponseEntity<?> getWeeklyScheduleForChild(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(required = false) String semesterId) {
        log.info("[MOBILE] GET /guardian/schedule/weekly");
        Student student = resolveLinkedStudent(principal);
        if (student.getUser() == null) {
            return ResponseEntity.ok(List.of());
        }
        var timetable = studentPortalService.getTimetable(student.getUser().getId(), semesterId);
        return ResponseEntity.ok(timetable);
    }

    /**
     * [MOBILE] Get attendance summary for the guardian's linked child.
     * GET /api/guardian/attendance/summary
     */
    @GetMapping("/attendance/summary")
    public ResponseEntity<AttendanceSummaryDto> getAttendanceSummaryForChild(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(required = false) Integer month,
            @RequestParam(required = false) Integer year) {
        log.info("[MOBILE] GET /guardian/attendance/summary month={}, year={}", month, year);
        Student student = resolveLinkedStudent(principal);
        AttendanceSummaryDto summary = studentPortalService.getAttendance(
                student.getId(), month, year);
        return ResponseEntity.ok(summary);
    }

    /**
     * [MOBILE] Get attendance for a specific date for the guardian's linked child.
     * GET /api/guardian/attendance/daily?date=YYYY-MM-DD
     */
    @GetMapping("/attendance/daily")
    public ResponseEntity<AttendanceSummaryDto> getDailyAttendanceForChild(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(required = false) String date) {
        log.info("[MOBILE] GET /guardian/attendance/daily date={}", date);
        Student student = resolveLinkedStudent(principal);

        // Parse month/year from date string (YYYY-MM-DD)
        Integer month = null;
        Integer year = null;
        if (date != null && date.length() >= 7) {
            try {
                String[] parts = date.split("-");
                year = Integer.parseInt(parts[0]);
                month = Integer.parseInt(parts[1]);
            } catch (Exception ignored) {
                log.warn("Could not parse date: {}", date);
            }
        }
        AttendanceSummaryDto summary = studentPortalService.getAttendance(
                student.getId(), month, year);
        return ResponseEntity.ok(summary);
    }

    /**
     * [MOBILE] Get notifications for the guardian user.
     * GET /api/guardian/notifications
     */
    @GetMapping("/notifications")
    public ResponseEntity<NotificationPageResponse> getNotificationsForGuardian(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        log.info("[MOBILE] GET /guardian/notifications");
        NotificationPageResponse response = notificationService.getUserNotifications(
                principal.getId(), page, size);
        return ResponseEntity.ok(response);
    }

    // ====================== LEGACY / WEB ENDPOINTS ======================

    @GetMapping("/student")
    public StudentDto getStudentData(@AuthenticationPrincipal UserPrincipal principal) {
        log.info("Guardian Controller hit!");
        User user = userLookupService.requireById(principal.getId());
        String guardianEmail = user.getEmail();
        return studentManagementService.getStudentWithGuardian(guardianEmail);
    }

    @GetMapping("/timetable/{studentId}")
    public List<SimpleTimetableDetailDto> getTimetableData(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable("studentId") String studentId) {
        log.info("Timetable data hit!");
        Student student = studentManagementService.getSingleStudent(UUID.fromString(studentId));
        String academicYearName = semesterService.getActiveAcademicYearName(student.getSchool());
        ClassRoom classRoom = classManagementService.getClassRoomLegacy(
                UUID.fromString(studentId), academicYearName, student.getSchool());
        return timetableService.getTimetableDetailsOfStudent(student, classRoom);
    }

    @GetMapping("/exams")
    public ResponseEntity<List<ExamScheduleDto>> getExamSchedule(
            @RequestParam String studentId,
            @RequestParam(required = false) String semesterId) {
        log.info("Exams data hit!");
        List<ExamScheduleDto> exams = studentPortalService.getExamScheduleStudent(
                UUID.fromString(studentId),
                semesterId != null ? UUID.fromString(semesterId) : null);
        return ResponseEntity.ok(exams);
    }

    @GetMapping("/scores")
    public ResponseEntity<List<com.schoolmanagement.backend.dto.grade.ScoreDto>> getScores(
            @RequestParam String studentId,
            @RequestParam(required = false) String semesterId) {
        log.info("Scores data hit for guardian!");
        List<com.schoolmanagement.backend.dto.grade.ScoreDto> scores = studentPortalService.getScores(
                UUID.fromString(studentId), semesterId);
        return ResponseEntity.ok(scores);
    }

    /**
     * [MOBILE] Get score summary for the guardian's linked child.
     * Accepts semester number (1 or 2) — no studentId needed.
     * GET /api/guardian/scores/summary?semester=1
     */
    @GetMapping("/scores/summary")
    public ResponseEntity<java.util.Map<String, Object>> getScoresSummaryForChild(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(required = false) Integer semester) {
        log.info("[MOBILE] GET /guardian/scores/summary semester={}", semester);
        Student student = resolveLinkedStudent(principal);
        List<com.schoolmanagement.backend.dto.grade.ScoreDto> scores =
                studentPortalService.getScores(student.getId(), null);
        java.util.Map<String, Object> summary = buildScoreSummary(scores);
        return ResponseEntity.ok(summary);
    }

    /** Maps List<ScoreDto> → GuardianScoreSummary-shaped map for mobile. */
    private java.util.Map<String, Object> buildScoreSummary(
            List<com.schoolmanagement.backend.dto.grade.ScoreDto> scores) {
        java.util.List<java.util.Map<String, Object>> subjects = new java.util.ArrayList<>();
        double totalAvg = 0;
        int counted = 0;
        for (com.schoolmanagement.backend.dto.grade.ScoreDto s : scores) {
            java.util.List<Double> reg = s.getRegularScores() != null
                    ? s.getRegularScores() : java.util.List.of();
            java.util.List<Double> oral = !reg.isEmpty()
                    ? java.util.List.of(reg.get(0)) : java.util.List.of();
            java.util.List<Double> t15 = reg.size() > 1
                    ? reg.subList(1, Math.min(reg.size(), 3)) : java.util.List.of();
            java.util.List<Double> t45 = reg.size() > 3
                    ? reg.subList(3, reg.size()) : java.util.List.of();
            java.util.Map<String, Object> subj = new java.util.LinkedHashMap<>();
            subj.put("subjectName", s.getSubjectName());
            subj.put("oralScores", oral);
            subj.put("test15MinScores", t15);
            subj.put("test45MinScores", t45);
            subj.put("midTermScore", s.getMidtermScore());
            subj.put("finalTermScore", s.getFinalScore());
            subj.put("averageScore", s.getAverageScore());
            subjects.add(subj);
            if (s.getAverageScore() != null) {
                totalAvg += s.getAverageScore();
                counted++;
            }
        }
        double overall = counted > 0 ? Math.round((totalAvg / counted) * 10.0) / 10.0 : 0;
        String classification = overall >= 8.0 ? "Giỏi"
                : overall >= 6.5 ? "Khá"
                : overall >= 5.0 ? "Trung bình" : "Yếu";
        java.util.Map<String, Object> result = new java.util.LinkedHashMap<>();
        result.put("subjects", subjects);
        result.put("overallAverage", counted > 0 ? overall : null);
        result.put("classification", counted > 0 ? classification : null);
        result.put("totalSubjects", subjects.size());
        return result;
    }

    @GetMapping("/profile")
    public ResponseEntity<GuardianDto> getProfileData(
            @AuthenticationPrincipal UserPrincipal principal) {
        User user = userLookupService.requireById(principal.getId());
        if (user.getRole() != Role.GUARDIAN) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN, "Only guardian role is able to proceed");
        }
        GuardianDto guardianDto = guardianService.findGuardianByUser(user);
        return ResponseEntity.ok(guardianDto);
    }

    @GetMapping("/attendance")
    public ResponseEntity<AttendanceSummaryDto> getAttendance(
            @RequestParam String studentId,
            @RequestParam(required = false) Integer month,
            @RequestParam(required = false) Integer year) {
        log.info("Attendance data hit for guardian!");
        AttendanceSummaryDto attendance = studentPortalService.getAttendance(
                UUID.fromString(studentId), month, year);
        return ResponseEntity.ok(attendance);
    }
}
