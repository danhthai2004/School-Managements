package com.schoolmanagement.backend.dto.request;

import jakarta.validation.constraints.NotBlank;

public record SetPasswordRequest(
        @NotBlank String resetToken,
        @NotBlank String newPassword
) {}
