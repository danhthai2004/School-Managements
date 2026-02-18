package com.schoolmanagement.backend.dto.response;

import java.util.List;

public record BulkDeleteResponse(
        int deleted,
        int failed,
        List<String> errors) {
}
