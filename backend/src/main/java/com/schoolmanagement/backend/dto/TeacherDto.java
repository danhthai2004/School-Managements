package com.schoolmanagement.backend.dto;

import java.time.LocalDate;
import java.util.UUID;

public record TeacherDto(
                UUID id,
                String teacherCode,
                String fullName,
                LocalDate dateOfBirth,
                String gender,
                String address,
                String email,
                String phone,
                String specialization,
                String degree,
                String status,
                UUID homeroomClassId,
                String homeroomClassName,
                java.util.List<SubjectDto> subjects,
                String subjectName,
                boolean hasAccount,
                String avatarUrl) {
}
