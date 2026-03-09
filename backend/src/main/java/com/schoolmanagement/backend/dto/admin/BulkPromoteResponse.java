package com.schoolmanagement.backend.dto.admin;

import java.util.List;

public record BulkPromoteResponse(
        int promoted,
        int skipped,
        List<String> errors) {
}
