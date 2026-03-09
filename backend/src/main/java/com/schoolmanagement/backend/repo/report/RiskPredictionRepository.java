package com.schoolmanagement.backend.repo.report;

import com.schoolmanagement.backend.domain.entity.report.RiskPrediction;
import com.schoolmanagement.backend.domain.entity.student.Student;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface RiskPredictionRepository extends JpaRepository<RiskPrediction, UUID> {
    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("DELETE FROM RiskPrediction e WHERE e.student = :student")
    void deleteAllByStudent(@org.springframework.data.repository.query.Param("student") Student student);
}
