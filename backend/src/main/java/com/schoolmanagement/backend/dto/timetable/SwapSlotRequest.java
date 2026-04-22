package com.schoolmanagement.backend.dto.timetable;

import java.util.UUID;

/**
 * Request hoán đổi vị trí 2 tiết học.
 *
 * @param sourceDetailId ID tiết nguồn
 * @param targetDetailId ID tiết đích
 */
public record SwapSlotRequest(
        UUID sourceDetailId,
        UUID targetDetailId) {
}
