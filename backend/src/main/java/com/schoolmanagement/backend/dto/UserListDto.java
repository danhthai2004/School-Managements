package com.schoolmanagement.backend.dto;

import com.schoolmanagement.backend.domain.Role;
import java.time.Instant;
import java.util.UUID;

public record UserListDto(
        UUID id,
        String email,
        String fullName,
        Role role,
        UUID schoolId,
        String schoolCode,
        String schoolName,
        boolean enabled,
        Instant pendingDeleteAt) {
}
