package com.schoolmanagement.backend.dto.exam;

import lombok.*;

/**
 * DTO trả về chi tiết lịch thi của một kỳ thi.
 * Bao gồm thông tin Môn thi, Khối, Ngày/Giờ, và danh sách Phòng thi.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExamScheduleDetailDto {
    private String id;
    private String subjectName;
    private Integer grade;
    private String examDate; // yyyy-MM-dd
    private String startTime; // HH:mm
    private String endTime; // HH:mm
    private String note;
}
