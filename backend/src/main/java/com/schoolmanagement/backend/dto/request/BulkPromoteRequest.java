package com.schoolmanagement.backend.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;
import java.util.UUID;

public record BulkPromoteRequest(
        @NotEmpty(message = "Danh sách học sinh không được trống") List<UUID> studentIds,
        @Min(value = 10, message = "Khối đích phải từ 10 trở lên") int targetGrade,
        @NotBlank(message = "Năm học đích không được trống") String targetAcademicYear) {
}
