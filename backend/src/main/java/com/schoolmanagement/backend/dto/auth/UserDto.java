package com.schoolmanagement.backend.dto.auth;

import com.schoolmanagement.backend.domain.auth.Role;

import java.util.UUID;

public record UserDto(
                UUID id,
                String email,
                String fullName,
                Role role,
                UUID schoolId,
                String schoolCode,
                boolean enabled,
        String phone,
        java.time.LocalDate dateOfBirth,
        String address,
        String bio) {

    public UserDto(UUID id, String email, String fullName, Role role, UUID schoolId, String schoolCode, boolean enabled) {
        this(id, email, fullName, role, schoolId, schoolCode, enabled, null, null, null, null);
    }
}

