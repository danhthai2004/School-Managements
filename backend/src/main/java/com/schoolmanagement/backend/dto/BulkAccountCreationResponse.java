package com.schoolmanagement.backend.dto;

import java.util.List;

public record BulkAccountCreationResponse(
        int created,
        int skipped,
        List<String> errors) {
}
