package com.schoolmanagement.backend.domain.entity;

import com.schoolmanagement.backend.domain.Gender;
import com.schoolmanagement.backend.domain.StudentStatus;
import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDate;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "students", indexes = {
        @Index(name = "idx_student_school", columnList = "school_id"),
        @Index(name = "idx_student_code", columnList = "student_code, school_id", unique = true)
})
public class Student {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "student_code", nullable = false, length = 20)
    private String studentCode;

    @Column(nullable = false, length = 100)
    private String fullName;

    @Column(name = "date_of_birth")
    private LocalDate dateOfBirth;

    @Enumerated(EnumType.STRING)
    @Column(length = 10)
    private Gender gender;

    @Column(name = "birth_place", length = 100)
    private String birthPlace;

    @Column(length = 255)
    private String address;

    @Column(length = 254)
    private String email;

    @Column(length = 15)
    private String phone;

    @Column(name = "avatar_url")
    private String avatarUrl;

    @Column(name = "cccd_url")
    private String cccdUrl;

    @Column(name = "birth_cert_url")
    private String birthCertUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private StudentStatus status = StudentStatus.ACTIVE;

    @Column(name = "enrollment_date")
    private LocalDate enrollmentDate;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "school_id", nullable = false)
    private School school;

    // Link to User account (optional, created later)
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;
}
