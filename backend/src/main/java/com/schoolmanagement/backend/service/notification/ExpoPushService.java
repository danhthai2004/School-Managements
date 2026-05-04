package com.schoolmanagement.backend.service.notification;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Send push notifications via Expo Push API (used by Expo Go / Expo Push
 * Tokens).
 *
 * Endpoint: https://exp.host/--/api/v2/push/send
 */
@Slf4j
@Service
public class ExpoPushService {

    private static final String EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

    private final RestTemplate restTemplate = new RestTemplate();

    public void sendMulticast(String title, String body, String actionUrl, List<String> expoPushTokens) {
        if (expoPushTokens == null || expoPushTokens.isEmpty())
            return;

        // Expo recommends max 100 messages per request
        int chunkSize = 100;
        for (int i = 0; i < expoPushTokens.size(); i += chunkSize) {
            List<String> chunk = expoPushTokens.subList(i, Math.min(i + chunkSize, expoPushTokens.size()));
            try {
                List<Map<String, Object>> messages = new ArrayList<>();
                for (String to : chunk) {
                    if (to == null || to.isBlank())
                        continue;
                    Map<String, Object> msg = new HashMap<>();
                    msg.put("to", to);
                    msg.put("title", title);
                    msg.put("body", body);
                    if (actionUrl != null && !actionUrl.isBlank()) {
                        Map<String, Object> data = new HashMap<>();
                        data.put("actionUrl", actionUrl);
                        msg.put("data", data);
                    }
                    messages.add(msg);
                }
                if (messages.isEmpty())
                    continue;

                HttpHeaders headers = new HttpHeaders();
                headers.setContentType(MediaType.APPLICATION_JSON);

                HttpEntity<List<Map<String, Object>>> entity = new HttpEntity<>(messages, headers);
                ResponseEntity<String> res = restTemplate.postForEntity(EXPO_PUSH_URL, entity, String.class);
                log.info("Expo push sent: {} messages, status={}", messages.size(), res.getStatusCode());
            } catch (Exception ex) {
                log.error("Expo push error: {}", ex.getMessage(), ex);
            }
        }
    }
}
