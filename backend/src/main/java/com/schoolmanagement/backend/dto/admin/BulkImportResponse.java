package com.schoolmanagement.backend.dto.admin;

public record BulkImportResponse(
        int created,
        int skipped,
        int emailed
) {}
