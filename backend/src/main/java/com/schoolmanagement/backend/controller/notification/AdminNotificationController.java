package com.schoolmanagement.backend.controller.notification;

import com.schoolmanagement.backend.domain.entity.auth.User;
import com.schoolmanagement.backend.dto.notification.CreateNotificationRequest;
import com.schoolmanagement.backend.dto.notification.NotificationDto;
import com.schoolmanagement.backend.exception.ApiException;
import com.schoolmanagement.backend.repo.auth.UserRepository;
import com.schoolmanagement.backend.security.UserPrincipal;
import com.schoolmanagement.backend.service.notification.NotificationService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

/**
 * API thông báo dành cho Ban giám hiệu (School Admin).
 */
@RestController
@RequestMapping("/api/v1/admin/notifications")
public class AdminNotificationController {

    private final NotificationService notificationService;
    private final UserRepository userRepository;

    public AdminNotificationController(NotificationService notificationService,
                                       UserRepository userRepository) {
        this.notificationService = notificationService;
        this.userRepository = userRepository;
    }

    /**
     * Tạo và phát thông báo thủ công.
     */
    @PostMapping
    public ResponseEntity<NotificationDto> createNotification(
            @Valid @RequestBody CreateNotificationRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        User admin = getUser(principal);
        NotificationDto dto = notificationService.createNotification(request, admin);
        return ResponseEntity.status(HttpStatus.CREATED).body(dto);
    }

    /**
     * Xem lịch sử các thông báo đã phát.
     */
    @GetMapping
    public Page<NotificationDto> getNotificationHistory(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return notificationService.getAdminNotificationHistory(null, null, null, null, page, size);
    }

    /**
     * Thu hồi thông báo gửi nhầm (Soft delete → RECALLED).
     */
    @PatchMapping("/{id}/recall")
    public ResponseEntity<Void> recallNotification(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal) {
        User admin = getUser(principal);
        notificationService.recallNotification(id, admin);
        return ResponseEntity.ok().build();
    }

    private User getUser(UserPrincipal principal) {
        if (principal == null || principal.getId() == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "User not authenticated");
        }
        return userRepository.findById(principal.getId())
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "User not found"));
    }
}
