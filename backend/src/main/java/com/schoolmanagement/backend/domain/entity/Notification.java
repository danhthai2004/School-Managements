package com.schoolmanagement.backend.domain.entity;

import com.schoolmanagement.backend.domain.NotificationScope;
import com.schoolmanagement.backend.domain.Role;
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
@Table(name = "notifications", indexes = {
        @Index(name = "idx_notification_created", columnList = "createdAt")
})
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String message;

    /**
     * Notification scope: ALL, SCHOOL, or ROLE.
     */
    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private NotificationScope scope;

    /**
     * Target school (only for SCHOOL scope).
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "target_school_id")
    private School targetSchool;

    /**
     * Target role (only for ROLE scope).
     */
    @Enumerated(EnumType.STRING)
    @Column(length = 30)
    private Role targetRole;

    /**
     * Admin who created this notification.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;

    /**
     * When the notification was created.
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
