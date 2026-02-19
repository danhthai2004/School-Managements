package com.schoolmanagement.backend.repo;

import com.schoolmanagement.backend.domain.entity.FacialRecognitionData;
import com.schoolmanagement.backend.domain.entity.Student;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface FacialRecognitionDataRepository extends JpaRepository<FacialRecognitionData, UUID> {
    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("DELETE FROM FacialRecognitionData e WHERE e.student = :student")
    void deleteAllByStudent(@org.springframework.data.repository.query.Param("student") Student student);
}
