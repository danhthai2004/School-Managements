package com.schoolmanagement.backend.repo.timetable;

import com.schoolmanagement.backend.domain.timetable.TimetableStatus;
import com.schoolmanagement.backend.domain.entity.admin.School;
import com.schoolmanagement.backend.domain.entity.timetable.Timetable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TimetableRepository extends JpaRepository<Timetable, UUID> {
  List<Timetable> findAllBySchoolOrderByCreatedAtDesc(School school);

  Optional<Timetable> findByStatusAndSchoolAndNameContains(TimetableStatus status, School school, String name);



  // Method added for Teacher Portal (fuuko branch)
  Optional<Timetable> findFirstBySchoolAndStatusOrderByCreatedAtDesc(School school, TimetableStatus status);

  Optional<Timetable> findFirstBySchoolAndSemesterAndStatusOrderByCreatedAtDesc(School school, com.schoolmanagement.backend.domain.entity.admin.Semester semester, TimetableStatus status);

  List<Timetable> findAllBySchoolAndSemester(School school, com.schoolmanagement.backend.domain.entity.admin.Semester semester);
}
