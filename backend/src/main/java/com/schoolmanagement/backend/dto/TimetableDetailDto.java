package com.schoolmanagement.backend.dto;

import java.util.UUID;

public record TimetableDetailDto(
        UUID id,
        UUID classRoomId,
        String className,
        UUID subjectId,
        String subjectName,
        String subjectCode,
        UUID teacherId,
        String teacherName,
        String dayOfWeek, // MONDAY, TUESDAY...
        int slotIndex,
        boolean isFixed,
        int classGrade,
        String startTime, // e.g., "07:00"
        String endTime // e.g., "07:45"
) {
}
