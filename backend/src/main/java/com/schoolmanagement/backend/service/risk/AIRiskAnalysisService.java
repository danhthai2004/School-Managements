package com.schoolmanagement.backend.service.risk;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.schoolmanagement.backend.domain.entity.admin.School;
import com.schoolmanagement.backend.domain.entity.risk.RiskAssessmentHistory;
import com.schoolmanagement.backend.domain.entity.risk.RiskMetricsSnapshot;
import com.schoolmanagement.backend.domain.risk.RiskCategory;
import com.schoolmanagement.backend.domain.risk.RiskTrend;
import com.schoolmanagement.backend.dto.risk.AIRiskResponse;
import com.schoolmanagement.backend.repo.risk.RiskAssessmentHistoryRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.util.retry.Retry;

import java.time.Duration;
import java.time.LocalDate;
import java.util.*;

/**
 * Service gọi LLM API (qua WebClient thuần) để phân tích rủi ro từ batch dữ
 * liệu snapshot.
 *
 * Quy trình:
 * 1. Nhận danh sách RiskMetricsSnapshot (đã tổng hợp sẵn).
 * 2. Ẩn danh: Tạo Map<UUID thật, UUID giả> để không gửi PII lên LLM.
 * 3. Gửi batch (~40 HS) với System Prompt ép JSON tối giản.
 * 4. Parse response, map ngược UUID giả -> UUID thật, lưu vào
 * RiskAssessmentHistory.
 * 5. Nếu score > 80 → đánh dấu để gửi thông báo.
 */
@Slf4j
@Service
public class AIRiskAnalysisService {

    private final WebClient llmWebClient;
    private final ObjectMapper objectMapper;
    private final RiskAssessmentHistoryRepository historyRepository;

    @Value("${app.risk.ai.model:google/gemini-2.0-flash-001}")
    private String modelId;

    private static final int BATCH_SIZE = 40;

    public AIRiskAnalysisService(@Qualifier("riskAiWebClient") WebClient llmWebClient,
            ObjectMapper objectMapper,
            RiskAssessmentHistoryRepository historyRepository) {
        this.llmWebClient = llmWebClient;
        this.objectMapper = objectMapper;
        this.historyRepository = historyRepository;
    }

    /**
     * Phân tích rủi ro cho toàn bộ snapshots của 1 trường.
     * Chia thành nhiều batch (mỗi batch ~40 HS) để tránh vượt token limit.
     */
    @Transactional
    public List<RiskAssessmentHistory> analyzeSnapshots(List<RiskMetricsSnapshot> snapshots, School school) {
        if (snapshots.isEmpty()) {
            log.info("[AIRisk] Không có snapshot nào để phân tích.");
            return List.of();
        }

        List<RiskAssessmentHistory> allResults = new ArrayList<>();
        List<List<RiskMetricsSnapshot>> batches = partition(snapshots, BATCH_SIZE);

        log.info("[AIRisk] Chia {} snapshot(s) thành {} batch(es) để gửi LLM.",
                snapshots.size(), batches.size());

        for (int i = 0; i < batches.size(); i++) {
            try {
                List<RiskAssessmentHistory> batchResults = analyzeSingleBatch(batches.get(i), school);
                allResults.addAll(batchResults);
                log.info("[AIRisk] Batch {}/{} hoàn tất: {} kết quả.", i + 1, batches.size(), batchResults.size());
            } catch (Exception e) {
                log.error("[AIRisk] Lỗi khi phân tích batch {}/{}: {}", i + 1, batches.size(), e.getMessage(), e);
            }
        }

        return allResults;
    }

    private List<RiskAssessmentHistory> analyzeSingleBatch(List<RiskMetricsSnapshot> batch, School school) {
        // 1. Tạo anonymization map
        Map<UUID, UUID> realToFake = new HashMap<>();
        Map<UUID, UUID> fakeToReal = new HashMap<>();
        Map<UUID, RiskMetricsSnapshot> snapshotByStudentId = new HashMap<>();

        for (RiskMetricsSnapshot snap : batch) {
            UUID realId = snap.getStudent().getId();
            UUID fakeId = UUID.randomUUID();
            realToFake.put(realId, fakeId);
            fakeToReal.put(fakeId, realId);
            snapshotByStudentId.put(realId, snap);
        }

        // 2. Xây dựng payload ẩn danh (tuyệt đối không có fullName, email, phone)
        List<Map<String, Object>> anonymizedData = batch.stream().map(snap -> {
            Map<String, Object> row = new LinkedHashMap<>();
            row.put("id", realToFake.get(snap.getStudent().getId()).toString());
            row.put("absent_unexcused_7d", snap.getAbsentUnexcused7d());
            row.put("absent_excused_7d", snap.getAbsentExcused7d());
            row.put("late_7d", snap.getLateCount7d());
            row.put("total_sessions_7d", snap.getTotalSessions7d());
            row.put("attendance_rate_30d", snap.getAttendanceRate30d());
            row.put("gpa", snap.getCurrentGpa());
            row.put("prev_gpa", snap.getPreviousGpa());
            row.put("failing_subjects", snap.getFailingSubjectsCount());
            row.put("failing_subjects_detail", snap.getFailingSubjectsDetail()); // Thêm chi tiết tên môn
            row.put("conduct_violations_30d", snap.getConductViolations30d());
            return row;
        }).toList();

        // 3. Xây dựng prompt
        String systemPrompt = buildSystemPrompt();
        String userPrompt;
        try {
            userPrompt = objectMapper.writeValueAsString(anonymizedData);
        } catch (Exception e) {
            throw new RuntimeException("Không thể serialize dữ liệu batch.", e);
        }

        // 4. Gọi LLM API với retry
        String llmResponse = callLlmApi(systemPrompt, userPrompt);

        // 5. Parse response
        List<AIRiskResponse> responses;
        try {
            // Trích xuất JSON array từ response (có thể được bọc trong markdown code block)
            String jsonContent = extractJsonArray(llmResponse);
            responses = objectMapper.readValue(jsonContent, new TypeReference<>() {
            });
        } catch (Exception e) {
            log.error("[AIRisk] Lỗi parse JSON response từ LLM: {}", e.getMessage());
            log.debug("[AIRisk] Raw response: {}", llmResponse);
            return List.of();
        }

        // 6. Map ngược và lưu kết quả
        LocalDate today = LocalDate.now();
        List<RiskAssessmentHistory> results = new ArrayList<>();

        for (AIRiskResponse resp : responses) {
            try {
                UUID fakeId = UUID.fromString(resp.getId());
                UUID realStudentId = fakeToReal.get(fakeId);
                if (realStudentId == null) {
                    log.warn("[AIRisk] UUID giả {} không tìm thấy trong map, bỏ qua.", fakeId);
                    continue;
                }

                RiskMetricsSnapshot snap = snapshotByStudentId.get(realStudentId);
                RiskCategory category;
                try {
                    category = RiskCategory.valueOf(resp.getCategory().toUpperCase());
                } catch (Exception e) {
                    category = RiskCategory.MIXED;
                }

                RiskAssessmentHistory history = RiskAssessmentHistory.builder()
                        .student(snap.getStudent())
                        .classRoom(snap.getClassRoom())
                        .school(school)
                        .assessmentDate(today)
                        .riskScore(Math.max(0, Math.min(100, resp.getScore())))
                        .riskCategory(category)
                        .riskTrend(snap.getGpaTrend() != null ? snap.getGpaTrend() : RiskTrend.STABLE)
                        .aiReason(truncate(resp.getReason(), 200))
                        .aiAdvice(truncate(resp.getAdvice(), 500))
                        .build();

                results.add(historyRepository.save(history));
            } catch (Exception e) {
                log.warn("[AIRisk] Lỗi xử lý response item: {}", e.getMessage());
            }
        }

        return results;
    }

    private String buildSystemPrompt() {
        return """
                You are a school risk analyst AI. Analyze the provided student metrics and return a JSON array.

                RULES:
                - Return ONLY a JSON array, no other text.
                - Each element: {"id":"<same id from input>","score":<0-100>,"reason":"<max 100 chars, Vietnamese>","advice":"<max 150 chars, friendly Vietnamese advice for student>","category":"<ACADEMIC|BEHAVIOR|ATTENDANCE|MIXED>"}
                - score: 0=safe, 100=critical risk
                - Higher absent_unexcused_7d and lower gpa increase risk
                - Use 'failing_subjects_detail' to MENTION SPECIFIC SUBJECT NAMES in 'reason' and 'advice' if they contribute to risk.
                - Example reason: "Học sinh có dấu hiệu sa sút nghiêm trọng ở môn Toán và Vật lý."
                - reason: explain briefly WHY the score is given, be specific about subjects if available.
                - advice: encouraging, positive tone for the student to improve, suggest focusing on specific subjects.
                - Keep JSON minimal, no extra fields
                """;
    }

    private String callLlmApi(String systemPrompt, String userPrompt) {
        Map<String, Object> requestBody = new LinkedHashMap<>();
        requestBody.put("model", modelId);
        requestBody.put("messages", List.of(
                Map.of("role", "system", "content", systemPrompt),
                Map.of("role", "user", "content", userPrompt)));
        requestBody.put("temperature", 0.2);
        requestBody.put("max_tokens", 4000);

        return llmWebClient.post()
                .uri("/chat/completions")
                .bodyValue(requestBody)
                .retrieve()
                .bodyToMono(String.class)
                .retryWhen(Retry.backoff(2, Duration.ofSeconds(3))
                        .filter(throwable -> {
                            // Chỉ retry khi gặp 429 hoặc 5xx, không retry 400
                            String msg = throwable.getMessage();
                            return msg != null && (msg.contains("429") || msg.contains("500")
                                    || msg.contains("502") || msg.contains("503"));
                        })
                        .onRetryExhaustedThrow((spec, signal) -> new RuntimeException(
                                "LLM API đã retry hết lần mà vẫn lỗi.", signal.failure())))
                .block(Duration.ofSeconds(60));
    }

    /**
     * Trích xuất JSON array từ response (LLM có thể bọc trong ```json ... ```)
     */
    private String extractJsonArray(String raw) {
        if (raw == null)
            return "[]";
        // Thử parse trực tiếp từ response OpenRouter format
        try {
            var tree = objectMapper.readTree(raw);
            var choices = tree.get("choices");
            if (choices != null && choices.isArray() && !choices.isEmpty()) {
                String content = choices.get(0).get("message").get("content").asText();
                return extractPureJson(content);
            }
        } catch (Exception ignored) {
        }
        return extractPureJson(raw);
    }

    private String extractPureJson(String content) {
        if (content == null)
            return "[]";
        content = content.trim();
        // Loại bỏ markdown code block nếu có
        if (content.startsWith("```")) {
            int firstNewLine = content.indexOf('\n');
            int lastFence = content.lastIndexOf("```");
            if (firstNewLine > 0 && lastFence > firstNewLine) {
                content = content.substring(firstNewLine + 1, lastFence).trim();
            }
        }
        // Tìm array bracket
        int start = content.indexOf('[');
        int end = content.lastIndexOf(']');
        if (start >= 0 && end > start) {
            return content.substring(start, end + 1);
        }
        return content;
    }

    private String truncate(String s, int max) {
        if (s == null)
            return null;
        return s.length() <= max ? s : s.substring(0, max);
    }

    private <T> List<List<T>> partition(List<T> list, int size) {
        List<List<T>> partitions = new ArrayList<>();
        for (int i = 0; i < list.size(); i += size) {
            partitions.add(list.subList(i, Math.min(i + size, list.size())));
        }
        return partitions;
    }
}
