package com.schoolmanagement.backend.dto.timetable;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class TimetableSlotDto {
    private String id;
    private int dayOfWeek; // 2-7 (Mon-Sat, Vietnamese convention)
    private int slotIndex;
    private String subjectName;
    private String teacherName;
    private String roomName;
}
