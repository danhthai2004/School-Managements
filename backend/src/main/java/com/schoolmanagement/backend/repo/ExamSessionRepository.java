package com.schoolmanagement.backend.repo;

import com.schoolmanagement.backend.domain.ExamSessionStatus;
import com.schoolmanagement.backend.domain.entity.ExamSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ExamSessionRepository extends JpaRepository<ExamSession, UUID> {
    List<ExamSession> findBySchoolIdAndAcademicYearAndSemester(UUID schoolId, String academicYear, Integer semester);

    List<ExamSession> findBySchoolIdOrderByStartDateDesc(UUID schoolId);

    Optional<ExamSession> findByIdAndSchoolId(UUID id, UUID schoolId);

    List<ExamSession> findBySchoolIdAndStatus(UUID schoolId, ExamSessionStatus status);
}
