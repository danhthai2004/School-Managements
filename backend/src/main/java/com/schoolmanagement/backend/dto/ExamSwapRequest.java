package com.schoolmanagement.backend.dto;

import lombok.*;
import java.util.UUID;

/**
 * Request DTO cho swap 2 học sinh giữa 2 phòng thi.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class ExamSwapRequest {
    private UUID studentId1;
    private UUID examRoomId1;
    private UUID studentId2;
    private UUID examRoomId2;
}
