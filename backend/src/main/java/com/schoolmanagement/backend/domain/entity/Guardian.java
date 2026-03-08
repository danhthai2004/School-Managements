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
@Table(name = "guardians", uniqueConstraints = {
        @UniqueConstraint(columnNames = "email")
})
public class Guardian {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    // student_id removed (moved to join table)

    @Column(name = "full_name", nullable = false, length = 100)
    private String fullName;

    @Column(length = 15)
    private String phone;

    @Column(length = 254)
    private String email;

    @Column(length = 50)
    private String relationship;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;

    @OneToMany(mappedBy = "guardian")
    @Builder.Default
    private java.util.List<Student> students = new java.util.ArrayList<>();
}
