package com.schoolmanagement.backend.dto.exam;

import lombok.*;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

/**
 * Request DTO cho allocation flow mới (theo ExamSession).
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExamAllocateRequest {

    private UUID examSessionId;
    private UUID subjectId;
    private Integer grade;
    private LocalDate examDate;
    private LocalTime startTime;
    private LocalTime endTime;

    /**
     * Danh sách phòng thi với capacity tùy chỉnh và giám thị.
     */
    private List<RoomAllocation> rooms;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RoomAllocation {
        private UUID roomId;
        private Integer capacity;
        private List<UUID> teacherIds;
    }
}
