package com.schoolmanagement.backend.dto.report;

import com.schoolmanagement.backend.domain.student.Gender;
import com.schoolmanagement.backend.domain.student.StudentStatus;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

/**
 * DTO cho báo cáo học sinh
 */
public record StudentReportDto(
        long totalStudents,
        long activeStudents,
        long inactiveStudents,
        long studentsWithAccount,
        long studentsWithoutAccount,
        List<StudentByClassDto> studentsByClass,
        List<EnrollmentStatDto> enrollmentStats,
        GenderStats genderStats) {
    public record StudentByClassDto(
            UUID classId,
            String className,
            int grade,
            long studentCount,
            long capacity) {
    }

    public record EnrollmentStatDto(
            int year,
            int month,
            long newEnrollments) {
    }

    public record GenderStats(
            long male,
            long female,
            long other) {
    }

    public record StudentDetailDto(
            UUID id,
            String studentCode,
            String fullName,
            LocalDate dateOfBirth,
            Gender gender,
            String email,
            String phone,
            StudentStatus status,
            String className,
            boolean hasAccount) {
    }
}
