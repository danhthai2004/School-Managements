package com.schoolmanagement.backend.dto.student;

import lombok.Builder;
import lombok.Data;
import java.util.List;

@Data
@Builder
public class AttendanceSummaryDto {
    private int totalDays;
    private int presentDays;
    private int absentDays;
    private int lateDays;
    private double attendanceRate;
    private List<AttendanceRecordDto> records;
}
