package com.schoolmanagement.backend.domain.entity.report;

import com.schoolmanagement.backend.domain.entity.auth.User;

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
@Table(name = "activity_logs", indexes = {
        @Index(name = "idx_activity_log_created", columnList = "createdAt")
})
public class ActivityLog {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    /**
     * Action type, e.g. USER_CREATED, USER_DISABLED, LOGIN_SUCCESS, etc.
     */
    @Column(nullable = false, length = 50)
    private String action;

    /**
     * Admin who performed this action (nullable for system actions).
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "performed_by")
    private User performedBy;

    /**
     * Target user ID affected by this action (nullable).
     */
    private UUID targetUserId;

    /**
     * Additional details about the action (JSON or text).
     */
    @Column(columnDefinition = "TEXT")
    private String details;

    /**
     * When the action occurred.
     */
    @Column(nullable = false)
    private Instant createdAt;

    @PrePersist
    public void prePersist() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }
}
