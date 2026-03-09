package com.schoolmanagement.backend.dto.common;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AIRecommendationDto {
    private String id;
    private RecommendationType type;
    private Priority priority;
    private String title;
    private String description;
    private List<String> actions;

    public enum RecommendationType {
        ACADEMIC, ATTENDANCE, DISCIPLINE
    }

    public enum Priority {
        HIGH, MEDIUM, LOW
    }
}
