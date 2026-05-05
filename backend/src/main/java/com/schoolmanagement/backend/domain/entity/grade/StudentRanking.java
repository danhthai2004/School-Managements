package com.schoolmanagement.backend.domain.entity.grade;

import com.schoolmanagement.backend.domain.entity.admin.Semester;
import com.schoolmanagement.backend.domain.entity.classes.ClassRoom;
import com.schoolmanagement.backend.domain.entity.student.Student;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

/**
 * Lưu trữ kết quả học tập (GPA và Xếp loại) của học sinh trong một học kỳ.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "student_rankings", uniqueConstraints = {
        @UniqueConstraint(name = "uk_student_semester_ranking", columnNames = {"student_id", "semester_id"})
}, indexes = {
        @Index(name = "idx_ranking_class_semester", columnList = "class_id, semester_id"),
        @Index(name = "idx_ranking_gpa", columnList = "gpa DESC")
})
public class StudentRanking {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "student_id", nullable = false)
    private Student student;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "class_id", nullable = false)
    private ClassRoom classRoom;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "semester_id", nullable = false)
    private Semester semester;

    /**
     * Điểm trung bình học kỳ (Grade Point Average)
     */
    @Column(precision = 4, scale = 2)
    private BigDecimal gpa;

    /**
     * Hạnh kiểm (Tốt, Khá, Trung bình, Yếu)
     * Có thể được cập nhật từ module khác.
     */
    @Column(length = 50)
    private String conduct;

    /**
     * Học lực / Xếp loại học tập (Giỏi, Khá, Trung bình, Yếu, Kém)
     */
    @Column(name = "performance_category", length = 50)
    private String performanceCategory;

    /**
     * Xếp hạng trong lớp (dựa trên GPA)
     */
    @Column(name = "rank_in_class")
    private Integer rankInClass;

    @Column(name = "updated_at")
    @Builder.Default
    private Instant updatedAt = Instant.now();
}
