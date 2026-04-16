package com.schoolmanagement.backend.dto.attendance;

import java.util.List;
import java.util.UUID;

/**
 * DTO cho báo cáo điểm danh
 */
public record AttendanceReportDto(
                long totalSessions,
                double overallAttendanceRate,
                List<AttendanceByClassDto> attendanceByClass,
                List<ChronicAbsenteeDto> chronicAbsentees) {
        public record AttendanceByClassDto(
                        UUID classId,
                        String className,
                        int grade,
                        long totalSessions,
                        int studentCount,
                        double attendanceRate,
                        long presentCount,
                        long absentCount,
                        long lateCount,
                        long excusedCount) {
        }

        public record ChronicAbsenteeDto(
                        UUID studentId,
                        String studentCode,
                        String studentName,
                        String className,
                        int absentDays,
                        double absentRate) {
        }
}
