package com.schoolmanagement.backend.domain.entity.auth;

import com.schoolmanagement.backend.domain.entity.admin.School;

import com.schoolmanagement.backend.domain.auth.Role;
import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;
import java.time.LocalDate;
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
    @Builder.Default
    @Column(nullable = false)
    private boolean firstLogin = true;

    @Builder.Default
    @Column(nullable = false)
    private boolean enabled = true;

    /**
     * SYSTEM_ADMIN has no school. Others typically belong to a school.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "school_id")
    private School school;

    /**
     * When set, user is marked for pending deletion.
     * User will be automatically deleted 14 days after this timestamp.
     */
    private Instant pendingDeleteAt;

    /**
     * Stores the enabled state before marking for pending delete.
     * Used to restore the correct state when un-marking from pending delete.
     */
    private Boolean wasEnabledBeforePendingDelete;

    @Column(length = 20)
    private String phone;

    private LocalDate dateOfBirth;

    @Column(length = 255)
    private String address;

    @Column(length = 1000)
    private String bio;

    @Builder.Default
    @Column(nullable = false, columnDefinition = "boolean default false")
    private boolean isTwoFactorEnabled = false;

    @Column(length = 64)
    private String twoFactorSecret;
}
