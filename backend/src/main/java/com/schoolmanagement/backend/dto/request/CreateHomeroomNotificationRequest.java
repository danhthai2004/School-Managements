package com.schoolmanagement.backend.dto.request;

import com.schoolmanagement.backend.domain.notification.NotificationType;
import com.schoolmanagement.backend.domain.notification.RecipientType;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

public record CreateHomeroomNotificationRequest(
        @NotNull NotificationType notificationType,
        @NotNull RecipientType recipientType,
        @NotBlank String title,
        @NotBlank String content,
        LocalDate scheduledDate,
        LocalTime scheduledTime,
        List<UUID> specificRecipientIds // student IDs when recipientType = SPECIFIC
) {
}
