package com.schoolmanagement.backend.repo.grade;

import com.schoolmanagement.backend.domain.entity.grade.Grade;
import com.schoolmanagement.backend.domain.entity.grade.GradeHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface GradeHistoryRepository extends JpaRepository<GradeHistory, UUID> {
    void deleteByGradeIn(List<Grade> grades);

    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("DELETE FROM GradeHistory e WHERE e.grade.student = :student")
    void deleteAllByStudent(
            @org.springframework.data.repository.query.Param("student") com.schoolmanagement.backend.domain.entity.student.Student student);

    org.springframework.data.domain.Page<GradeHistory> findAllByGrade_ClassRoomAndGrade_SemesterOrderByChangedAtDesc(
            com.schoolmanagement.backend.domain.entity.classes.ClassRoom classRoom,
            com.schoolmanagement.backend.domain.entity.admin.Semester semester,
            org.springframework.data.domain.Pageable pageable);

    org.springframework.data.domain.Page<GradeHistory> findAllByGrade_SemesterOrderByChangedAtDesc(
            com.schoolmanagement.backend.domain.entity.admin.Semester semester,
            org.springframework.data.domain.Pageable pageable);
}
