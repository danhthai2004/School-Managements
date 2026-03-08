package com.schoolmanagement.backend.security;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.jwt")
public class JwtProperties {
    /**
     * Secret key for signing JWTs. Must be at least 32 characters.
     */
    private String secret;

    /**
     * Access token TTL in seconds. Default is 7 days.
     */
    private long accessTtlSeconds = 604800;

    /**
     * Reset token TTL in seconds. Default is 10 minutes.
     */
    private long resetTtlSeconds = 600;

    public String getSecret() {
        return secret;
    }

    public void setSecret(String secret) {
        this.secret = secret;
    }

    public long getAccessTtlSeconds() {
        return accessTtlSeconds;
    }

    public void setAccessTtlSeconds(long accessTtlSeconds) {
        this.accessTtlSeconds = accessTtlSeconds;
    }

    public long getResetTtlSeconds() {
        return resetTtlSeconds;
    }

    public void setResetTtlSeconds(long resetTtlSeconds) {
        this.resetTtlSeconds = resetTtlSeconds;
    }
}
