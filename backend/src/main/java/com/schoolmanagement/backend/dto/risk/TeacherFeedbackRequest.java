package com.schoolmanagement.backend.dto.risk;

import com.schoolmanagement.backend.domain.risk.TeacherFeedbackStatus;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.util.UUID;

/**
 * Request DTO khi giáo viên gửi phản hồi (Acknowledge / False Positive).
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class TeacherFeedbackRequest {
    @NotNull
    private UUID assessmentId;

    @NotNull
    private TeacherFeedbackStatus feedback;

    private String note;
}
