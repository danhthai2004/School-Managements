package com.schoolmanagement.backend.dto.timetable;

import java.util.UUID;

/**
 * Request di chuyển một tiết học đến ô trống.
 *
 * @param detailId  ID của TimetableDetail cần di chuyển
 * @param targetDay Ngày đích (DayOfWeek name, e.g. "MONDAY")
 * @param targetSlot Tiết đích (1-indexed)
 */
public record MoveSlotRequest(
        UUID detailId,
        String targetDay,
        int targetSlot) {
}
