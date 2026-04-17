package com.schoolmanagement.backend.repo.grade;

import com.schoolmanagement.backend.domain.entity.grade.SubGrade;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface SubGradeRepository extends JpaRepository<SubGrade, UUID> {

    List<SubGrade> findByClassRoomIdAndSubjectIdAndSemesterAndAcademicYear(
            UUID classRoomId, UUID subjectId, Integer semester, String academicYear);

    List<SubGrade> findByClassRoomIdAndSubjectIdAndSemesterAndAcademicYearAndCategory(
            UUID classRoomId, UUID subjectId, Integer semester, String academicYear,
            SubGrade.SubGradeCategory category);

    void deleteByClassRoomIdAndSubjectIdAndSemesterAndAcademicYearAndCategoryAndSubIndex(
            UUID classRoomId, UUID subjectId, Integer semester, String academicYear,
            SubGrade.SubGradeCategory category, Integer subIndex);

    void deleteByStudentId(UUID studentId);
}
