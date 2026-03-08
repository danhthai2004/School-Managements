package com.schoolmanagement.backend.domain.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "daily_class_status", uniqueConstraints = {
        @UniqueConstraint(columnNames = { "classroom_id", "date" })
})
public class DailyClassStatus {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "classroom_id", nullable = false)
    private ClassRoom classRoom;

    @Column(nullable = false)
    private LocalDate date;

    @Column(name = "is_finalized", nullable = false)
    @Builder.Default
    private boolean isFinalized = false;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "finalized_by")
    private User finalizedBy;

    @Column(name = "finalized_at")
    private LocalDateTime finalizedAt;
}
