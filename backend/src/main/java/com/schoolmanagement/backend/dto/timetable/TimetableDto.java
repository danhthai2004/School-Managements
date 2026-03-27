package com.schoolmanagement.backend.dto.timetable;

import java.time.Instant;
import java.util.UUID;

public record TimetableDto(
        UUID id,
        String name,
        String academicYear,
        int semester,
        String status,
        Instant createdAt) {
}
