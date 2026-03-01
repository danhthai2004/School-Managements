package com.schoolmanagement.backend.domain.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;

@Entity
@Table(name = "grades")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
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
    @JoinColumn(name = "class_room_id")
    private ClassRoom classRoom;

    @Column(name = "academic_year", nullable = false)
    private String academicYear;

    @Column(nullable = false)
    private Integer semester; // 1 or 2

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private GradeType type;

    // For REGULAR assessment, which occurrence (1, 2, 3, or 4)
    @Column(name = "grade_index")
    private Integer gradeIndex;

    @Column(nullable = false)
    private Double value;

    public enum GradeType {
        REGULAR, // Đánh giá thường xuyên (hệ số 1)
        MID_TERM, // Giữa kỳ (hệ số 2)
        FINAL_TERM // Cuối kỳ (hệ số 3)
    }
}
