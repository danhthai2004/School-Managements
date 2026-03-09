package com.schoolmanagement.backend.dto.auth;

import jakarta.validation.constraints.NotBlank;

public record GoogleLoginRequest(
        @NotBlank String idToken
) {}
