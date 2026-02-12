package com.schoolmanagement.backend.dto;

import java.util.UUID;

public record StudentGuardianDto(
        UUID id,
        String fullName,
        String phone,
        String email,
        String relationship) {
}
