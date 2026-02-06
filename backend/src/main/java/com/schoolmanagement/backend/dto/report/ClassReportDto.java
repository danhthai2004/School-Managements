package com.schoolmanagement.backend.dto.report;

import java.util.List;
import java.util.UUID;

/**
 * DTO cho báo cáo lớp học
 */
public record ClassReportDto(
        long totalClasses,
        long activeClasses,
        List<ClassSummaryDto> classSummaries,
        List<ClassByGradeDto> classesByGrade) {
    public record ClassSummaryDto(
            UUID classId,
            String className,
            int grade,
            String academicYear,
            String department,
            long enrolledStudents,
            int capacity,
            String homeroomTeacherName,
            boolean hasFullTeachers) {
    }

    public record ClassByGradeDto(
            int grade,
            long classCount,
            long totalStudents) {
    }
}
