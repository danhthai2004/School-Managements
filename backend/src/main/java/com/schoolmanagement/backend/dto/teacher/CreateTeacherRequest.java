package com.schoolmanagement.backend.dto.teacher;

import com.schoolmanagement.backend.domain.student.Gender;
import jakarta.validation.constraints.NotBlank;
import java.time.LocalDate;

public record CreateTeacherRequest(
        String teacherCode,

        @NotBlank(message = "Tên giáo viên không được để trống") String fullName,

        LocalDate dateOfBirth,
        Gender gender,
        String address,

        String email,
        String phone,
        String specialization,
        String degree,

        java.util.List<java.util.UUID> subjectIds,

        boolean createAccount) {
}
