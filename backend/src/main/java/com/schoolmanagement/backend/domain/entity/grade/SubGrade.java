package com.schoolmanagement.backend.domain.entity.grade;

import jakarta.persistence.*;
import lombok.*;

import java.util.UUID;
import com.schoolmanagement.backend.domain.entity.student.Student;
import com.schoolmanagement.backend.domain.entity.classes.Subject;
import com.schoolmanagement.backend.domain.entity.classes.ClassRoom;

@Entity
@Table(name = "sub_grades")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SubGrade {

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
    @JoinColumn(name = "class_room_id", nullable = false)
    private ClassRoom classRoom;

    @Column(name = "academic_year", nullable = false)
    private String academicYear;

    @Column(nullable = false)
    private Integer semester; // 1 or 2

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private SubGradeCategory category;

    @Column(name = "sub_index", nullable = false)
    private Integer subIndex; // 1, 2, 3... occurrence within same category

    @Column(nullable = false)
    private Double value;

    public enum SubGradeCategory {
        ORAL, // Điểm miệng
        TEST_15MIN // Kiểm tra 15 phút
    }
}
