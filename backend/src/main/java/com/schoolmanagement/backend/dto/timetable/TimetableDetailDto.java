package com.schoolmanagement.backend.dto.timetable;

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
        String startTime,
        String endTime) {

    public TimetableDetailDto(
            UUID id, UUID classRoomId, String className,
            UUID subjectId, String subjectName, String subjectCode,
            UUID teacherId, String teacherName, String dayOfWeek,
            int slotIndex, boolean isFixed) {
        this(id, classRoomId, className, subjectId, subjectName, subjectCode,
             teacherId, teacherName, dayOfWeek, slotIndex, isFixed, 0, null, null);
    }
}

