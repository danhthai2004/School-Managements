package com.schoolmanagement.backend.dto.timetable;

import java.util.UUID;

/**
 * Request DTO cho thao tác hoán đổi 2 tiết học.
 */
public record SwapSlotRequest(
        UUID sourceDetailId, // ID tiết học nguồn
        UUID targetDetailId  // ID tiết học đích (tiết sẽ bị hoán đổi)
) {
}
