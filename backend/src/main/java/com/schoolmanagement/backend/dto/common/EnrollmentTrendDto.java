package com.schoolmanagement.backend.dto.common;

import java.util.List;
import com.schoolmanagement.backend.dto.student.StudentReportDto;

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
