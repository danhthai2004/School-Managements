package com.schoolmanagement.backend.repo.teacher;

import com.schoolmanagement.backend.domain.entity.teacher.ExamInvigilator;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import com.schoolmanagement.backend.domain.entity.admin.Semester;
import com.schoolmanagement.backend.domain.entity.teacher.Teacher;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.UUID;

@Repository
public interface ExamInvigilatorRepository extends JpaRepository<ExamInvigilator, UUID> {
        List<ExamInvigilator> findByExamRoomId(UUID examRoomId);

        @Modifying
        @Query("DELETE FROM ExamInvigilator ei WHERE ei.examRoom.id IN " +
                        "(SELECT er.id FROM ExamRoom er WHERE er.examSchedule.id IN " +
                        "(SELECT esc.id FROM ExamSchedule esc WHERE esc.examSession.id = :sessionId))")
        void deleteBySessionId(@Param("sessionId") UUID sessionId);

        /**
         * Find all invigilator assignments for a teacher in a given time slot.
         * Used for conflict detection.
         */
        @Query("SELECT ei FROM ExamInvigilator ei " +
                        "JOIN ei.examRoom er " +
                        "JOIN er.examSchedule es " +
                        "WHERE ei.teacher.id = :teacherId " +
                        "AND es.examDate = :examDate " +
                        "AND es.startTime < :endTime " +
                        "AND es.endTime > :startTime")
        List<ExamInvigilator> findConflictingTeachers(
                        @Param("teacherId") UUID teacherId,
                        @Param("examDate") LocalDate examDate,
                        @Param("startTime") LocalTime startTime,
                        @Param("endTime") LocalTime endTime);

        @Query("SELECT ei FROM ExamInvigilator ei " +
                        "JOIN ei.examRoom er " +
                        "JOIN er.examSchedule es " +
                        "WHERE ei.teacher.id = :teacherId " +
                        "ORDER BY es.examDate ASC, es.startTime ASC")
        List<ExamInvigilator> findByTeacherOrderByExamDate(@Param("teacherId") UUID teacherId);

        @Query("SELECT ei FROM ExamInvigilator ei " +
                        "JOIN ei.examRoom er " +
                        "JOIN er.examSchedule es " +
                        "WHERE ei.teacher.id = :teacherId " +
                        "AND es.semester = :semester " +
                        "ORDER BY es.examDate ASC, es.startTime ASC")
        List<ExamInvigilator> findByTeacherAndSemesterOrderByExamDate(
                        @Param("teacherId") UUID teacherId,
                        @Param("semester") Semester semester);

        boolean existsByTeacher(Teacher teacher);
}
