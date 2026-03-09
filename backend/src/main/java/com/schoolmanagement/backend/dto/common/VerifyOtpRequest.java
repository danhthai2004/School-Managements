package com.schoolmanagement.backend.dto.common;

import jakarta.validation.constraints.NotBlank;

public record VerifyOtpRequest(
        @NotBlank String challengeId,
        @NotBlank String code
) {}
