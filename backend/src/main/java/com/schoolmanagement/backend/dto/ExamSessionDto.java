package com.schoolmanagement.backend.dto;

import com.schoolmanagement.backend.domain.ExamSessionStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDate;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ExamSessionDto {
    private UUID id;

    @NotBlank(message = "Tên kỳ thi không được để trống")
    private String name;

    @NotBlank(message = "Năm học không được để trống")
    private String academicYear;

    @NotNull(message = "Học kỳ không được để trống")
    private Integer semester;

    @NotNull(message = "Ngày bắt đầu không được để trống")
    private LocalDate startDate;

    @NotNull(message = "Ngày kết thúc không được để trống")
    private LocalDate endDate;

    private ExamSessionStatus status;
}
