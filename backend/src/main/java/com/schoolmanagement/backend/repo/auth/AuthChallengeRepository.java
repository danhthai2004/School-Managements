package com.schoolmanagement.backend.repo.auth;

import com.schoolmanagement.backend.domain.auth.AuthChallengeType;
import com.schoolmanagement.backend.domain.entity.auth.AuthChallenge;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface AuthChallengeRepository extends JpaRepository<AuthChallenge, UUID> {
    Optional<AuthChallenge> findByIdAndType(UUID id, AuthChallengeType type);

    void deleteByUserId(UUID userId);

    void deleteByUser(com.schoolmanagement.backend.domain.entity.auth.User user);
}
