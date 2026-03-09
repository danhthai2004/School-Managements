package com.schoolmanagement.backend.dto.teacher;

import java.util.UUID;

public record TeacherAssignmentDto(
        UUID id,
        UUID classId,
        String className,
        UUID subjectId,
        String subjectName,
        UUID teacherId,
        String teacherName,
        int lessonsPerWeek) {
}
