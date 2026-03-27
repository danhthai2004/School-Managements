package com.schoolmanagement.backend.dto.student;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import lombok.Builder;

/**
 * Extended student DTO for the detailed profile page.
 * Includes enrollment history across academic years.
 */
@Builder
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
                GuardianDto guardian,
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
