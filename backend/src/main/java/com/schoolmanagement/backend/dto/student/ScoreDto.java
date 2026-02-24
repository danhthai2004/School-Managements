package com.schoolmanagement.backend.dto.student;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ScoreDto {
    private String subjectId;
    private String subjectName;
    private Double oralScore;
    private Double test15Score;
    private Double test45Score;
    private Double midtermScore;
    private Double finalScore;
    private Double averageScore;
}
