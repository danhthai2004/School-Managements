package com.schoolmanagement.backend.repo;

import com.schoolmanagement.backend.domain.entity.SchoolTimetableSettings;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface SchoolTimetableSettingsRepository extends JpaRepository<SchoolTimetableSettings, UUID> {
    
    Optional<SchoolTimetableSettings> findBySchoolId(UUID schoolId);
    
    boolean existsBySchoolId(UUID schoolId);
    
    void deleteBySchoolId(UUID schoolId);
}
