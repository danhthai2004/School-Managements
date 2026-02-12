package com.schoolmanagement.backend.repo;

import com.schoolmanagement.backend.domain.entity.Attendance;
import com.schoolmanagement.backend.domain.entity.AttendanceSession;
import com.schoolmanagement.backend.domain.entity.Student;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface AttendanceRepository extends JpaRepository<Attendance, UUID> {

        List<Attendance> findAllBySession(AttendanceSession session);

        List<Attendance> findAllByStudent(Student student);

        List<Attendance> findAllBySessionIn(List<AttendanceSession> sessions);

        long countBySessionAndStatus(AttendanceSession session, String status);

        long countByStudentAndStatus(Student student, String status);

        @Modifying
        @Query("DELETE FROM Attendance e WHERE e.student = :student")
        void deleteAllByStudent(@Param("student") Student student);

        @Query("SELECT a FROM Attendance a WHERE a.session IN :sessions AND a.status = :status")
        List<Attendance> findAllBySessionsAndStatus(@Param("sessions") List<AttendanceSession> sessions,
                        @Param("status") String status);

        @Query("SELECT a.student, COUNT(a) FROM Attendance a WHERE a.session IN :sessions AND a.status = 'ABSENT' GROUP BY a.student HAVING COUNT(a) >= :threshold")
        List<Object[]> findChronicAbsentees(@Param("sessions") List<AttendanceSession> sessions,
                        @Param("threshold") long threshold);

        @Modifying
        void deleteAllBySessionIn(List<AttendanceSession> sessions);
}
