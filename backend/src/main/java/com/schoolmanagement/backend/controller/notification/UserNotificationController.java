package com.schoolmanagement.backend.controller.notification;

import com.schoolmanagement.backend.dto.notification.DeviceTokenRequest;
import com.schoolmanagement.backend.dto.notification.NotificationPageResponse;
import com.schoolmanagement.backend.security.UserPrincipal;
import com.schoolmanagement.backend.service.notification.NotificationService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * API thông báo dành cho User (Student / Teacher / Guardian).
 */
@RestController
@RequestMapping("/api/v1/notifications")
public class UserNotificationController {

    private final NotificationService notificationService;

    public UserNotificationController(NotificationService notificationService) {
        this.notificationService = notificationService;
    }

    /**
     * Lấy danh sách thông báo (phân trang, mới nhất lên đầu) kèm unreadCount.
     */
    @GetMapping
    public NotificationPageResponse getNotifications(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return notificationService.getUserNotifications(principal.getId(), page, size);
    }

    /**
     * Đánh dấu 1 thông báo đã đọc.
     */
    @PatchMapping("/{id}/read")
    public ResponseEntity<Void> markAsRead(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal) {
        notificationService.markAsRead(id, principal.getId());
        return ResponseEntity.ok().build();
    }

    /**
     * Đánh dấu tất cả thông báo đã đọc.
     */
    @PatchMapping("/read-all")
    public ResponseEntity<Void> markAllAsRead(@AuthenticationPrincipal UserPrincipal principal) {
        notificationService.markAllAsRead(principal.getId());
        return ResponseEntity.ok().build();
    }

    /**
     * Lưu hoặc cập nhật FCM token (gọi sau khi browser cho phép nhận push).
     */
    @PostMapping("/token")
    public ResponseEntity<Void> saveToken(
            @Valid @RequestBody DeviceTokenRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        notificationService.saveDeviceToken(principal.getId(), request);
        return ResponseEntity.ok().build();
    }

    /**
     * Xóa FCM token (gọi khi user Logout để tránh nhận nhầm thông báo).
     */
    @DeleteMapping("/token")
    public ResponseEntity<Void> removeToken(
            @RequestParam String fcmToken) {
        notificationService.removeDeviceToken(fcmToken);
        return ResponseEntity.ok().build();
    }
}
