package com.schoolmanagement.backend.dto.timetable;

import java.util.Collections;
import java.util.List;

/**
 * Kết quả kiểm tra xung đột khi di chuyển hoặc hoán đổi tiết học.
 *
 * @param valid     true nếu không có xung đột
 * @param conflicts danh sách mô tả các xung đột (rỗng nếu valid=true)
 */
public record SlotValidationResponse(
        boolean valid,
        List<String> conflicts) {

    public static SlotValidationResponse ok() {
        return new SlotValidationResponse(true, Collections.emptyList());
    }

    public static SlotValidationResponse conflict(List<String> conflicts) {
        return new SlotValidationResponse(false, conflicts);
    }
}
