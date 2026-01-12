package com.schoolmanagement.backend.dto.request;

import jakarta.validation.constraints.NotBlank;

public record ResendOtpRequest(
        @NotBlank String challengeId
) {}
