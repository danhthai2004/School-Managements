package com.schoolmanagement.backend.dto.common;

import jakarta.validation.constraints.NotBlank;

public record SetPasswordRequest(
        @NotBlank String resetToken,
        @NotBlank String newPassword
) {}
