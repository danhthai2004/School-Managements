package com.schoolmanagement.backend.repo.grade;

import com.schoolmanagement.backend.domain.entity.admin.School;
import com.schoolmanagement.backend.domain.entity.grade.GradingConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface GradingConfigRepository extends JpaRepository<GradingConfig, UUID> {

    Optional<GradingConfig> findBySchool(School school);

    Optional<GradingConfig> findBySchoolId(UUID schoolId);
}
