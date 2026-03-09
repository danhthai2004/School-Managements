package com.schoolmanagement.backend.dto.classes;

import lombok.*;
import java.util.List;

/**
 * DTO trả về chi tiết một phòng thi: tên phòng, sức chứa, số HS đã xếp,
 * và danh sách giám thị.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExamRoomDetailDto {
    private String id;
    private String roomName;
    private String building;
    private Integer capacity;
    private Long studentCount;
    private List<String> invigilatorNames;
}
