package com.schoolmanagement.backend.domain.entity.notification;

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
@Table(name = "homeroom_notification_recipients", uniqueConstraints = {
        @UniqueConstraint(columnNames = { "notification_id", "user_id" })
})
public class HomeroomNotificationRecipient {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "notification_id", nullable = false)
    private HomeroomNotification notification;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "recipient_name", nullable = false, length = 100)
    private String recipientName;

    @Column(name = "recipient_role", nullable = false, length = 20)
    private String recipientRole; // STUDENT or PARENT

    @Column(name = "is_read")
    @Builder.Default
    private boolean isRead = false;

    @Column(name = "read_at")
    private Instant readAt;

    @Column(name = "created_at", nullable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();
}
