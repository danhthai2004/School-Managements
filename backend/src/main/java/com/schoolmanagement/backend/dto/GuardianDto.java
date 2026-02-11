package com.schoolmanagement.backend.dto;

import java.util.UUID;

public record GuardianDto(
        UUID id,
        String fullName,
        String email,
        String phone,
        String relationship,
        String studentName,
        String studentClass) {
}
