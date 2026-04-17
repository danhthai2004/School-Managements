package com.schoolmanagement.backend.repo.admin;

import com.schoolmanagement.backend.domain.entity.admin.School;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface SchoolRepository extends JpaRepository<School, UUID> {
    Optional<School> findByCodeIgnoreCase(String code);
    boolean existsByCodeIgnoreCase(String code);
    java.util.List<School> findByPendingDeleteAtIsNotNull();
    java.util.List<School> findByPendingDeleteAtIsNull();
}
