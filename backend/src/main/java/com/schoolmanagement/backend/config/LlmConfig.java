package com.schoolmanagement.backend.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.boot.autoconfigure.condition.ConditionalOnMissingBean;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.reactive.function.client.WebClient;

/**
 * Cấu hình WebClient cho LLM API (OpenRouter — OpenAI-compatible).
 */
@Configuration
public class LlmConfig {

    @Value("${app.llm.base-url}")
    private String baseUrl;

    @Value("${app.llm.api-key:}")
    private String apiKey;

    @Bean
    public WebClient llmWebClient() {
        WebClient.Builder builder = WebClient.builder()
                .baseUrl(baseUrl)
                .defaultHeader("Content-Type", "application/json")
                .codecs(configurer -> configurer.defaultCodecs().maxInMemorySize(512 * 1024));

        // OpenRouter dùng Bearer token auth
        if (apiKey != null && !apiKey.isBlank()) {
            builder.defaultHeader("Authorization", "Bearer " + apiKey);
        }

        return builder.build();
    }

    @Bean
    @ConditionalOnMissingBean
    public ObjectMapper objectMapper() {
        return new ObjectMapper();
    }
}
