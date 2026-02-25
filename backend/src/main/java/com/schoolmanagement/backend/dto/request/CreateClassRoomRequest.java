package com.schoolmanagement.backend.dto.request;

import com.schoolmanagement.backend.domain.ClassDepartment;
import com.schoolmanagement.backend.domain.SessionType;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public record CreateClassRoomRequest(
        @NotBlank(message = "Tên lớp không được để trống") @Size(max = 50, message = "Tên lớp tối đa 50 ký tự") String name,

        @Min(value = 1, message = "Khối phải từ 1-12") @Max(value = 12, message = "Khối phải từ 1-12") int grade,

        @NotBlank(message = "Năm học không được để trống") @Size(max = 20, message = "Năm học tối đa 20 ký tự") String academicYear,

        @NotNull(message = "Sĩ số không được để trống") @Min(value = 1, message = "Sĩ số tối thiểu là 1") @Max(value = 35, message = "Sĩ số tối đa là 35") Integer maxCapacity,

        @Size(max = 20, message = "Phòng học tối đa 20 ký tự") String roomNumber,

        ClassDepartment department,

        /** Buổi học chính của lớp (SANG/CHIEU), mặc định SANG */
        SessionType session,

        UUID combinationId,

        UUID homeroomTeacherId) {
}
