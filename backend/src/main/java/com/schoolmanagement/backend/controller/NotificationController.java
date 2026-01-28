package com.schoolmanagement.backend.controller;

import com.schoolmanagement.backend.domain.entity.User;
import com.schoolmanagement.backend.dto.NotificationDto;
import com.schoolmanagement.backend.dto.request.CreateNotificationRequest;
import com.schoolmanagement.backend.exception.ApiException;
import com.schoolmanagement.backend.repo.UserRepository;
import com.schoolmanagement.backend.service.NotificationService;
import com.schoolmanagement.backend.security.UserPrincipal;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
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
    public List<NotificationDto> list() {
        return notificationService.list();
    }

    @PostMapping
    public NotificationDto create(@Valid @RequestBody CreateNotificationRequest req,
            @AuthenticationPrincipal UserPrincipal principal) {
        User user = getCurrentUser(principal);
        return notificationService.create(req, user);
    }

    @DeleteMapping("/{id}")
    public void delete(@PathVariable UUID id, @AuthenticationPrincipal UserPrincipal principal) {
        User user = getCurrentUser(principal);
        notificationService.delete(id, user);
    }

    private User getCurrentUser(UserPrincipal principal) {
        if (principal == null || principal.getId() == null) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "User not authenticated");
        }
        return users.findById(principal.getId())
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "User not found"));
    }
}
