package com.schoolmanagement.backend.repo;

import com.schoolmanagement.backend.domain.entity.School;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface SchoolRepository extends JpaRepository<School, UUID> {
    Optional<School> findByCodeIgnoreCase(String code);

    boolean existsByCodeIgnoreCase(String code);

    List<School> findByPendingDeleteAtIsNotNull();

    List<School> findByPendingDeleteAtBefore(Instant time);
}
