package com.schoolmanagement.backend.dto.student;

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
        // Account status
        boolean hasAccount,
        // Guardians
        StudentGuardianDto guardian) {
}
