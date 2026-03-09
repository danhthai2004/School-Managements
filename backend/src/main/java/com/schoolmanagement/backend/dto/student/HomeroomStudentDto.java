package com.schoolmanagement.backend.dto.student;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class HomeroomStudentDto {
    private String id;
    private String studentCode;
    private String fullName;
    private String gender;
    private String email;
    private String phone;
    private String avatarUrl;
    private String status;
    private Double attendanceRate;
    private Double averageGpa;
    private String conductGrade; // Xuất sắc, Khá, Trung bình, Yếu
    private String parentPhone;
    private String parentEmail;
}
