package com.schoolmanagement.backend.dto;

import com.schoolmanagement.backend.domain.NotificationScope;
import com.schoolmanagement.backend.domain.Role;
import java.time.Instant;
import java.util.UUID;

public record NotificationDto(
        UUID id,
        String title,
        String message,
        NotificationScope scope,
        UUID targetSchoolId,
        String targetSchoolName,
        Role targetRole,
        String createdByEmail,
        Instant createdAt) {
}
