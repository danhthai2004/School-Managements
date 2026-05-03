package com.schoolmanagement.backend.service.auth;

import com.schoolmanagement.backend.dto.auth.AuthResponse;
import com.schoolmanagement.backend.exception.ApiException;
import com.schoolmanagement.backend.repo.auth.UserRepository;
import com.schoolmanagement.backend.security.JwtService;
import com.schoolmanagement.backend.util.RandomUtil;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Mobile OAuth Polling Flow for Expo Go:
 * 1. Mobile generates sessionId, opens /api/auth/google/mobile/start?sessionId=... in WebBrowser
 * 2. Backend redirects to Google OAuth with backend callback URL
 * 3. Google redirects to /api/auth/google/mobile/callback?code=...&state=sessionId
 * 4. Backend exchanges code → idToken → verifies → issues JWT → stores in session map
 * 5. Mobile polls /api/auth/google/mobile/poll?sessionId=... until JWT is ready
 */
@Slf4j
@Service
public class MobileOAuthService {

    private static final int SESSION_TTL_MINUTES = 5;

    record SessionEntry(AuthResponse response, Instant expiresAt, String error) {}

    // In-memory store: sessionId → result (expires after 5 min)
    private final Map<String, SessionEntry> sessions = new ConcurrentHashMap<>();

    private final String webClientId;
    private final String webClientSecret;
    private final String backendBaseUrl;
    private final AuthService authService;
    private final UserRepository users;
    private final JwtService jwt;

    public MobileOAuthService(
            @Value("${google.oauth.client-id:}") String webClientId,
            @Value("${google.oauth.client-secret:}") String webClientSecret,
            @Value("${app.backend-url:https://rhinological-izabella-superbusily.ngrok-free.dev}") String backendBaseUrl,
            AuthService authService,
            UserRepository users,
            JwtService jwt) {
        this.webClientId = webClientId;
        this.webClientSecret = webClientSecret;
        this.backendBaseUrl = backendBaseUrl.stripTrailing().replaceAll("/$", "");
        this.authService = authService;
        this.users = users;
        this.jwt = jwt;
    }

    /**
     * Build Google OAuth authorization URL that redirects back to the backend.
     */
    public String buildGoogleAuthUrl(String sessionId) {
        String callbackUrl = backendBaseUrl + "/api/auth/google/mobile/callback";
        return "https://accounts.google.com/o/oauth2/v2/auth" +
                "?client_id=" + webClientId +
                "&redirect_uri=" + urlEncode(callbackUrl) +
                "&response_type=code" +
                "&scope=" + urlEncode("openid email profile") +
                "&state=" + sessionId +
                "&access_type=offline" +
                "&prompt=select_account";
    }

    /**
     * Exchange authorization code for ID token, then authenticate user.
     * Called from the OAuth callback endpoint.
     */
    @org.springframework.transaction.annotation.Transactional
    public void handleCallback(String code, String sessionId) {
        try {
            String callbackUrl = backendBaseUrl + "/api/auth/google/mobile/callback";
            String idToken = exchangeCodeForIdToken(code, callbackUrl);
            AuthResponse response = authService.loginWithGoogle(idToken);
            storeResult(sessionId, response, null);
            log.info("[MobileOAuth] Success for sessionId={}", sessionId);
        } catch (Exception e) {
            log.error("[MobileOAuth] Error for sessionId={}: {}", sessionId, e.getMessage());
            storeResult(sessionId, null, e.getMessage());
        }
    }

    /**
     * Poll for the result of an OAuth session.
     * Returns null if not yet complete.
     */
    public AuthResponse poll(String sessionId) {
        SessionEntry entry = sessions.get(sessionId);
        if (entry == null) return null;

        if (Instant.now().isAfter(entry.expiresAt())) {
            sessions.remove(sessionId);
            throw new ApiException(HttpStatus.GONE, "Phiên đăng nhập đã hết hạn. Vui lòng thử lại.");
        }

        if (entry.error() != null) {
            sessions.remove(sessionId);
            throw new ApiException(HttpStatus.UNAUTHORIZED, entry.error());
        }

        if (entry.response() != null) {
            sessions.remove(sessionId);
            return entry.response();
        }

        return null; // still pending
    }

    // ── private helpers ────────────────────────────────────────────────────────

    private void storeResult(String sessionId, AuthResponse response, String error) {
        sessions.put(sessionId, new SessionEntry(response, Instant.now().plus(SESSION_TTL_MINUTES, ChronoUnit.MINUTES), error));
    }

    private String exchangeCodeForIdToken(String code, String redirectUri) {
        try {
            var client = java.net.http.HttpClient.newHttpClient();
            String body = "code=" + urlEncode(code) +
                    "&client_id=" + urlEncode(webClientId) +
                    "&client_secret=" + urlEncode(webClientSecret) +
                    "&redirect_uri=" + urlEncode(redirectUri) +
                    "&grant_type=authorization_code";

            var request = java.net.http.HttpRequest.newBuilder()
                    .uri(java.net.URI.create("https://oauth2.googleapis.com/token"))
                    .header("Content-Type", "application/x-www-form-urlencoded")
                    .POST(java.net.http.HttpRequest.BodyPublishers.ofString(body))
                    .build();

            var response = client.send(request, java.net.http.HttpResponse.BodyHandlers.ofString());
            String responseBody = response.body();
            log.debug("[MobileOAuth] Token response: {}", responseBody);

            // Parse id_token from JSON response
            com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();
            com.fasterxml.jackson.databind.JsonNode json = mapper.readTree(responseBody);

            if (json.has("error")) {
                throw new ApiException(HttpStatus.UNAUTHORIZED,
                        "Google token exchange thất bại: " + json.path("error_description").asText());
            }

            String idToken = json.path("id_token").asText(null);
            if (idToken == null || idToken.isBlank()) {
                throw new ApiException(HttpStatus.UNAUTHORIZED, "Không nhận được id_token từ Google.");
            }
            return idToken;
        } catch (ApiException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Lỗi kết nối Google: " + ex.getMessage());
        }
    }

    private static String urlEncode(String value) {
        try {
            return java.net.URLEncoder.encode(value, java.nio.charset.StandardCharsets.UTF_8);
        } catch (Exception e) {
            return value;
        }
    }
}
