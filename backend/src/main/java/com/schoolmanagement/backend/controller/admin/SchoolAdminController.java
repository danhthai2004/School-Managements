package com.schoolmanagement.backend.controller.admin;

import com.schoolmanagement.backend.domain.auth.Role;
import com.schoolmanagement.backend.dto.auth.UserListDto;
import com.schoolmanagement.backend.dto.admin.BulkImportResponse;
import com.schoolmanagement.backend.dto.admin.SchoolStatsDto;
import com.schoolmanagement.backend.dto.auth.UserDto;
import com.schoolmanagement.backend.dto.auth.CreateUserRequest;
import com.schoolmanagement.backend.exception.ApiException;
import com.schoolmanagement.backend.security.UserPrincipal;
import com.schoolmanagement.backend.service.admin.SchoolAdminService;
import com.schoolmanagement.backend.service.auth.UserLookupService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/school")
@Transactional(readOnly = true)
@lombok.extern.slf4j.Slf4j
public class SchoolAdminController {

    private final SchoolAdminService schoolAdminService;
    private final UserLookupService userLookup;
    private final com.schoolmanagement.backend.service.student.StudentAccountService studentAccountService;
    private final com.schoolmanagement.backend.service.notification.NotificationService notificationService;
    private final com.schoolmanagement.backend.service.attendance.AttendanceService attendanceService;
    private final com.schoolmanagement.backend.service.attendance.FaceAttendanceService faceAttendanceService;

    public SchoolAdminController(SchoolAdminService schoolAdminService,
            UserLookupService userLookup,
            com.schoolmanagement.backend.service.student.StudentAccountService studentAccountService,
            com.schoolmanagement.backend.service.notification.NotificationService notificationService,
            com.schoolmanagement.backend.service.attendance.AttendanceService attendanceService,
            com.schoolmanagement.backend.service.attendance.FaceAttendanceService faceAttendanceService) {
        this.schoolAdminService = schoolAdminService;
        this.userLookup = userLookup;
        this.studentAccountService = studentAccountService;
        this.notificationService = notificationService;
        this.attendanceService = attendanceService;
        this.faceAttendanceService = faceAttendanceService;
    }

    // ==================== STATISTICS ====================

    @GetMapping("/stats")
    public SchoolStatsDto getStats(@AuthenticationPrincipal UserPrincipal principal) {
        var admin = userLookup.requireById(principal.getId());
        if (admin.getSchool() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "School admin chưa được gán trường.");
        }
        return schoolAdminService.getSchoolStats(admin.getSchool());
    }

    // ==================== USER MANAGEMENT ====================

    @Transactional
    @PostMapping("/users")
    public UserDto createUser(@AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody CreateUserRequest req) {

        var admin = userLookup.requireById(principal.getId());
        if (admin.getSchool() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "School admin chưa được gán trường.");
        }

        Role role = req.role();
        if (role == null || role == Role.SCHOOL_ADMIN || role == Role.SYSTEM_ADMIN) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Role không hợp lệ.");
        }

        return schoolAdminService.createUserForSchool(admin.getSchool(), req.email(), req.fullName(), role);
    }

    @GetMapping("/users")
    public org.springframework.data.domain.Page<UserDto> listUsers(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        var admin = userLookup.requireById(principal.getId());
        if (admin.getSchool() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "School admin chưa được gán trường.");
        }
        return schoolAdminService.listUsersInSchool(admin.getSchool(),
                org.springframework.data.domain.PageRequest.of(page, size));
    }

    @GetMapping("/teachers")
    public org.springframework.data.domain.Page<UserDto> listTeachers(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        var admin = userLookup.requireById(principal.getId());
        if (admin.getSchool() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "School admin chưa được gán trường.");
        }
        return schoolAdminService.listTeachersInSchool(admin.getSchool(),
                org.springframework.data.domain.PageRequest.of(page, size));
    }

    /**
     * CSV header: email, fullName (optional), role (optional)
     */
    @Transactional
    @PostMapping("/users/import")
    public BulkImportResponse importUsers(@AuthenticationPrincipal UserPrincipal principal,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "defaultRole", required = false, defaultValue = "STUDENT") String defaultRole) {
        var admin = userLookup.requireById(principal.getId());
        if (admin.getSchool() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "School admin chưa được gán trường.");
        }
        Role role;
        try {
            role = Role.valueOf(defaultRole.trim().toUpperCase());
        } catch (Exception e) {
            role = Role.STUDENT;
        }
        if (role == Role.SCHOOL_ADMIN || role == Role.SYSTEM_ADMIN) {
            role = Role.STUDENT;
        }
        return schoolAdminService.importCsv(admin.getSchool(), file, role);
    }

    @Transactional
    @PostMapping("/users/{id}/reset-password")
    public void resetPassword(@AuthenticationPrincipal UserPrincipal principal,
            @PathVariable("id") UUID userId) {
        if (principal.getId().equals(userId)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Không thể đặt lại mật khẩu cho chính mình.");
        }
        var admin = userLookup.requireById(principal.getId());
        if (admin.getSchool() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "School admin chưa được gán trường.");
        }
        schoolAdminService.resetPassword(admin.getSchool(), userId);
    }

    @Transactional
    @PutMapping("/users/{id}/status")
    public void updateUserStatus(@AuthenticationPrincipal UserPrincipal principal,
            @PathVariable("id") UUID userId,
            @RequestParam boolean enabled) {
        if (principal.getId().equals(userId)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Không thể thay đổi trạng thái tài khoản của chính mình.");
        }
        var admin = userLookup.requireById(principal.getId());
        if (admin.getSchool() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "School admin chưa được gán trường.");
        }
        schoolAdminService.toggleUserStatus(admin.getSchool(), userId, enabled);
    }

    @Transactional
    @DeleteMapping("/students/{id}/account")
    public void deleteStudentAccount(@AuthenticationPrincipal UserPrincipal principal,
            @PathVariable("id") UUID studentId) {
        var admin = userLookup.requireById(principal.getId());
        if (admin.getSchool() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "School admin chưa được gán trường.");
        }
        studentAccountService.deleteAccountForStudent(admin.getSchool(), studentId);
    }

    // ==================== NOTIFICATION MANAGEMENT ====================

    /**
     * Lấy danh sách thông báo cá nhân cho School Admin (phân trang, kèm
     * unreadCount).
     */
    @GetMapping("/notifications")
    public com.schoolmanagement.backend.dto.notification.NotificationPageResponse getNotifications(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        log.info("[Notification] GET /notifications - User: {}, Role: {}", principal.getEmail(), principal.getRole());
        return notificationService.getUserNotifications(principal.getId(), page, size);
    }

    /**
     * Xem lịch sử tất cả thông báo đã phát (Admin view).
     */
    @GetMapping("/notifications/history")
    public org.springframework.data.domain.Page<com.schoolmanagement.backend.dto.notification.NotificationDto> getNotificationHistory(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        log.info("[Notification] GET /notifications/history - User: {}", principal.getEmail());
        return notificationService.getAdminNotificationHistory(page, size);
    }

    /**
     * Tạo thông báo thủ công và phát cho nhóm đối tượng.
     */
    @Transactional
    @PostMapping("/notifications")
    public com.schoolmanagement.backend.dto.notification.NotificationDto createNotification(
            @Valid @RequestBody com.schoolmanagement.backend.dto.notification.CreateNotificationRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        log.info("[Notification] POST /notifications - User: {}, Title: {}", principal.getEmail(), request.title());
        var admin = userLookup.requireById(principal.getId());
        return notificationService.createNotification(request, admin);
    }

    /**
     * Thu hồi thông báo (Soft delete → RECALLED).
     */
    @Transactional
    @PatchMapping("/notifications/{id}/recall")
    public void recallNotification(@PathVariable UUID id, @AuthenticationPrincipal UserPrincipal principal) {
        log.info("[Notification] PATCH /notifications/{}/recall - User: {}", id, principal.getEmail());
        var admin = userLookup.requireById(principal.getId());
        notificationService.recallNotification(id, admin);
    }

    /**
     * Đánh dấu tất cả đã đọc cho Admin.
     */
    @Transactional
    @PatchMapping("/notifications/read-all")
    public void markAllAsRead(@AuthenticationPrincipal UserPrincipal principal) {
        notificationService.markAllAsRead(principal.getId());
    }

    // ==================== USER LIFECYCLE MANAGEMENT ====================

    @GetMapping("/users/manage")
    public List<UserListDto> listUsersWithStatus(
            @AuthenticationPrincipal UserPrincipal principal) {
        var admin = userLookup.requireById(principal.getId());
        if (admin.getSchool() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "School admin chưa được gán trường.");
        }
        return schoolAdminService.listUsersWithStatus(admin.getSchool());
    }

    @GetMapping("/users/pending")
    public List<UserListDto> listPendingDeleteUsers(
            @AuthenticationPrincipal UserPrincipal principal) {
        var admin = userLookup.requireById(principal.getId());
        if (admin.getSchool() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "School admin chưa được gán trường.");
        }
        return schoolAdminService.listPendingDeleteUsersInSchool(admin.getSchool());
    }

    @Transactional
    @PutMapping("/users/{id}/enable")
    public void enableUser(@AuthenticationPrincipal UserPrincipal principal,
            @PathVariable("id") UUID userId) {
        var admin = userLookup.requireById(principal.getId());
        if (admin.getSchool() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "School admin chưa được gán trường.");
        }
        schoolAdminService.enableUser(admin.getSchool(), userId, admin);
    }

    @Transactional
    @PutMapping("/users/{id}/disable")
    public void disableUser(@AuthenticationPrincipal UserPrincipal principal,
            @PathVariable("id") UUID userId) {
        var admin = userLookup.requireById(principal.getId());
        if (admin.getSchool() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "School admin chưa được gán trường.");
        }
        schoolAdminService.disableUser(admin.getSchool(), userId, admin);
    }

    @Transactional
    @DeleteMapping("/users/{id}")
    public void markPendingDeleteUser(@AuthenticationPrincipal UserPrincipal principal,
            @PathVariable("id") UUID userId) {
        var admin = userLookup.requireById(principal.getId());
        if (admin.getSchool() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "School admin chưa được gán trường.");
        }
        schoolAdminService.markPendingDelete(admin.getSchool(), userId, admin);
    }

    @Transactional
    @PutMapping("/users/{id}/restore")
    public void restoreUser(@AuthenticationPrincipal UserPrincipal principal,
            @PathVariable("id") UUID userId) {
        var admin = userLookup.requireById(principal.getId());
        if (admin.getSchool() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "School admin chưa được gán trường.");
        }
        schoolAdminService.restoreUser(admin.getSchool(), userId, admin);
    }

    @Transactional
    @DeleteMapping("/users/{id}/permanent")
    public void permanentDeleteUser(@AuthenticationPrincipal UserPrincipal principal,
            @PathVariable("id") UUID userId) {
        var admin = userLookup.requireById(principal.getId());
        if (admin.getSchool() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "School admin chưa được gán trường.");
        }
        schoolAdminService.permanentDeleteUser(admin.getSchool(), userId, admin);
    }

    // ==================== ATTENDANCE MANAGEMENT ====================

    /**
     * Get attendance for a specific class/slot (Admin - bypasses date/slot locks)
     */
    @GetMapping("/attendance/slot")
    public java.util.List<com.schoolmanagement.backend.dto.attendance.AttendanceDto> getAttendanceForSlot(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam UUID classRoomId,
            @RequestParam String date,
            @RequestParam int slotIndex) {
        var admin = userLookup.requireById(principal.getId());
        if (admin.getSchool() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "School admin chưa được gán trường.");
        }
        return attendanceService.getAttendanceForSlotAsAdmin(
                admin.getSchool(),
                classRoomId,
                java.time.LocalDate.parse(date),
                slotIndex);
    }

    /**
     * Save attendance (Admin - bypasses date/slot locks, can edit past days)
     */
    @Transactional
    @PostMapping("/attendance/slot")
    public ResponseEntity<com.schoolmanagement.backend.dto.attendance.SaveAttendanceResultDto> saveAttendance(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam UUID classRoomId,
            @RequestBody com.schoolmanagement.backend.dto.attendance.SaveAttendanceRequest request) {
        var admin = userLookup.requireById(principal.getId());
        if (admin.getSchool() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "School admin chưa được gán trường.");
        }
        return ResponseEntity.ok(attendanceService.saveAttendanceAsAdmin(admin.getSchool(), classRoomId, request));
    }

    /**
     * Get timetable slots for a class on a specific date (Admin)
     */
    @GetMapping("/attendance/slots")
    public java.util.List<AdminSlotDto> getClassSlots(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam UUID classRoomId,
            @RequestParam String date) {
        var admin = userLookup.requireById(principal.getId());
        if (admin.getSchool() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "School admin chưa được gán trường.");
        }
        var details = attendanceService.getTimetableSlotsForClassOnDate(
                admin.getSchool(), classRoomId, java.time.LocalDate.parse(date));
        return details.stream()
                .map(d -> new AdminSlotDto(
                        d.getSlotIndex(),
                        d.getSubject() != null ? d.getSubject().getName() : "",
                        d.getTeacher() != null ? d.getTeacher().getFullName() : ""))
                .sorted(java.util.Comparator.comparingInt(AdminSlotDto::slotIndex))
                .toList();
    }

    public record AdminSlotDto(int slotIndex, String subjectName, String teacherName) {
    }

    // ==================== FACE REGISTRATION MANAGEMENT ====================

    /**
     * Register a student's face. Upload one image at a time.
     * School admin manages face data for all students in their school.
     */
    @Transactional
    @PostMapping(value = "/face/register", consumes = org.springframework.http.MediaType.MULTIPART_FORM_DATA_VALUE)
    public java.util.Map<String, Object> registerFace(
            @AuthenticationPrincipal com.schoolmanagement.backend.security.UserPrincipal principal,
            @RequestParam String studentId,
            @RequestParam(defaultValue = "") String studentCode,
            @RequestParam(defaultValue = "") String studentName,
            @RequestPart MultipartFile file) {
        var admin = userLookup.requireById(principal.getId());
        if (admin.getSchool() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "School admin chưa được gán trường.");
        }
        return faceAttendanceService.registerFace(
                admin.getEmail(), studentId, studentCode, studentName, file);
    }

    /**
     * Get face registration status for all students in a class.
     */
    @GetMapping("/face/class-status")
    public com.schoolmanagement.backend.dto.teacher.FaceRegistrationStatusResponse getClassFaceStatus(
            @AuthenticationPrincipal com.schoolmanagement.backend.security.UserPrincipal principal,
            @RequestParam String classId) {
        var admin = userLookup.requireById(principal.getId());
        if (admin.getSchool() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "School admin chưa được gán trường.");
        }
        return faceAttendanceService.getClassRegistrationStatus(admin.getEmail(), classId);
    }

    /**
     * Delete all face data for a specific student.
     */
    @Transactional
    @DeleteMapping("/face/{studentId}")
    public void deleteStudentFace(
            @AuthenticationPrincipal com.schoolmanagement.backend.security.UserPrincipal principal,
            @PathVariable String studentId) {
        var admin = userLookup.requireById(principal.getId());
        if (admin.getSchool() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "School admin chưa được gán trường.");
        }
        faceAttendanceService.deleteStudentFaceData(studentId);
    }

}
