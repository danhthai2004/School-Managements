package com.schoolmanagement.backend.dto;

import com.schoolmanagement.backend.domain.Role;

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
