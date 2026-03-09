package com.schoolmanagement.backend.dto.admin;

import java.util.List;

public record BulkAccountCreationResponse(
        int created,
        int skipped,
        List<String> errors) {
}
