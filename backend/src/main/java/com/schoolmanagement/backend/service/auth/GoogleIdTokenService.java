package com.schoolmanagement.backend.service.auth;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.jackson2.JacksonFactory;
import com.schoolmanagement.backend.exception.ApiException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.util.Collections;

@Service
public class GoogleIdTokenService {

    private final String clientId;
    private final GoogleIdTokenVerifier verifier;

    @SuppressWarnings("deprecation")
    public GoogleIdTokenService(@Value("${google.oauth.client-id:}") String clientId) {
        this.clientId = clientId == null ? "" : clientId.trim();
        this.verifier = new GoogleIdTokenVerifier.Builder(new NetHttpTransport(), JacksonFactory.getDefaultInstance())
                .setAudience(Collections.singletonList(this.clientId))
                .build();
    }

    public GoogleIdToken.Payload verify(String idTokenString) {
        if (clientId.isBlank()) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Google OAuth chưa được cấu hình (client id).");
        }
        try {
            GoogleIdToken idToken = verifier.verify(idTokenString);
            if (idToken == null) {
                throw new ApiException(HttpStatus.UNAUTHORIZED, "Google token không hợp lệ.");
            }
            GoogleIdToken.Payload payload = idToken.getPayload();
            Object emailVerified = payload.getEmailVerified();
            if (emailVerified instanceof Boolean b && !b) {
                throw new ApiException(HttpStatus.UNAUTHORIZED, "Email Google chưa được xác minh.");
            }
            return payload;
        } catch (ApiException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Google token không hợp lệ.");
        }
    }
}
