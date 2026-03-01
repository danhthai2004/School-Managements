package com.schoolmanagement.backend.repo;

import com.schoolmanagement.backend.domain.entity.School;
import com.schoolmanagement.backend.domain.entity.Timetable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface TimetableRepository extends JpaRepository<Timetable, UUID> {
    List<Timetable> findAllBySchoolOrderByCreatedAtDesc(School school);

    List<Timetable> findAllBySchoolAndAcademicYearAndSemester(School school, String academicYear, int semester);

    java.util.Optional<Timetable> findFirstBySchoolAndStatusOrderByCreatedAtDesc(School school,
            com.schoolmanagement.backend.domain.TimetableStatus status);

    void deleteBySchoolId(UUID schoolId);
}
