package com.schoolmanagement.backend.dto;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.UUID;

public record ExamScheduleViewDto(
        UUID id,
        UUID classRoomId,
        String classRoomName,
        UUID subjectId,
        String subjectName,
        String examType,
        LocalDate examDate,
        LocalTime startTime,
        Integer duration,
        String roomNumber,
        String status,
        String note,
        String academicYear,
        Integer semester
) {}
