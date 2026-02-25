package com.schoolmanagement.backend.repo;

import com.schoolmanagement.backend.domain.AuthChallengeType;
import com.schoolmanagement.backend.domain.entity.AuthChallenge;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface AuthChallengeRepository extends JpaRepository<AuthChallenge, UUID> {
    Optional<AuthChallenge> findByIdAndType(UUID id, AuthChallengeType type);

    void deleteByUser(com.schoolmanagement.backend.domain.entity.User user);
}
