package com.schoolmanagement.backend.repo;

import com.schoolmanagement.backend.domain.entity.Grade;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface GradeRepository extends JpaRepository<Grade, UUID> {
        List<Grade> findByClassRoomIdAndSubjectIdAndSemesterAndAcademicYear(
                        UUID classRoomId, UUID subjectId, Integer semester, String academicYear);

        void deleteByClassRoomIdAndSubjectIdAndSemesterAndAcademicYear(
                        UUID classRoomId, UUID subjectId, Integer semester, String academicYear);

        void deleteByStudentId(UUID studentId);

        List<Grade> findAllByStudentId(UUID studentId);

        List<Grade> findAllByClassRoom_SchoolAndAcademicYearAndSemester(
                        com.schoolmanagement.backend.domain.entity.School school,
                        String academicYear, Integer semester);

        List<Grade> findAllByClassRoomAndSemester(
                        com.schoolmanagement.backend.domain.entity.ClassRoom classRoom,
                        Integer semester);

        @org.springframework.data.jpa.repository.Modifying
        @org.springframework.data.jpa.repository.Query("UPDATE Grade g SET g.classRoom = null WHERE g.classRoom.id = :classRoomId")
        void nullifyClassRoomId(@org.springframework.data.repository.query.Param("classRoomId") UUID classRoomId);
}
