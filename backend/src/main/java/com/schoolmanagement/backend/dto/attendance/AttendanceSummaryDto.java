package com.schoolmanagement.backend.dto.attendance;

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
    private java.util.Map<String, java.util.Map<Integer, AttendanceRecordDto>> attendanceGrid;
    private List<com.schoolmanagement.backend.dto.timetable.TimetableSlotDto> classroomTimetable;
}
