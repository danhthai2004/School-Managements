package com.schoolmanagement.backend.domain.entity;

import com.schoolmanagement.backend.domain.AuthChallengeType;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "auth_challenges", indexes = {
        @Index(name = "idx_challenge_user_type", columnList = "user_id,type"),
        @Index(name = "idx_challenge_expires", columnList = "expiresAt")
})
public class AuthChallenge {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private AuthChallengeType type;

    /**
     * BCrypt hash of the 6-digit OTP.
     */
    @Column(nullable = false, length = 100)
    private String codeHash;

    @Column(nullable = false)
    private Instant expiresAt;

    @Column(nullable = false)
    private int attempts = 0;

    private Instant verifiedAt;

    private Instant consumedAt;

    public boolean isExpired(Instant now) {
        return expiresAt.isBefore(now);
    }

    public boolean isVerified() {
        return verifiedAt != null;
    }

    public boolean isConsumed() {
        return consumedAt != null;
    }
}
