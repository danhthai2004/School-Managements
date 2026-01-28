package com.schoolmanagement.backend.dto;

import java.time.Instant;
import java.util.UUID;

public record ActivityLogDto(
        UUID id,
        String action,
        String performedByEmail,
        UUID targetUserId,
        String details,
        Instant createdAt) {
}
