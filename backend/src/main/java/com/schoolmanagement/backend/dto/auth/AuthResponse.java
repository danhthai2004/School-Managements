package com.schoolmanagement.backend.dto.auth;

public record AuthResponse(
        String status,
        String token,
        UserDto user,
        String challengeId,
        String emailMasked,
        String message
) {}
