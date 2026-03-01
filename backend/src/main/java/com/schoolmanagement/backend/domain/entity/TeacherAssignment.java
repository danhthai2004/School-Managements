package com.schoolmanagement.backend.domain.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "teacher_assignments", indexes = {
                @Index(name = "idx_assignment_teacher", columnList = "teacher_id"),
                @Index(name = "idx_assignment_subject", columnList = "subject_id"),
                @Index(name = "idx_assignment_school", columnList = "school_id")
}, uniqueConstraints = {
                @UniqueConstraint(name = "uk_teacher_subject_school", columnNames = { "teacher_id", "subject_id",
                                "school_id" })
})
public class TeacherAssignment {
        @Id
        @GeneratedValue(strategy = GenerationType.UUID)
        private UUID id;

        @ManyToOne(fetch = FetchType.LAZY)
        @JoinColumn(name = "subject_id", nullable = false)
        private Subject subject;

        @ManyToOne(fetch = FetchType.LAZY)
        @JoinColumn(name = "teacher_id", nullable = false)
        private Teacher teacher;

        @ManyToOne(fetch = FetchType.LAZY)
        @JoinColumn(name = "school_id", nullable = false)
        private School school;

        @Builder.Default
        @Column(name = "is_head_of_department", nullable = false, columnDefinition = "boolean not null default false")
        private boolean headOfDepartment = false;

        @Builder.Default
        @Column(name = "lessons_per_week", nullable = false)
        private int lessonsPerWeek = 0;
}
