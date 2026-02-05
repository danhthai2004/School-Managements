package com.schoolmanagement.backend.dto.report;

import java.util.List;

/**
 * DTO cho Dashboard Overview - Tổng quan trường học
 */
public record ReportOverviewDto(
        long totalStudents,
        long totalTeachers,
        long totalClasses,
        String currentAcademicYear,
        StudentGenderDistribution genderDistribution,
        List<GradeDistribution> gradeDistribution) {
    public record StudentGenderDistribution(
            long male,
            long female,
            long other) {
    }

    public record GradeDistribution(
            int grade,
            long studentCount,
            long classCount) {
    }
}
