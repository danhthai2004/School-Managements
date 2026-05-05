package com.schoolmanagement.backend.domain.entity.grade;

import com.schoolmanagement.backend.domain.entity.admin.Semester;
import com.schoolmanagement.backend.domain.entity.auth.User;
import com.schoolmanagement.backend.domain.entity.classes.ClassRoom;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

/**
 * Khóa nhập điểm theo từng lớp trong một học kỳ.
 * Cho phép Admin khóa/mở khóa việc nhập điểm cho lớp cụ thể,
 * bổ sung cho cơ chế khóa toàn cục theo SemesterStatus.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "grade_entry_locks", uniqueConstraints = {
        @UniqueConstraint(name = "uk_grade_lock_class_semester",
                columnNames = {"class_id", "semester_id"})
}, indexes = {
        @Index(name = "idx_grade_lock_semester", columnList = "semester_id")
})
public class GradeEntryLock {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "class_id", nullable = false)
    private ClassRoom classRoom;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "semester_id", nullable = false)
    private Semester semester;

    @Column(name = "is_locked", nullable = false)
    @Builder.Default
    private boolean isLocked = true;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "locked_by")
    private User lockedBy;

    @Column(name = "locked_at")
    @Builder.Default
    private Instant lockedAt = Instant.now();

    @Column(columnDefinition = "TEXT")
    private String reason;
}
