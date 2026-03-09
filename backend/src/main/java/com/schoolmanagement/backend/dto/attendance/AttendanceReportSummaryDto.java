package com.schoolmanagement.backend.dto.attendance;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AttendanceReportSummaryDto {
    private String classroomName;
    private String startDate;
    private String endDate;
    private String reportType; // "WEEKLY" or "MONTHLY"
    private List<StudentAttendanceSummary> students;
    private int totalStudents;
    private int totalSchoolDays;
    private double overallAttendanceRate;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StudentAttendanceSummary {
        private String studentId;
        private String studentName;
        private int totalPresent;
        private int totalAbsentExcused;
        private int totalAbsentUnexcused;
        private int totalLate;
        private int totalSessions;
        private double attendanceRate;
    }
}
