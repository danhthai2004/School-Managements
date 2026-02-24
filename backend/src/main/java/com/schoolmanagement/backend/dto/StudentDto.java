package com.schoolmanagement.backend.dto;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record StudentDto(
        UUID id,
        String studentCode,
        String fullName,
        LocalDate dateOfBirth,
        String gender,
        String birthPlace,
        String address,
        String email,
        String phone,
        String avatarUrl,
        String status,
        LocalDate enrollmentDate,
        // Current class info
        String currentClassName,
        UUID currentClassId,
        // Guardians
        List<GuardianDto> guardians) {

    public record GuardianDto(
            UUID id,
            String fullName,
            String phone,
            String email,
            String relationship) {
    }
}
