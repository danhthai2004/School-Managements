package com.schoolmanagement.backend.domain.entity.teacher;

import com.schoolmanagement.backend.domain.entity.admin.School;
import com.schoolmanagement.backend.domain.entity.auth.User;
import com.schoolmanagement.backend.domain.entity.classes.Subject;

import com.schoolmanagement.backend.domain.student.Gender;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.util.UUID;
import java.util.Set;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "teachers", indexes = {
        @Index(name = "idx_teacher_school", columnList = "school_id"),
        @Index(name = "idx_teacher_code", columnList = "teacher_code, school_id", unique = true),
        @Index(name = "idx_teacher_email", columnList = "email")
})
public class Teacher {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "teacher_code", nullable = false, length = 20)
    private String teacherCode;

    @Column(nullable = false, length = 100)
    private String fullName;

    @Column(name = "date_of_birth")
    private LocalDate dateOfBirth;

    @Enumerated(EnumType.STRING)
    @Column(length = 10)
    private Gender gender;

    @Column(length = 255)
    private String address;

    @Column(length = 254)
    private String email;

    @Column(length = 100)
    private String specialization;

    @Column(length = 15)
    private String phone;

    @Column(length = 100)
    private String degree;

    @Builder.Default
    @Column(nullable = false, length = 20)
    private String status = "ACTIVE"; // ACTIVE, INACTIVE

    @Builder.Default
    @Column(name = "max_periods_per_week", nullable = false)
    private Integer maxPeriodsPerWeek = 20;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "school_id", nullable = false)
    private School school;

    // Link to User account
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @Builder.Default
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(name = "teacher_subjects", joinColumns = @JoinColumn(name = "teacher_id"), inverseJoinColumns = @JoinColumn(name = "subject_id"))
    private Set<Subject> subjects = new java.util.HashSet<>();
}
