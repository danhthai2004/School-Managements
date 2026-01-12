package com.schoolmanagement.backend.domain.entity;

import com.schoolmanagement.backend.domain.Role;
import jakarta.persistence.*;
import lombok.*;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "users", indexes = {
        @Index(name = "idx_user_email", columnList = "email", unique = true)
})
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, unique = true, length = 254)
    private String email;

    @Column(nullable = false)
    private String fullName;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private Role role;

    /**
     * BCrypt hash.
     */
    @Column(nullable = false, length = 100)
    private String passwordHash;

    /**
     * All roles must change password on first login except SYSTEM_ADMIN.
     */
    @Column(nullable = false)
    private boolean firstLogin = true;

    @Column(nullable = false)
    private boolean enabled = true;

    /**
     * SYSTEM_ADMIN has no school. Others typically belong to a school.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "school_id")
    private School school;
}
