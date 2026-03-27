package com.schoolmanagement.backend.repo.classes;

import com.schoolmanagement.backend.domain.entity.classes.LessonSlot;
import com.schoolmanagement.backend.domain.entity.admin.School;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface LessonSlotRepository extends JpaRepository<LessonSlot, UUID> {
    List<LessonSlot> findAllBySchoolOrderBySlotIndexAsc(School school);
}
