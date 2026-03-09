package com.schoolmanagement.backend.domain.entity.timetable;

import com.schoolmanagement.backend.domain.entity.admin.School;

import com.schoolmanagement.backend.domain.timetable.TimetableStatus;
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
@Table(name = "timetables")
public class Timetable {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String name; // e.g., "TKB Học kỳ 1 - Năm học 2025-2026 - Bản 1"

    @Column(name = "academic_year", nullable = false)
    private String academicYear;

    @Column(nullable = false)
    private int semester; // 1 or 2

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private TimetableStatus status; // DRAFT, OFFICIAL, ARCHIVED

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "school_id", nullable = false)
    private School school;

    @Column(name = "created_at", nullable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at")
    private Instant updatedAt;

    @OneToMany(mappedBy = "timetable", cascade = CascadeType.ALL, orphanRemoval = true)
    @Builder.Default
    private java.util.List<TimetableDetail> timetableDetails = new java.util.ArrayList<>();
}
