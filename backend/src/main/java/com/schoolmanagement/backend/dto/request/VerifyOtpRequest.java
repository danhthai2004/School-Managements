package com.schoolmanagement.backend.dto.request;

import jakarta.validation.constraints.NotBlank;

public record VerifyOtpRequest(
        @NotBlank String challengeId,
        @NotBlank String code
) {}
