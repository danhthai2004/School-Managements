package com.schoolmanagement.backend.dto.teacher;

import java.util.UUID;

public record AssignTeacherRequest(
        UUID teacherId) {
}
