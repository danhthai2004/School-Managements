package com.schoolmanagement.backend.dto;

import lombok.*;

/**
 * DTO trả về thông tin thí sinh trong phòng thi.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExamStudentDetailDto {
    private String id;
    private String studentCode;
    private String fullName;
}
