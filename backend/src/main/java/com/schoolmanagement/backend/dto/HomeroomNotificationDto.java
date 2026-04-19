package com.schoolmanagement.backend.dto;

import com.schoolmanagement.backend.domain.notification.NotificationType;
import com.schoolmanagement.backend.domain.notification.RecipientType;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

public record HomeroomNotificationDto(
                UUID id,
                String className,
                UUID classRoomId,
                NotificationType notificationType,
                RecipientType recipientType,
                String title,
                String content,
                LocalDate scheduledDate,
                LocalTime scheduledTime,
                String createdByName,
                Instant createdAt,
                int recipientCount,
                int readCount,
                List<RecipientInfo> recipients) {
        public record RecipientInfo(
                        UUID userId,
                        String name,
                        String role,
                        boolean isRead) {
        }
}
