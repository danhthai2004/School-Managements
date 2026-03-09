package com.schoolmanagement.backend.dto.admin;

public record SchoolStatsDto(
        long totalClasses,
        long totalTeachers,
        long totalStudents,
        String currentAcademicYear) {
}
