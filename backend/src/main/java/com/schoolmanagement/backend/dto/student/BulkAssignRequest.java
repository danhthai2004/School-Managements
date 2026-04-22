package com.schoolmanagement.backend.dto.student;

import java.util.List;
import java.util.UUID;

public record BulkAssignRequest(
        List<UUID> studentIds,
        String mode,   // "AUTO" or "MANUAL"
        UUID classId   // required when mode = MANUAL
) {}
