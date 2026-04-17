package com.schoolmanagement.backend.dto.request.auth;

import java.time.LocalDate;

public record UpdateProfileRequest(
        String fullName,
        String phone,
        LocalDate dateOfBirth,
        String address,
        String bio
) {}
