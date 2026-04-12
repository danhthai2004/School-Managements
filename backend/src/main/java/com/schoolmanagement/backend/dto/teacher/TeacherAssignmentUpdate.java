package com.schoolmanagement.backend.dto.teacher;

import java.util.UUID;

public record TeacherAssignmentUpdate(
        UUID assignmentId,
        UUID teacherId) {
}
