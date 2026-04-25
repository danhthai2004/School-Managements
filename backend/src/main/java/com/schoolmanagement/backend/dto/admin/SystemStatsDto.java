package com.schoolmanagement.backend.dto.admin;

public record SystemStatsDto(
        long totalSchools,
        long pendingDeleteSchools,
        long totalUsers,
        long pendingDeleteUsers,
        long totalStudents,
        long totalGuardians,
        long totalTeachers) {
}
