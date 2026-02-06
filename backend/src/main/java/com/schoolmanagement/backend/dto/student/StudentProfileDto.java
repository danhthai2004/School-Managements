package com.schoolmanagement.backend.dto.student;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class StudentProfileDto {
    private String id;
    private String studentCode;
    private String fullName;
    private String email;
    private String phone;
    private String avatarUrl;
    private String classId;
    private String className;
    private Integer grade;
    private String academicYear;
}
