package com.schoolmanagement.backend.repo;

import com.schoolmanagement.backend.domain.entity.ClassRoom;
import com.schoolmanagement.backend.domain.entity.ExamSchedule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface ExamScheduleRepository extends JpaRepository<ExamSchedule, UUID> {
    void deleteAllByClassRoom(ClassRoom classRoom);
}
