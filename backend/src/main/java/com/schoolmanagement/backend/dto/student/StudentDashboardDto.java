package com.schoolmanagement.backend.dto.student;

import lombok.Builder;
import lombok.Data;
import java.util.List;

@Data
@Builder
public class StudentDashboardDto {
    private StudentProfileDto profile;
    private Double averageScore;
    private int totalSubjects;
    private double attendanceRate;
    private int absences;
    private String semester;
    private List<TimetableSlotDto> todaySchedule;
    private List<ExamScheduleDto> upcomingExams;
}
