package com.schoolmanagement.backend.domain.entity.grade;

import com.schoolmanagement.backend.domain.entity.student.Student;
import com.schoolmanagement.backend.domain.entity.classes.Subject;
import com.schoolmanagement.backend.domain.entity.classes.ClassRoom;
import com.schoolmanagement.backend.domain.entity.admin.Semester;
import com.schoolmanagement.backend.domain.entity.teacher.Teacher;
import com.schoolmanagement.backend.domain.entity.auth.User;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "grades", indexes = {
                @Index(name = "idx_grade_student", columnList = "student_id"),
                @Index(name = "idx_grade_subject", columnList = "subject_id"),
                @Index(name = "idx_grade_class", columnList = "class_id")
}, uniqueConstraints = {
                @UniqueConstraint(columnNames = { "student_id", "subject_id", "class_id", "semester_id" })
})
public class Grade {
        @Id
        @GeneratedValue(strategy = GenerationType.UUID)
        private UUID id;

        @ManyToOne(fetch = FetchType.LAZY)
        @JoinColumn(name = "student_id", nullable = false)
        private Student student;

        @ManyToOne(fetch = FetchType.LAZY)
        @JoinColumn(name = "subject_id", nullable = false)
        private Subject subject;

        @ManyToOne(fetch = FetchType.LAZY)
        @JoinColumn(name = "class_id", nullable = false)
        private ClassRoom classRoom;

        @ManyToOne(fetch = FetchType.LAZY)
        @JoinColumn(name = "teacher_id", nullable = false)
        private Teacher teacher;

        @ManyToOne(fetch = FetchType.LAZY)
        @JoinColumn(name = "semester_id", nullable = false)
        private Semester semester;

        // Dynamic regular assessment scores (replaces fixed oralScore, test15min,
        // test45min)
        @OneToMany(mappedBy = "grade", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
        @OrderBy("scoreIndex ASC")
        @Builder.Default
        private java.util.List<RegularScore> regularScores = new java.util.ArrayList<>();

        // Legacy fixed score columns (kept for backward compatibility)
        // Scores
        @Column(name = "oral_score", precision = 4, scale = 2)
        private BigDecimal oralScore;

        @Column(name = "test_15min_score", precision = 4, scale = 2)
        private BigDecimal test15minScore;

        @Column(name = "test_45min_score", precision = 4, scale = 2)
        private BigDecimal test45minScore;

        @Column(name = "midterm_score", precision = 4, scale = 2)
        private BigDecimal midtermScore;

        @Column(name = "final_score", precision = 4, scale = 2)
        private BigDecimal finalScore;

        // Calculated
        @Column(name = "average_score", precision = 4, scale = 2)
        private BigDecimal averageScore;

        @Column(name = "performance_category", length = 20)
        private String performanceCategory;

        @Column(columnDefinition = "TEXT")
        private String notes;

        @Column(name = "recorded_at")
        @Builder.Default
        private Instant recordedAt = Instant.now();

        @ManyToOne(fetch = FetchType.LAZY)
        @JoinColumn(name = "recorded_by")
        private User recordedBy;

        @Column(name = "updated_at")
        private Instant updatedAt;

        @ManyToOne(fetch = FetchType.LAZY)
        @JoinColumn(name = "updated_by")
        private User updatedBy;
}
