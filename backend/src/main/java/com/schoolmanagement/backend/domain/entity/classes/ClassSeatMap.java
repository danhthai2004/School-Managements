package com.schoolmanagement.backend.domain.entity.classes;

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
@Table(name = "class_seat_maps", indexes = {
        @Index(name = "idx_seat_map_classroom", columnList = "classroom_id", unique = true)
})
public class ClassSeatMap {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "classroom_id", nullable = false, unique = true)
    private ClassRoom classRoom;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String config; // JSON: grid config + student positions + object positions

    @Column(name = "updated_at", nullable = false)
    @Builder.Default
    private Instant updatedAt = Instant.now();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "updated_by")
    private User updatedBy;
}
