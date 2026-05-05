package com.schoolmanagement.backend.domain.entity.grade;

import com.schoolmanagement.backend.domain.entity.admin.School;
import com.schoolmanagement.backend.domain.entity.auth.User;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

/**
 * Cấu hình trọng số chấm điểm cho từng trường.
 * Mỗi trường chỉ có 1 bản ghi cấu hình duy nhất (1-to-1 với School).
 *
 * Default weights: Regular=1, Midterm=2, Final=3 (theo quy định của Bộ GD&ĐT).
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "grading_config", uniqueConstraints = {
        @UniqueConstraint(name = "uk_grading_config_school", columnNames = "school_id")
})
public class GradingConfig {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "school_id", nullable = false, unique = true)
    private School school;

    /**
     * Hệ số cho Điểm Thường xuyên (mặc định: 1)
     */
    @Column(name = "regular_weight", nullable = false)
    @Builder.Default
    private int regularWeight = 1;

    /**
     * Hệ số cho Điểm Giữa kỳ (mặc định: 2)
     */
    @Column(name = "midterm_weight", nullable = false)
    @Builder.Default
    private int midtermWeight = 2;

    /**
     * Hệ số cho Điểm Cuối kỳ (mặc định: 3)
     */
    @Column(name = "final_weight", nullable = false)
    @Builder.Default
    private int finalWeight = 3;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "updated_by")
    private User updatedBy;

    @Column(name = "updated_at")
    @Builder.Default
    private Instant updatedAt = Instant.now();

    /**
     * Returns a default config (not persisted) for use when no config exists in DB.
     */
    public static GradingConfig defaultConfig() {
        return GradingConfig.builder()
                .regularWeight(1)
                .midtermWeight(2)
                .finalWeight(3)
                .build();
    }
}
