package com.schoolmanagement.backend.dto.request;

import com.schoolmanagement.backend.domain.ClassDepartment;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public record UpdateClassRoomRequest(
        @NotNull(message = "ID lớp không được để trống") UUID classId,

        @Size(max = 50, message = "Tên lớp tối đa 50 ký tự") String name,

        @Min(value = 1, message = "Khối phải từ 1-12") @Max(value = 12, message = "Khối phải từ 1-12") Integer grade,

        @Size(max = 20, message = "Năm học tối đa 20 ký tự") String academicYear,

        @Min(value = 1, message = "Sĩ số tối thiểu là 1") @Max(value = 35, message = "Sĩ số tối đa là 35") Integer maxCapacity,

        @Size(max = 20, message = "Phòng học tối đa 20 ký tự") String roomNumber,

        ClassDepartment department,

        UUID homeroomTeacherId) {
}
