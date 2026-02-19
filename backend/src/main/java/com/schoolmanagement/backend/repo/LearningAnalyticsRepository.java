package com.schoolmanagement.backend.repo;

import com.schoolmanagement.backend.domain.entity.LearningAnalytics;
import com.schoolmanagement.backend.domain.entity.Student;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface LearningAnalyticsRepository extends JpaRepository<LearningAnalytics, UUID> {
    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("DELETE FROM LearningAnalytics e WHERE e.student = :student")
    void deleteAllByStudent(@org.springframework.data.repository.query.Param("student") Student student);
}
