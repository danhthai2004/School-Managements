package com.schoolmanagement.backend.repo.exam;

import com.schoolmanagement.backend.domain.entity.classes.ClassRoom;
import com.schoolmanagement.backend.domain.entity.exam.ExamSchedule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface ExamScheduleRepository extends JpaRepository<ExamSchedule, UUID> {
    void deleteAllByClassRoom(ClassRoom classRoom);

    java.util.List<ExamSchedule> findByExamSessionIdOrderByExamDate(UUID examSessionId);

    void deleteByExamSession_Id(UUID examSessionId);

    java.util.List<ExamSchedule> findByExamDateAndStatus(java.time.LocalDate examDate,
            com.schoolmanagement.backend.domain.exam.ExamStatus status);

    java.util.List<ExamSchedule> findByExamSession_Semester_Id(UUID semesterId);
}
