package com.schoolmanagement.backend.dto;

import com.schoolmanagement.backend.domain.ExamType;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record ExamScheduleGenerateRequest(
        @NotNull(message = "Loại kỳ thi không được để trống")
        ExamType examType,
        
        @NotEmpty(message = "Phải chọn ít nhất một môn học")
        List<UUID> subjectIds,
        
        @NotEmpty(message = "Phải chọn ít nhất một khối")
        List<Integer> grades,
        
        @NotNull(message = "Ngày bắt đầu không được để trống")
        LocalDate startDate,
        
        @NotNull(message = "Ngày kết thúc không được để trống")
        LocalDate endDate,
        
        @NotNull(message = "Năm học không được để trống")
        String academicYear,
        
        @NotNull(message = "Học kỳ không được để trống")
        Integer semester
) {}
