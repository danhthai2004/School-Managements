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
 * API thông báo dành cho Giáo viên — gửi thông báo cho lớp dạy/chủ nhiệm.
 */
@RestController
@RequestMapping("/api/v1/teacher/notifications")
public class TeacherNotificationController {

    private final NotificationService notificationService;
    private final UserRepository userRepository;

    public TeacherNotificationController(NotificationService notificationService,
            UserRepository userRepository) {
        this.notificationService = notificationService;
        this.userRepository = userRepository;
    }

    /**
     * Gửi thông báo cho lớp dạy hoặc chủ nhiệm.
     * Body: { title, content, type=MANUAL, targetGroup=CLASS,
     * referenceId=classRoomId }
     */
    @PostMapping
    public ResponseEntity<NotificationDto> createNotification(
            @Valid @RequestBody CreateNotificationRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        User teacher = getUser(principal);
        NotificationDto dto = notificationService.createTeacherNotification(request, teacher);
        return ResponseEntity.status(HttpStatus.CREATED).body(dto);
    }

    /**
     * Lấy lịch sử thông báo do teacher đã gửi.
     */
    @GetMapping
    public Page<NotificationDto> getMyNotificationHistory(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        User teacher = getUser(principal);
        return notificationService.getTeacherNotificationHistory(teacher, page, size);
    }

    /**
     * Thu hồi thông báo.
     */
    @PatchMapping("/{id}/recall")
    public ResponseEntity<Void> recallNotification(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal) {
        User teacher = getUser(principal);
        notificationService.recallNotification(id, teacher);
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
