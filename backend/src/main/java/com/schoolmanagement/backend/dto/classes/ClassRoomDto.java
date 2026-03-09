package com.schoolmanagement.backend.dto.classes;

import java.util.UUID;

public record ClassRoomDto(
                UUID id,
                String name,
                int grade,
                String academicYear,
                int maxCapacity,
                UUID roomId,
                String roomName,
                String department,
                String session, // SANG or CHIEU
                String status,
                UUID homeroomTeacherId,
                String homeroomTeacherName,
                long studentCount,
                UUID combinationId,
                String combinationName) {
}
