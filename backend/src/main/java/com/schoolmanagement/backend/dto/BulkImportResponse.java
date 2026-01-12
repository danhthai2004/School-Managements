package com.schoolmanagement.backend.dto;

public record BulkImportResponse(
        int created,
        int skipped,
        int emailed
) {}
