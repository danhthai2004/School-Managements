package com.schoolmanagement.backend.dto.risk;

import lombok.*;

/**
 * DTO chứa kết quả phân tích AI trả về cho 1 batch học sinh.
 * Cấu trúc này chính là schema mà System Prompt ép LLM phải tuân theo.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AIRiskResponse {
    private String id; // UUID hash tạm thời (ẩn danh)
    private int score; // 0-100
    private String reason; // < 100 ký tự
    private String advice; // Lời khuyên cho học sinh (ngắn gọn)
    private String category; // ACADEMIC, BEHAVIOR, ATTENDANCE, MIXED
}
