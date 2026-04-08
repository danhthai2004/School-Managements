package com.schoolmanagement.backend.dto.notification;

import com.schoolmanagement.backend.domain.notification.NotificationType;
import com.schoolmanagement.backend.domain.notification.TargetGroup;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

public record CreateNotificationRequest(
        @NotBlank String title,
        @NotBlank String content,
        @NotNull NotificationType type,
        @NotNull TargetGroup targetGroup,
        String referenceId, // ClassRoom ID khi targetGroup = CLASS
        String actionUrl    // Route frontend để chuyển hướng khi click
) {
}
