package com.schoolmanagement.backend.dto;

import java.util.UUID;

public record TeacherAssignmentDto(
                UUID id,
                UUID subjectId,
                String subjectName,
                UUID teacherId,
                String teacherName,
                boolean isHeadOfDepartment) {
}
