package com.schoolmanagement.backend.repo;

import com.schoolmanagement.backend.domain.entity.Combination;
import com.schoolmanagement.backend.domain.entity.School;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface CombinationRepository extends JpaRepository<Combination, UUID> {
    List<Combination> findAllBySchool(School school);
}
