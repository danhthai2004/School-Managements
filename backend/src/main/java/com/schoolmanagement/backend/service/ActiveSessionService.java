package com.schoolmanagement.backend.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.UUID;

/**
 * No-op stub for ActiveSessionService.
 * Redis has been removed from the project, so session management is now stateless (JWT only).
 * This stub keeps the API intact for any callers that haven't been updated.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ActiveSessionService {

    // All methods are no-ops — JWT is now the only auth mechanism

    public void createSession(UUID userId, String jti, String deviceInfo) {
        log.debug("ActiveSessionService.createSession (no-op) - userId={}, jti={}", userId, jti);
    }

    public boolean isSessionValid(UUID userId, String jti) {
        // Always valid (stateless JWT — checked via signature/expiry only)
        return true;
    }

    public void revokeSession(UUID userId, String jti) {
        log.debug("ActiveSessionService.revokeSession (no-op) - userId={}, jti={}", userId, jti);
    }

    public void revokeAllOtherSessions(UUID userId, String currentJti) {
        log.debug("ActiveSessionService.revokeAllOtherSessions (no-op) - userId={}", userId);
    }

    public void revokeAllSessions(UUID userId) {
        log.debug("ActiveSessionService.revokeAllSessions (no-op) - userId={}", userId);
    }
}
