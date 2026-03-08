package com.schoolmanagement.backend.repo;

import com.schoolmanagement.backend.domain.entity.ExamStudent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface ExamStudentRepository extends JpaRepository<ExamStudent, UUID> {
    List<ExamStudent> findByExamRoomId(UUID examRoomId);

    Optional<ExamStudent> findByExamRoomIdAndStudentId(UUID examRoomId, UUID studentId);

    long countByExamRoomId(UUID examRoomId);

    @Modifying
    @Query("DELETE FROM ExamStudent es WHERE es.examRoom.id IN " +
            "(SELECT er.id FROM ExamRoom er WHERE er.examSchedule.id IN " +
            "(SELECT esc.id FROM ExamSchedule esc WHERE esc.examSession.id = :sessionId))")
    void deleteBySessionId(@Param("sessionId") UUID sessionId);

    @Query("SELECT es FROM ExamStudent es " +
            "JOIN FETCH es.examRoom er " +
            "JOIN FETCH er.examSchedule esc " +
            "JOIN FETCH esc.subject " +
            "WHERE es.student.id = :studentId " +
            "AND esc.academicYear = :academicYear " +
            "AND esc.examSession.status != 'DRAFT' " +
            "ORDER BY esc.examDate, esc.startTime")
    List<ExamStudent> findByStudentAndAcademicYear(
            @Param("studentId") UUID studentId,
            @Param("academicYear") String academicYear);

    @Query("SELECT es FROM ExamStudent es " +
            "JOIN FETCH es.examRoom er " +
            "JOIN FETCH er.examSchedule esc " +
            "JOIN FETCH esc.subject " +
            "WHERE es.student.id = :studentId " +
            "AND esc.academicYear = :academicYear " +
            "AND esc.semester = :semester " +
            "AND esc.examSession.status != 'DRAFT' " +
            "ORDER BY esc.examDate, esc.startTime")
    List<ExamStudent> findByStudentAndAcademicYearAndSemester(
            @Param("studentId") UUID studentId,
            @Param("academicYear") String academicYear,
            @Param("semester") Integer semester);
}
