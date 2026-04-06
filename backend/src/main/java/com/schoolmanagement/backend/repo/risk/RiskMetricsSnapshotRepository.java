package com.schoolmanagement.backend.repo.risk;

import com.schoolmanagement.backend.domain.entity.admin.School;
import com.schoolmanagement.backend.domain.entity.risk.RiskMetricsSnapshot;
import com.schoolmanagement.backend.domain.entity.student.Student;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface RiskMetricsSnapshotRepository extends JpaRepository<RiskMetricsSnapshot, UUID> {

        Optional<RiskMetricsSnapshot> findByStudentAndSnapshotDate(Student student, LocalDate snapshotDate);

        List<RiskMetricsSnapshot> findAllBySchoolAndSnapshotDate(School school, LocalDate snapshotDate);

        @Query("SELECT s FROM RiskMetricsSnapshot s WHERE s.school = :school AND s.snapshotDate = :date ORDER BY s.absentUnexcused7d DESC")
        List<RiskMetricsSnapshot> findAllBySchoolAndDateOrderByRisk(
                        @Param("school") School school, @Param("date") LocalDate date);

        @Query("SELECT s FROM RiskMetricsSnapshot s WHERE s.classRoom.id = :classId AND s.snapshotDate = :date")
        List<RiskMetricsSnapshot> findAllByClassAndDate(
                        @Param("classId") UUID classId, @Param("date") LocalDate date);

        /** Lấy snapshot mới nhất trước ngày hiện tại (dùng để tính trend) */
        @Query("SELECT s FROM RiskMetricsSnapshot s WHERE s.student = :student AND s.snapshotDate < :date ORDER BY s.snapshotDate DESC LIMIT 1")
        Optional<RiskMetricsSnapshot> findPreviousSnapshot(
                        @Param("student") Student student, @Param("date") LocalDate date);
}
