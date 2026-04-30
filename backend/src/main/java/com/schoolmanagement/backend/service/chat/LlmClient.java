package com.schoolmanagement.backend.service.chat;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.time.Duration;
import java.util.List;
import java.util.Map;

/**
 * Client wrapper cho LLM API (OpenRouter — OpenAI-compatible format).
 * Chỉ làm 1 việc: gửi prompt → nhận text response.
 *
 * Endpoint: POST /chat/completions
 * Format: OpenAI-compatible (messages array with role/content)
 */
@Service
public class LlmClient {

    private final WebClient webClient;
    private final ObjectMapper objectMapper;

    private static final Logger log = LoggerFactory.getLogger(LlmClient.class);
    private static final Duration LLM_TIMEOUT = Duration.ofSeconds(15);

    @Value("${app.llm.api-key:}")
    private String apiKey;

    @Value("${app.llm.model}")
    private String model;

    public LlmClient(@Qualifier("llmWebClient") WebClient webClient,
            ObjectMapper objectMapper) {
        this.webClient = webClient;
        this.objectMapper = objectMapper;
    }

    /**
     * Gửi prompt đến LLM API và nhận text response.
     *
     * @param systemPrompt System instruction (vai trò + quy tắc)
     * @param userMessage  Tin nhắn người dùng
     * @return Text response từ LLM
     */
    public String generate(String systemPrompt, String userMessage) {
        if (apiKey == null || apiKey.isBlank()) {
            throw new RuntimeException("LLM_API_KEY chưa được cấu hình. "
                    + "Vui lòng set biến môi trường LLM_API_KEY.");
        }

        // Build request body theo OpenAI-compatible format
        Map<String, Object> requestBody = Map.of(
                "model", model,
                "messages", List.of(
                        Map.of("role", "system", "content", systemPrompt),
                        Map.of("role", "user", "content", userMessage)),
                "temperature", 0.3,
                "max_tokens", 1024,
                "top_p", 0.8);

        try {
            String responseJson = webClient.post()
                    .uri("/chat/completions")
                    .bodyValue(requestBody)
                    .retrieve()
                    .bodyToMono(String.class)
                    .timeout(LLM_TIMEOUT)
                    .block();

            return extractText(responseJson);

        } catch (WebClientResponseException e) {
            log.error("LLM API lỗi: {} — {}", e.getStatusCode(), e.getResponseBodyAsString());
            throw new RuntimeException("LLM API lỗi: " + e.getStatusCode(), e);
        } catch (Exception e) {
            log.error("LLM API lỗi: {}", e.getMessage());
            throw new RuntimeException("Không thể kết nối đến LLM API", e);
        }
    }

    /**
     * Parse JSON response theo OpenAI format.
     * Format: { "choices": [{ "message": { "content": "..." } }] }
     */
    private String extractText(String responseJson) {
        try {
            JsonNode root = objectMapper.readTree(responseJson);
            JsonNode choices = root.path("choices");
            if (choices.isArray() && !choices.isEmpty()) {
                String content = choices.get(0).path("message").path("content").asText("");
                if (!content.isBlank()) {
                    return content;
                }
            }
            return "Không nhận được phản hồi từ AI.";
        } catch (Exception e) {
            return "Lỗi xử lý phản hồi AI: " + e.getMessage();
        }
    }
}
