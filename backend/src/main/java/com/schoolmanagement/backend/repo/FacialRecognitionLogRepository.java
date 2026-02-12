package com.schoolmanagement.backend.repo;

import com.schoolmanagement.backend.domain.entity.FacialRecognitionLog;
import com.schoolmanagement.backend.domain.entity.Student;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface FacialRecognitionLogRepository extends JpaRepository<FacialRecognitionLog, UUID> {
    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("DELETE FROM FacialRecognitionLog e WHERE e.recognizedStudent = :student")
    void deleteAllByRecognizedStudent(@org.springframework.data.repository.query.Param("student") Student student);
}
