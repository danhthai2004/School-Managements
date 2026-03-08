package com.schoolmanagement.backend.dto.teacher;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TeacherDashboardStatsDto {
    // Common stats
    private int totalAssignedClasses;
    private int todayPeriods;

    // Homeroom-only stats (null for subject teachers)
    private Integer totalStudents;
    private String homeroomClassName;
    private AttendanceDto todayAttendance;
    private Integer studentsNeedingAttention;
    private Double averageGpa;
    private Double attendanceRate;
    private Integer excellentStudents;
    private Integer pendingAssignments;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AttendanceDto {
        private int present;
        private int total;
    }
}
