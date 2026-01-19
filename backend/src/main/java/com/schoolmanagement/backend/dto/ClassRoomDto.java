package com.schoolmanagement.backend.dto;

import java.util.UUID;

public record ClassRoomDto(
                UUID id,
                String name,
                int grade,
                String academicYear,
                int maxCapacity,
                String roomNumber,
                String department,
                String status,
                UUID homeroomTeacherId,
                String homeroomTeacherName,
                long studentCount) {
}
