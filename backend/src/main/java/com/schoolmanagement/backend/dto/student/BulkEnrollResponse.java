package com.schoolmanagement.backend.dto.student;

import java.util.List;

public record BulkEnrollResponse(
                int total,
                int enrolled,
                int skipped,
                List<String> errors) {
}
