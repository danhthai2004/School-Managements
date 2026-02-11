package com.schoolmanagement.backend.dto;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * Extended student DTO for the detailed profile page.
 * Includes enrollment history across academic years.
 */
public record StudentProfileDto(
        // Basic info
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
        List<GuardianDto> guardians,
        // Enrollment history
        List<ClassEnrollmentHistoryDto> enrollmentHistory) {

    public record GuardianDto(
            UUID id,
            String fullName,
            String phone,
            String email,
            String relationship) {
    }

    public record ClassEnrollmentHistoryDto(
            UUID enrollmentId,
            UUID classId,
            String className,
            String academicYear,
            Instant enrolledAt) {
    }
}
