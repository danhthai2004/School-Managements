package com.schoolmanagement.backend.security;

import com.schoolmanagement.backend.domain.entity.User;
import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.Instant;
import java.util.Date;
import java.util.Map;
import java.util.UUID;

@Service
public class JwtService {

    private final SecretKey key;
    private final Duration accessTtl;
    private final Duration resetTtl;

    public JwtService(
            @Value("${app.jwt.secret}") String secret,
            @Value("${app.jwt.access-ttl-seconds:604800}") long accessTtlSeconds,
            @Value("${app.jwt.reset-ttl-seconds:600}") long resetTtlSeconds
    ) {
        if (secret == null || secret.trim().length() < 32) {
            // For local dev only. In production, set APP_JWT_SECRET env to >= 32 chars.
            secret = "dev-dev-dev-dev-dev-dev-dev-dev-dev-dev-dev-dev";
        }
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.accessTtl = Duration.ofSeconds(accessTtlSeconds);
        this.resetTtl = Duration.ofSeconds(resetTtlSeconds);
    }

    public String issueAccessToken(User user) {
        Instant now = Instant.now();
        Instant exp = now.plus(accessTtl);
        return Jwts.builder()
                .setSubject(user.getId().toString())
                .setIssuedAt(Date.from(now))
                .setExpiration(Date.from(exp))
                .addClaims(Map.of(
                        "kind", TokenKind.ACCESS.name(),
                        "email", user.getEmail(),
                        "role", user.getRole().name()
                ))
                .signWith(key, Jwts.SIG.HS256)
                .compact();
    }

    public String issueResetToken(UUID userId, UUID challengeId) {
        Instant now = Instant.now();
        Instant exp = now.plus(resetTtl);
        return Jwts.builder()
                .setSubject(userId.toString())
                .setIssuedAt(Date.from(now))
                .setExpiration(Date.from(exp))
                .addClaims(Map.of(
                        "kind", TokenKind.RESET.name(),
                        "challengeId", challengeId.toString()
                ))
                .signWith(key, Jwts.SIG.HS256)
                .compact();
    }

    public Jws<Claims> parse(String token) {
        return Jwts.parser().verifyWith(key).build().parseSignedClaims(token);
    }

    public UUID requireSubjectUserId(String token) {
        var claims = parse(token).getPayload();
        return UUID.fromString(claims.getSubject());
    }

    public TokenKind getKind(String token) {
        var claims = parse(token).getPayload();
        var kind = claims.get("kind", String.class);
        return TokenKind.valueOf(kind);
    }

    public UUID getChallengeId(String token) {
        var claims = parse(token).getPayload();
        var id = claims.get("challengeId", String.class);
        return id == null ? null : UUID.fromString(id);
    }
}
