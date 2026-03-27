package com.schoolmanagement.backend.repo.admin;

import com.schoolmanagement.backend.domain.admin.AcademicYearStatus;
import com.schoolmanagement.backend.domain.entity.admin.AcademicYear;
import com.schoolmanagement.backend.domain.entity.admin.School;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface AcademicYearRepository extends JpaRepository<AcademicYear, UUID> {

    List<AcademicYear> findBySchoolOrderByStartDateDesc(School school);

    Optional<AcademicYear> findBySchoolAndStatus(School school, AcademicYearStatus status);

    Optional<AcademicYear> findBySchoolAndName(School school, String name);

    List<AcademicYear> findBySchoolAndStatusIn(School school, List<AcademicYearStatus> statuses);

    Optional<AcademicYear> findByIdAndSchool(UUID id, School school);

    boolean existsBySchoolAndName(School school, String name);

    /**
     * Tìm năm học chứa ngày truyền vào.
     */
    @Query("SELECT a FROM AcademicYear a WHERE a.school = :school AND a.startDate <= :date AND a.endDate >= :date")
    Optional<AcademicYear> findCurrentBySchoolAndDate(
            @org.springframework.data.repository.query.Param("school") School school,
            @org.springframework.data.repository.query.Param("date") java.time.LocalDate date);
}
