package com.schoolmanagement.backend.dto.request;

import com.schoolmanagement.backend.domain.Role;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record CreateUserRequest(
        @Email @NotBlank String email,
        @NotBlank String fullName,
        @NotNull Role role,
        UUID schoolId
) {}
