package com.schoolmanagement.backend.dto.notification;

import com.schoolmanagement.backend.domain.notification.NotificationStatus;
import com.schoolmanagement.backend.domain.notification.NotificationType;
import com.schoolmanagement.backend.domain.notification.TargetGroup;

import java.time.Instant;
import java.util.UUID;

public record NotificationDto(
                UUID id,
                String title,
                String content,
                NotificationType type,
                TargetGroup targetGroup,
                String referenceId,
                String actionUrl,
                NotificationStatus status,
                String createdByName,
                Instant createdAt,
                boolean isRead) {
}
