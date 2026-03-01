package com.schoolmanagement.backend.dto.teacher;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TodayScheduleItemDto {
    private int periodNumber;
    private String subjectName;
    private String className;
    private String roomNumber;
    private String startTime;
    private String endTime;
}
