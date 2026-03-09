package com.schoolmanagement.backend.dto.exam;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ExamScheduleDto {
    private String id;
    private String subjectName;
    private String examDate;
    private String startTime;
    private int duration;
    private String examType; // 'MIDTERM' | 'FINAL' | 'REGULAR' | 'QUIZ'
    private String room;
    private String status; // 'UPCOMING' | 'COMPLETED'
    private String note;
}
