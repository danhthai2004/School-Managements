package com.schoolmanagement.backend.repo;

import com.schoolmanagement.backend.domain.entity.LessonSlot;
import com.schoolmanagement.backend.domain.entity.School;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface LessonSlotRepository extends JpaRepository<LessonSlot, UUID> {
    List<LessonSlot> findAllBySchoolOrderBySlotIndexAsc(School school);

    void deleteBySchoolId(UUID schoolId);
}
