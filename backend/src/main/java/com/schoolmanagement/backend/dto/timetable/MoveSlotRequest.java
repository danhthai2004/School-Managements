package com.schoolmanagement.backend.dto.timetable;

import java.util.UUID;

/**
 * Request DTO cho thao tác di chuyển 1 tiết học đến ô trống.
 */
public record MoveSlotRequest(
        UUID detailId,       // ID của TimetableDetail cần di chuyển
        String targetDay,    // Thứ đích (MONDAY, TUESDAY, ..., SUNDAY)
        int targetSlot       // Tiết đích (1-10)
) {
}
