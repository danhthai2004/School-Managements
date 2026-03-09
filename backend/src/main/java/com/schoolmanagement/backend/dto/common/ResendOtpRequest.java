package com.schoolmanagement.backend.dto.common;

import jakarta.validation.constraints.NotBlank;

public record ResendOtpRequest(
        @NotBlank String challengeId
) {}
