package com.schoolmanagement.backend.controller.exam;

import com.schoolmanagement.backend.service.exam.ExamSessionService;
import com.schoolmanagement.backend.service.exam.ExamAllocationService;
import com.schoolmanagement.backend.service.timetable.ConflictDetectionService;
import com.schoolmanagement.backend.service.classes.RoomService;
import com.schoolmanagement.backend.service.auth.UserLookupService;

import com.schoolmanagement.backend.dto.exam.ExamAllocateRequest;
import com.schoolmanagement.backend.dto.exam.ExamScheduleDetailDto;
import com.schoolmanagement.backend.dto.exam.ExamSessionDto;
import com.schoolmanagement.backend.dto.student.ExamStudentDetailDto;
import com.schoolmanagement.backend.dto.exam.ExamSwapRequest;
import com.schoolmanagement.backend.dto.classes.RoomDto;
import com.schoolmanagement.backend.exception.ApiException;
import com.schoolmanagement.backend.security.UserPrincipal;

import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Controller cho quản lý lịch thi nâng cao (Exam Session + Allocation).
 */
@RestController
@RequestMapping("/api/school/exam-admin")
@RequiredArgsConstructor
public class ExamAdminController {

    private final ExamSessionService examSessionService;
    private final ExamAllocationService allocationService;
    private final ConflictDetectionService conflictService;
    private final RoomService roomService;
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

    // ==================== Available Resources ====================

    @GetMapping("/available-rooms")
    public List<RoomDto> getAvailableRooms(
            @RequestParam LocalDate date,
            @RequestParam LocalTime startTime,
            @RequestParam LocalTime endTime,
            @AuthenticationPrincipal UserPrincipal principal) {

        var school = getSchool(principal);
        List<RoomDto> activeRooms = roomService.getAllActiveRoomsBySchool(school.getId());

        // Lọc phòng không có conflict
        return activeRooms.stream()
                .filter(r -> conflictService.checkRoomConflicts(r.getId(), date, startTime, endTime).isEmpty())
                .toList();
    }

    // ==================== Allocation ====================

    @Transactional
    @PostMapping("/allocate")
    public Map<String, Object> allocateExam(
            @Valid @RequestBody ExamAllocateRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {

        var school = getSchool(principal);
        int count = examSessionService.allocateExam(request, school);
        return Map.of(
                "message", "Phân bổ thành công " + count + " học sinh",
                "allocatedCount", count);
    }

    // ==================== Student Swap ====================

    @Transactional
    @PutMapping("/students/swap")
    public Map<String, String> swapStudents(
            @Valid @RequestBody ExamSwapRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {

        getSchool(principal); // Validate school admin
        allocationService.swapStudents(
                request.getStudentId1(), request.getExamRoomId1(),
                request.getStudentId2(), request.getExamRoomId2());
        return Map.of("message", "Đổi chỗ học sinh thành công");
    }

    // ==================== View Schedule Details ====================

    @GetMapping("/sessions/{id}/schedules")
    public List<ExamScheduleDetailDto> getSessionSchedules(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal) {
        return examSessionService.getSessionSchedules(id, getSchool(principal).getId());
    }

    @GetMapping("/rooms/{roomId}/students")
    public List<ExamStudentDetailDto> getRoomStudents(
            @PathVariable UUID roomId,
            @AuthenticationPrincipal UserPrincipal principal) {
        getSchool(principal); // Validate school admin
        return examSessionService.getRoomStudents(roomId);
    }
}
