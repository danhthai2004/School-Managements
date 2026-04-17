package com.schoolmanagement.backend.dto.classes;

import com.schoolmanagement.backend.domain.classes.ClassDepartment;
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

        @Min(value = 1, message = "Sĩ số tối thiểu là 1") @Max(value = 40, message = "Sĩ số tối đa là 40") Integer maxCapacity,

        UUID roomId,

        ClassDepartment department,

        UUID homeroomTeacherId) {
}
