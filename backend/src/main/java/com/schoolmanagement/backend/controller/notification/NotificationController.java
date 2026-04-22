package com.schoolmanagement.backend.controller.notification;

import com.schoolmanagement.backend.domain.entity.auth.User;
import com.schoolmanagement.backend.dto.notification.NotificationDto;
import com.schoolmanagement.backend.dto.notification.CreateNotificationRequest;
import com.schoolmanagement.backend.exception.ApiException;
import com.schoolmanagement.backend.repo.auth.UserRepository;
import com.schoolmanagement.backend.service.notification.NotificationService;
import com.schoolmanagement.backend.security.UserPrincipal;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/system/notifications")
public class NotificationController {

    private final NotificationService notificationService;
    private final UserRepository users;

    public NotificationController(NotificationService notificationService, UserRepository users) {
        this.notificationService = notificationService;
        this.users = users;
    }

    @GetMapping
    public org.springframework.data.domain.Page<NotificationDto> list(@RequestParam(defaultValue = "0") int page,
                                                                      @RequestParam(defaultValue = "20") int size) {
        return notificationService.getAdminNotificationHistory(page, size);
    }

    @PostMapping
    public NotificationDto create(@Valid @RequestBody CreateNotificationRequest req,
            @AuthenticationPrincipal UserPrincipal principal) {
        User user = getCurrentUser(principal);
        return notificationService.createNotification(req, user);
    }

    @PatchMapping("/{id}/recall")
    public void recall(@PathVariable UUID id, @AuthenticationPrincipal UserPrincipal principal) {
        User user = getCurrentUser(principal);
        notificationService.recallNotification(id, user);
    }

    private User getCurrentUser(UserPrincipal principal) {
        if (principal == null || principal.getId() == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "User not authenticated");
        }
        return users.findById(principal.getId())
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "User not found"));
    }
}
