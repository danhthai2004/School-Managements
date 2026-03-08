package com.schoolmanagement.backend.repo;

import com.schoolmanagement.backend.domain.TimetableStatus;
import com.schoolmanagement.backend.domain.entity.School;
import com.schoolmanagement.backend.domain.entity.Timetable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TimetableRepository extends JpaRepository<Timetable, UUID> {
  List<Timetable> findAllBySchoolOrderByCreatedAtDesc(School school);

  Optional<Timetable> findByStatusAndSchoolAndNameContains(TimetableStatus status, School school, String name);

  List<Timetable> findAllBySchoolAndAcademicYearAndSemester(School school, String academicYear, int semester);

  // Method added for Teacher Portal (fuuko branch)
  Optional<Timetable> findFirstBySchoolAndStatusOrderByCreatedAtDesc(School school, TimetableStatus status);
}
