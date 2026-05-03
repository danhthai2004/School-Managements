package com.schoolmanagement.backend.service.learning;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.schoolmanagement.backend.domain.entity.admin.School;
import com.schoolmanagement.backend.domain.entity.admin.Semester;
import com.schoolmanagement.backend.domain.entity.classes.ClassEnrollment;
import com.schoolmanagement.backend.domain.entity.classes.ClassRoom;
import com.schoolmanagement.backend.domain.entity.grade.Grade;
import com.schoolmanagement.backend.domain.entity.learning.LearningAnalysisReport;
import com.schoolmanagement.backend.domain.entity.student.Student;
import com.schoolmanagement.backend.dto.learning.AILearningAnalysisResponse;
import com.schoolmanagement.backend.repo.classes.ClassEnrollmentRepository;
import com.schoolmanagement.backend.repo.grade.GradeRepository;
import com.schoolmanagement.backend.repo.learning.LearningAnalysisReportRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.reactive.function.client.WebClient;
import reactor.util.retry.Retry;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Service gọi LLM API để phân tích học tập chi tiết cho từng học sinh.
 *
 * Quy trình:
 * 1. Thu thập toàn bộ điểm số chi tiết (theo từng môn) của học sinh trong 1 kỳ.
 * 2. Ẩn danh hóa: Tạo Map<UUID thật, UUID giả> để không gửi PII lên LLM.
 * 3. Gửi batch (~10 HS) với System Prompt chuyên biệt cho cố vấn học tập.
 * 4. Parse response, map ngược UUID giả → UUID thật, lưu/cập nhật LearningAnalysisReport.
 */
@Slf4j
@Service
public class AILearningAnalyticsService {

    private final WebClient llmWebClient;
    private final ObjectMapper objectMapper;
    private final LearningAnalysisReportRepository reportRepository;
    private final GradeRepository gradeRepository;
    private final ClassEnrollmentRepository enrollmentRepository;

    @Value("${app.learning.ai.model:google/gemini-2.0-flash-001}")
    private String modelId;

    /**
     * Batch nhỏ hơn Risk Analysis (40) vì payload điểm chi tiết lớn hơn nhiều.
     */
    private static final int BATCH_SIZE = 10;

    public AILearningAnalyticsService(@Qualifier("riskAiWebClient") WebClient llmWebClient,
                                       ObjectMapper objectMapper,
                                       LearningAnalysisReportRepository reportRepository,
                                       GradeRepository gradeRepository,
                                       ClassEnrollmentRepository enrollmentRepository) {
        this.llmWebClient = llmWebClient;
        this.objectMapper = objectMapper;
        this.reportRepository = reportRepository;
        this.gradeRepository = gradeRepository;
        this.enrollmentRepository = enrollmentRepository;
    }

    // ══════════════════════════════════════════════
    // Public API: Phân tích 1 học sinh (On-Demand)
    // ══════════════════════════════════════════════

    /**
     * Phân tích học tập cho 1 học sinh cụ thể (Teacher trigger).
     */
    @Transactional
    public LearningAnalysisReport analyzeStudent(Student student, Semester semester, School school) {
        ClassRoom classRoom = findCurrentClassRoom(student);
        List<Grade> grades = gradeRepository.findAllByStudentAndSemester(student, semester);

        if (grades.isEmpty()) {
            log.info("[LearningAI] Học sinh {} chưa có điểm trong kỳ {}, bỏ qua.",
                    student.getId(), semester.getName());
            return null;
        }

        // Tạo batch 1 phần tử
        Map<UUID, UUID> realToFake = new HashMap<>();
        Map<UUID, UUID> fakeToReal = new HashMap<>();
        UUID fakeId = UUID.randomUUID();
        realToFake.put(student.getId(), fakeId);
        fakeToReal.put(fakeId, student.getId());

        List<Map<String, Object>> payload = List.of(buildStudentPayload(student, grades, fakeId));
        BigDecimal currentGpa = calculateCurrentGpa(grades);

        String llmResponse = callLlm(payload);
        List<AILearningAnalysisResponse> responses = parseResponse(llmResponse);

        if (responses.isEmpty()) {
            log.warn("[LearningAI] LLM không trả về kết quả nào cho học sinh {}.", student.getId());
            return null;
        }

        // Lấy response đầu tiên (chỉ có 1 HS)
        AILearningAnalysisResponse resp = responses.get(0);
        return saveOrUpdateReport(student, semester, school, classRoom, currentGpa, resp);
    }

    // ══════════════════════════════════════════════
    // Public API: Phân tích toàn trường (Batch)
    // ══════════════════════════════════════════════

    /**
     * Phân tích học tập cho toàn bộ học sinh của 1 trường trong 1 kỳ.
     * Dùng cho Batch Processing và Admin trigger.
     */
    @Transactional
    public List<LearningAnalysisReport> analyzeSchool(School school, Semester semester) {
        // Lấy toàn bộ điểm trong kỳ (eager load student + subject)
        List<Grade> allGrades = gradeRepository.findAllBySchoolAndSemester(school, semester);
        if (allGrades.isEmpty()) {
            log.info("[LearningAI] Chưa có điểm nào trong kỳ {} cho trường {}.",
                    semester.getName(), school.getId());
            return List.of();
        }

        // Nhóm điểm theo student
        Map<UUID, List<Grade>> gradesByStudent = allGrades.stream()
                .collect(Collectors.groupingBy(g -> g.getStudent().getId()));

        // Lấy danh sách student đã phân tích (tránh trùng)
        Set<UUID> alreadyAnalyzed = new HashSet<>(
                reportRepository.findAnalyzedStudentIds(school, semester));

        // Lọc ra các student chưa phân tích
        List<UUID> pendingStudentIds = gradesByStudent.keySet().stream()
                .filter(id -> !alreadyAnalyzed.contains(id))
                .toList();

        if (pendingStudentIds.isEmpty()) {
            log.info("[LearningAI] Tất cả học sinh đã được phân tích.");
            return List.of();
        }

        log.info("[LearningAI] Bắt đầu phân tích {} học sinh cho kỳ {} trường {}.",
                pendingStudentIds.size(), semester.getName(), school.getId());

        // Batch-fetch enrollment info
        List<Student> allStudents = allGrades.stream()
                .map(Grade::getStudent)
                .distinct()
                .toList();
        Map<UUID, ClassRoom> studentClassMap = buildStudentClassMap(allStudents);

        // Chia batch và gửi LLM
        List<List<UUID>> batches = partition(pendingStudentIds, BATCH_SIZE);
        List<LearningAnalysisReport> allResults = new ArrayList<>();

        for (int i = 0; i < batches.size(); i++) {
            try {
                List<LearningAnalysisReport> batchResults = analyzeBatch(
                        batches.get(i), gradesByStudent, studentClassMap, semester, school);
                allResults.addAll(batchResults);
                log.info("[LearningAI] Batch {}/{} hoàn tất: {} kết quả.",
                        i + 1, batches.size(), batchResults.size());
            } catch (Exception e) {
                log.error("[LearningAI] Lỗi batch {}/{}: {}",
                        i + 1, batches.size(), e.getMessage(), e);
            }
        }

        return allResults;
    }

    // ══════════════════════════════════════════════
    // Private: Core Batch Logic
    // ══════════════════════════════════════════════

    private List<LearningAnalysisReport> analyzeBatch(
            List<UUID> studentIds,
            Map<UUID, List<Grade>> gradesByStudent,
            Map<UUID, ClassRoom> studentClassMap,
            Semester semester, School school) {

        // 1. Ẩn danh hóa
        Map<UUID, UUID> realToFake = new HashMap<>();
        Map<UUID, UUID> fakeToReal = new HashMap<>();
        Map<UUID, BigDecimal> currentGpaMap = new HashMap<>();
        Map<UUID, Student> studentMap = new HashMap<>();

        List<Map<String, Object>> payload = new ArrayList<>();

        for (UUID studentId : studentIds) {
            List<Grade> grades = gradesByStudent.get(studentId);
            if (grades == null || grades.isEmpty()) continue;

            Student student = grades.get(0).getStudent();
            UUID fakeId = UUID.randomUUID();
            realToFake.put(studentId, fakeId);
            fakeToReal.put(fakeId, studentId);
            studentMap.put(studentId, student);
            currentGpaMap.put(studentId, calculateCurrentGpa(grades));

            payload.add(buildStudentPayload(student, grades, fakeId));
        }

        if (payload.isEmpty()) return List.of();

        // 2. Gọi LLM
        String llmResponse = callLlm(payload);

        // 3. Parse response
        List<AILearningAnalysisResponse> responses = parseResponse(llmResponse);

        // 4. Map ngược và lưu
        List<LearningAnalysisReport> results = new ArrayList<>();
        for (AILearningAnalysisResponse resp : responses) {
            try {
                UUID fakeId = UUID.fromString(resp.getId());
                UUID realId = fakeToReal.get(fakeId);
                if (realId == null) {
                    log.warn("[LearningAI] UUID giả {} không tìm thấy, bỏ qua.", fakeId);
                    continue;
                }

                Student student = studentMap.get(realId);
                ClassRoom classRoom = studentClassMap.get(realId);
                BigDecimal currentGpa = currentGpaMap.get(realId);

                LearningAnalysisReport report = saveOrUpdateReport(
                        student, semester, school, classRoom, currentGpa, resp);
                if (report != null) {
                    results.add(report);
                }
            } catch (Exception e) {
                log.warn("[LearningAI] Lỗi xử lý response item: {}", e.getMessage());
            }
        }

        return results;
    }

    // ══════════════════════════════════════════════
    // Private: Payload Builder
    // ══════════════════════════════════════════════

    /**
     * Xây dựng payload ẩn danh cho 1 học sinh.
     * Gửi điểm chi tiết theo từng môn (regularScores, midterm, final, average).
     */
    private Map<String, Object> buildStudentPayload(Student student, List<Grade> grades, UUID fakeId) {
        Map<String, Object> row = new LinkedHashMap<>();
        row.put("id", fakeId.toString());

        List<Map<String, Object>> subjects = grades.stream().map(g -> {
            Map<String, Object> subjectData = new LinkedHashMap<>();
            subjectData.put("subject", g.getSubject().getName());

            // Regular scores (thường xuyên)
            if (g.getRegularScores() != null && !g.getRegularScores().isEmpty()) {
                List<Double> regularValues = g.getRegularScores().stream()
                        .filter(rs -> rs.getScoreValue() != null)
                        .map(rs -> rs.getScoreValue().doubleValue())
                        .toList();
                subjectData.put("regular_scores", regularValues);
            }

            if (g.getMidtermScore() != null) {
                subjectData.put("midterm", g.getMidtermScore().doubleValue());
            }
            if (g.getFinalScore() != null) {
                subjectData.put("final", g.getFinalScore().doubleValue());
            }
            if (g.getAverageScore() != null) {
                subjectData.put("average", g.getAverageScore().doubleValue());
            }
            return subjectData;
        }).toList();

        row.put("grades", subjects);
        return row;
    }

    // ══════════════════════════════════════════════
    // Private: LLM Communication
    // ══════════════════════════════════════════════

    private String callLlm(List<Map<String, Object>> payload) {
        String systemPrompt = buildSystemPrompt();
        String userPrompt;
        try {
            userPrompt = objectMapper.writeValueAsString(payload);
        } catch (Exception e) {
            throw new RuntimeException("Không thể serialize dữ liệu payload.", e);
        }

        Map<String, Object> requestBody = new LinkedHashMap<>();
        requestBody.put("model", modelId);
        requestBody.put("messages", List.of(
                Map.of("role", "system", "content", systemPrompt),
                Map.of("role", "user", "content", userPrompt)));
        requestBody.put("temperature", 0.3);
        requestBody.put("max_tokens", 8000);

        return llmWebClient.post()
                .uri("/chat/completions")
                .bodyValue(requestBody)
                .retrieve()
                .bodyToMono(String.class)
                .retryWhen(Retry.backoff(2, Duration.ofSeconds(3))
                        .filter(throwable -> {
                            String msg = throwable.getMessage();
                            return msg != null && (msg.contains("429") || msg.contains("500")
                                    || msg.contains("502") || msg.contains("503"));
                        })
                        .onRetryExhaustedThrow((spec, signal) -> new RuntimeException(
                                "LLM API đã retry hết lần mà vẫn lỗi.", signal.failure())))
                .block(Duration.ofSeconds(90));
    }

    private String buildSystemPrompt() {
        return """
                You are an experienced Vietnamese high school academic advisor AI. Analyze student grade data and provide personalized learning insights.

                RULES:
                - Return ONLY a JSON array, no other text.
                - Each element must follow this exact schema:
                  {
                    "id": "<same id from input>",
                    "strengths": "<list strong subjects, max 100 chars, Vietnamese>",
                    "weaknesses": "<list weak subjects needing improvement, max 100 chars, Vietnamese>",
                    "analysis": "<detailed analysis in Vietnamese, Markdown format, max 500 chars>",
                    "advice": "<personalized study roadmap in Vietnamese, Markdown format, max 500 chars>",
                    "predictedGpa": <predicted end-of-semester GPA, 0.0-10.0>
                  }
                - Grading scale: 0-10 (Vietnamese system). >= 8.0 = Excellent, >= 6.5 = Good, >= 5.0 = Average, < 5.0 = Weak.
                - 'strengths': mention specific subject names where student excels (average >= 7.0).
                - 'weaknesses': mention specific subject names that need improvement (average < 6.0).
                - 'analysis': provide insightful analysis about learning patterns, which subject groups are strong/weak (e.g., Khoa học Tự nhiên vs Xã hội).
                - 'advice': give actionable, encouraging advice. Suggest specific methods to improve weak subjects. Use a positive, motivational tone.
                - 'predictedGpa': predict based on current performance trends. Be realistic.
                - Use Vietnamese language for all text fields.
                - Keep JSON minimal, no extra fields.
                """;
    }

    // ══════════════════════════════════════════════
    // Private: Response Parsing
    // ══════════════════════════════════════════════

    private List<AILearningAnalysisResponse> parseResponse(String llmResponse) {
        try {
            String jsonContent = extractJsonArray(llmResponse);
            return objectMapper.readValue(jsonContent, new TypeReference<>() {});
        } catch (Exception e) {
            log.error("[LearningAI] Lỗi parse JSON response từ LLM: {}", e.getMessage());
            log.debug("[LearningAI] Raw response: {}", llmResponse);
            return List.of();
        }
    }

    private String extractJsonArray(String raw) {
        if (raw == null) return "[]";
        try {
            var tree = objectMapper.readTree(raw);
            var choices = tree.get("choices");
            if (choices != null && choices.isArray() && !choices.isEmpty()) {
                String content = choices.get(0).get("message").get("content").asText();
                return extractPureJson(content);
            }
        } catch (Exception ignored) {}
        return extractPureJson(raw);
    }

    private String extractPureJson(String content) {
        if (content == null) return "[]";
        content = content.trim();
        if (content.startsWith("```")) {
            int firstNewLine = content.indexOf('\n');
            int lastFence = content.lastIndexOf("```");
            if (firstNewLine > 0 && lastFence > firstNewLine) {
                content = content.substring(firstNewLine + 1, lastFence).trim();
            }
        }
        int start = content.indexOf('[');
        int end = content.lastIndexOf(']');
        if (start >= 0 && end > start) {
            return content.substring(start, end + 1);
        }
        return content;
    }

    // ══════════════════════════════════════════════
    // Private: Persistence
    // ══════════════════════════════════════════════

    private LearningAnalysisReport saveOrUpdateReport(
            Student student, Semester semester, School school,
            ClassRoom classRoom, BigDecimal currentGpa,
            AILearningAnalysisResponse resp) {

        // Tìm report đã tồn tại (upsert logic)
        LearningAnalysisReport report = reportRepository
                .findByStudentAndSemester(student, semester)
                .orElse(LearningAnalysisReport.builder()
                        .student(student)
                        .semester(semester)
                        .school(school)
                        .build());

        report.setClassRoom(classRoom);
        report.setStrengths(truncate(resp.getStrengths(), 1000));
        report.setWeaknesses(truncate(resp.getWeaknesses(), 1000));
        report.setDetailedAnalysis(resp.getAnalysis());
        report.setLearningAdvice(resp.getAdvice());
        report.setPredictedGpa(resp.getPredictedGpa() != null
                ? Math.max(0, Math.min(10, resp.getPredictedGpa())) : null);
        report.setCurrentGpa(currentGpa != null ? currentGpa.doubleValue() : null);
        report.setUpdatedAt(Instant.now());

        return reportRepository.save(report);
    }

    // ══════════════════════════════════════════════
    // Private: Helpers
    // ══════════════════════════════════════════════

    private BigDecimal calculateCurrentGpa(List<Grade> grades) {
        List<BigDecimal> scores = grades.stream()
                .map(Grade::getAverageScore)
                .filter(Objects::nonNull)
                .toList();
        if (scores.isEmpty()) return null;
        BigDecimal sum = scores.stream().reduce(BigDecimal.ZERO, BigDecimal::add);
        return sum.divide(BigDecimal.valueOf(scores.size()), 2, RoundingMode.HALF_UP);
    }

    private ClassRoom findCurrentClassRoom(Student student) {
        List<ClassEnrollment> enrollments = enrollmentRepository.findAllByStudent(student);
        if (enrollments.isEmpty()) return null;
        // Lấy enrollment mới nhất
        return enrollments.stream()
                .max(Comparator.comparing(ClassEnrollment::getEnrolledAt))
                .map(ClassEnrollment::getClassRoom)
                .orElse(null);
    }

    private Map<UUID, ClassRoom> buildStudentClassMap(List<Student> students) {
        List<ClassEnrollment> enrollments = enrollmentRepository.findAllByStudentIn(students);
        Map<UUID, ClassRoom> map = new HashMap<>();
        // Group by student, lấy enrollment mới nhất
        enrollments.stream()
                .collect(Collectors.groupingBy(e -> e.getStudent().getId()))
                .forEach((studentId, list) -> {
                    list.stream()
                            .max(Comparator.comparing(ClassEnrollment::getEnrolledAt))
                            .ifPresent(e -> map.put(studentId, e.getClassRoom()));
                });
        return map;
    }

    private String truncate(String s, int max) {
        if (s == null) return null;
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
