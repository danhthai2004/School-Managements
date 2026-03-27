package com.schoolmanagement.backend.domain.entity.teacher;

import com.schoolmanagement.backend.domain.entity.classes.Subject;
import com.schoolmanagement.backend.domain.entity.admin.School;

import com.schoolmanagement.backend.domain.entity.classes.ClassRoom;

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
        @Index(name = "idx_assignment_class", columnList = "classroom_id"),
        @Index(name = "idx_assignment_teacher", columnList = "teacher_id"),
        @Index(name = "idx_assignment_subject", columnList = "subject_id")
})
public class TeacherAssignment {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "classroom_id", nullable = false)
    private ClassRoom classRoom;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "subject_id", nullable = false)
    private Subject subject;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "teacher_id", nullable = true) // Can be null initially
    private Teacher teacher;

    @Column(name = "lessons_per_week", nullable = false)
    private int lessonsPerWeek; // e.g., 4 periods of Math

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "school_id", nullable = false)
    private School school;
}
