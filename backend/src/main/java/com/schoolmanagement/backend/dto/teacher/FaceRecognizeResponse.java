package com.schoolmanagement.backend.dto.teacher;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * Response from the face recognition batch endpoint.
 * Note: No @JsonNaming here — Spring MVC serializes as camelCase for mobile clients.
 * The WebClient that calls Python uses a custom snake_case ObjectMapper for deserialization.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class FaceRecognizeResponse {

    private List<RecognizedFaceDto> results;
    private Integer totalFacesDetected;
    private Integer totalMatched;
    private Integer totalNeedsConfirm;
    private Integer totalNoMatch;
    private Integer processingTimeMs;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RecognizedFaceDto {
        private String studentId;
        private String studentCode;
        private String studentName;
        private Double confidence;
        /** MATCHED, NEEDS_CONFIRM, NO_MATCH, NO_FACE */
        private String status;
        private List<Integer> bbox;
    }
}
