package com.schoolmanagement.backend.dto.report;

import java.util.List;

/**
 * DTO xu hướng nhập học theo năm học
 */
public record EnrollmentTrendDto(
        String academicYear,
        long totalNewEnrollments,
        List<StudentReportDto.EnrollmentStatDto> monthlyStats,
        List<EnrollmentByGradeDto> byGrade) {

    /**
     * Thống kê nhập học theo khối
     */
    public record EnrollmentByGradeDto(
            int grade,
            long count) {
    }
}
