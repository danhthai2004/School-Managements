package com.schoolmanagement.backend.domain.entity.classes;

import com.schoolmanagement.backend.domain.entity.admin.School;
import com.schoolmanagement.backend.domain.entity.auth.User;

import com.schoolmanagement.backend.domain.classes.ClassDepartment;
import com.schoolmanagement.backend.domain.classes.ClassRoomStatus;
import com.schoolmanagement.backend.domain.exam.SessionType;
import jakarta.persistence.*;
import lombok.*;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "classrooms", indexes = {
        @Index(name = "idx_classroom_school", columnList = "school_id"),
        @Index(name = "idx_classroom_name_school_year", columnList = "name, school_id, academic_year", unique = true)
})
public class ClassRoom {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, length = 50)
    private String name; // "12A1", "10B2"

    @Column(nullable = false)
    private int grade; // 10, 11, 12

    @Column(name = "academic_year", nullable = false, length = 20)
    private String academicYear; // "2024-2025"

    @Column(nullable = false)
    private int maxCapacity; // Sĩ số (1-35)

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "room_id")
    private Room room; // Phòng học thực tế

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    @Builder.Default
    private ClassDepartment department = ClassDepartment.KHONG_PHAN_BAN;

    /** Buổi học chính của lớp (Sáng/Chiều) */
    @Enumerated(EnumType.STRING)
    @Column(length = 10)
    @Builder.Default
    private SessionType session = SessionType.SANG;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private ClassRoomStatus status = ClassRoomStatus.ACTIVE;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "school_id", nullable = false)
    private School school;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "homeroom_teacher_id")
    private User homeroomTeacher;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "combination_id")
    private Combination combination;
}
