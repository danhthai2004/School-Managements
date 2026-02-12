package com.schoolmanagement.backend.dto;

import java.util.List;

public record BulkDeleteResponse(
        int deleted,
        int failed,
        List<String> errors) {
}
