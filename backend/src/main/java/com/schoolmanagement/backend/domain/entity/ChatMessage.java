package com.schoolmanagement.backend.domain.entity;

import com.schoolmanagement.backend.domain.ChatIntent;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

/**
 * Lưu lịch sử chat để audit, phân tích và debug.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "chat_messages", indexes = {
        @Index(name = "idx_chat_user", columnList = "user_id"),
        @Index(name = "idx_chat_created", columnList = "created_at")
})
public class ChatMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String message;

    @Enumerated(EnumType.STRING)
    @Column(length = 30)
    private ChatIntent intent;

    @Column(columnDefinition = "TEXT")
    private String response;

    @Column(name = "created_at", nullable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();
}
