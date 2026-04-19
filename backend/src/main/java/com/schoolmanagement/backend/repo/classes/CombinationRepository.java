package com.schoolmanagement.backend.repo.classes;

import com.schoolmanagement.backend.domain.entity.classes.Combination;
import com.schoolmanagement.backend.domain.entity.admin.School;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface CombinationRepository extends JpaRepository<Combination, UUID> {
    List<Combination> findAllBySchool(School school);
    void deleteBySchoolId(UUID schoolId);
}
