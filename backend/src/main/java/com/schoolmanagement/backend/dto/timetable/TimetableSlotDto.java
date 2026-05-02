package com.schoolmanagement.backend.dto.timetable;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class TimetableSlotDto {
    private String id;
    /**
     * Day of week in ISO enum name, e.g. MONDAY..SUNDAY.
     * This matches admin/teacher timetable representations and avoids off-by-one issues
     * when clients interpret numeric conventions differently.
     */
    private String dayOfWeek;
    private int slotIndex;
    private String subjectName;
    private String teacherName;
    private String roomName;
}
