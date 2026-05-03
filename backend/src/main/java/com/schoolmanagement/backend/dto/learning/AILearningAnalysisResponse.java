package com.schoolmanagement.backend.dto.learning;

import lombok.*;

/**
 * DTO chứa kết quả phân tích học tập mà LLM trả về.
 * Cấu trúc này chính là schema mà System Prompt ép LLM phải tuân theo.
 * Tương tự AIRiskResponse nhưng dành cho Learning Analytics.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AILearningAnalysisResponse {
    /** UUID ẩn danh (giống id gửi đi trong payload) */
    private String id;

    /** Các môn/kỹ năng nổi trội, ví dụ: "Toán, Vật lý, Tin học" */
    private String strengths;

    /** Các môn/kỹ năng cần cải thiện, ví dụ: "Ngữ văn, Lịch sử" */
    private String weaknesses;

    /** Phân tích chi tiết (Markdown, max ~500 ký tự) */
    private String analysis;

    /** Lời khuyên/Lộ trình học tập cá nhân hóa (Markdown, max ~500 ký tự) */
    private String advice;

    /** Điểm trung bình dự kiến cuối kỳ (0.0 - 10.0) */
    private Double predictedGpa;
}
