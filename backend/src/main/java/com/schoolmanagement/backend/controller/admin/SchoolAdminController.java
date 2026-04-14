package com.schoolmanagement.backend.controller.admin;

import com.schoolmanagement.backend.domain.auth.Role;
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

    public SchoolAdminController(SchoolAdminService schoolAdminService,
            UserLookupService userLookup,
            com.schoolmanagement.backend.service.student.StudentAccountService studentAccountService,
            com.schoolmanagement.backend.service.notification.NotificationService notificationService) {
        this.schoolAdminService = schoolAdminService;
        this.userLookup = userLookup;
        this.studentAccountService = studentAccountService;
        this.notificationService = notificationService;
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
    public List<UserDto> listUsers(@AuthenticationPrincipal UserPrincipal principal) {
        var admin = userLookup.requireById(principal.getId());
        if (admin.getSchool() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "School admin chưa được gán trường.");
        }
        return schoolAdminService.listUsersInSchool(admin.getSchool());
    }

    @GetMapping("/teachers")
    public List<UserDto> listTeachers(@AuthenticationPrincipal UserPrincipal principal) {
        var admin = userLookup.requireById(principal.getId());
        if (admin.getSchool() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "School admin chưa được gán trường.");
        }
        return schoolAdminService.listTeachersInSchool(admin.getSchool());
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

    @Transactional
    @DeleteMapping("/users/{id}")
    public void deleteUser(@AuthenticationPrincipal UserPrincipal principal,
            @PathVariable("id") UUID userId) {
        if (principal.getId().equals(userId)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Không thể xóa tài khoản của chính mình.");
        }
        var admin = userLookup.requireById(principal.getId());
        if (admin.getSchool() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "School admin chưa được gán trường.");
        }
        schoolAdminService.deleteUser(admin.getSchool(), userId);
    }

    // ==================== NOTIFICATION MANAGEMENT ====================

    /**
     * Lấy danh sách thông báo cá nhân cho School Admin (phân trang, kèm unreadCount).
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
}
