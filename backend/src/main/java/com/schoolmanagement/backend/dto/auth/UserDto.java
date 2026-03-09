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
                boolean enabled) {
}
