package com.schoolmanagement.backend.dto.request;

import java.util.UUID;

public record AssignTeacherRequest(
                UUID teacherId,
                UUID subjectId) {
}
