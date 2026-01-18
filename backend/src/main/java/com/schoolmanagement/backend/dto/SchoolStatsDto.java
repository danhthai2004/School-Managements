package com.schoolmanagement.backend.dto;

public record SchoolStatsDto(
        long totalClasses,
        long totalTeachers,
        long totalStudents,
        String currentAcademicYear) {
}
