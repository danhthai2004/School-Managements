package com.schoolmanagement.backend.dto.admin;

import jakarta.validation.constraints.NotEmpty;
import java.util.List;
import java.util.UUID;

public record BulkDeleteRequest(
        @NotEmpty(message = "Danh sách ID không được để trống") List<UUID> ids) {
}
