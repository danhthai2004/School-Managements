package com.schoolmanagement.backend.domain.entity.grade;

import com.schoolmanagement.backend.domain.entity.student.Student;
import com.schoolmanagement.backend.domain.entity.classes.Subject;
import com.schoolmanagement.backend.domain.entity.admin.School;

import com.schoolmanagement.backend.domain.grade.ScoreType;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

/**
 * Entity to store student scores/grades.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "scores", indexes = {
        @Index(name = "idx_score_student", columnList = "student_id"),
        @Index(name = "idx_score_subject", columnList = "subject_id"),
        @Index(name = "idx_score_semester", columnList = "academic_year, semester")
})
public class Score {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", nullable = false)
    private Student student;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "subject_id", nullable = false)
    private Subject subject;

    @Enumerated(EnumType.STRING)
    @Column(name = "score_type", nullable = false, length = 20)
    private ScoreType scoreType;

    @Column(nullable = false)
    private Double value;

    @Column(name = "academic_year", nullable = false, length = 20)
    private String academicYear;

    @Column(nullable = false)
    private Integer semester;

    @Column(name = "score_date")
    private LocalDate scoreDate;

    @Column(length = 500)
    private String note;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "school_id", nullable = false)
    private School school;

    @Column(name = "created_at", nullable = false)
    @Builder.Default
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at")
    private Instant updatedAt;

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = Instant.now();
    }
}
