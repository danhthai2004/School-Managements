package com.schoolmanagement.backend.dto.student;

import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;
import java.util.UUID;

public record BulkEnrollRequest(
        @NotNull(message = "Vui lòng chọn lớp") UUID classRoomId,
        @NotEmpty(message = "Vui lòng chọn ít nhất 1 học sinh") List<UUID> studentIds) {
}
