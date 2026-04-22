package com.schoolmanagement.backend.dto.student;

import java.util.List;

public record BulkAssignResult(
        int assigned,
        int skipped,
        int failed,
        List<Detail> details
) {
    public record Detail(
            String studentName,
            String result,     // "ASSIGNED" | "SKIPPED" | "FAILED"
            String className,
            String reason
    ) {}
}
