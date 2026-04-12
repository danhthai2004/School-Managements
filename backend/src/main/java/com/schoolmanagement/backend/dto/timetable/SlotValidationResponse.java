package com.schoolmanagement.backend.dto.timetable;

import java.util.List;

/**
 * Response DTO cho kết quả validate thao tác kéo thả.
 */
public record SlotValidationResponse(
        boolean valid,
        List<String> conflicts
) {
    public static SlotValidationResponse ok() {
        return new SlotValidationResponse(true, List.of());
    }

    public static SlotValidationResponse conflict(List<String> messages) {
        return new SlotValidationResponse(false, messages);
    }
}
