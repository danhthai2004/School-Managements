package com.schoolmanagement.backend.dto.timetable;

public record GenerateJobDto(
        String jobId,
        String status, // RUNNING | DONE | ERROR
        String message) {
}
