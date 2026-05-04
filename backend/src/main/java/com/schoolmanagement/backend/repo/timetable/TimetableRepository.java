package com.schoolmanagement.backend.repo.timetable;

import com.schoolmanagement.backend.domain.timetable.TimetableStatus;
import com.schoolmanagement.backend.domain.entity.admin.School;
import com.schoolmanagement.backend.domain.entity.timetable.Timetable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import com.schoolmanagement.backend.domain.entity.admin.Semester;
import java.time.LocalDate;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface TimetableRepository extends JpaRepository<Timetable, UUID> {
  List<Timetable> findAllBySchoolOrderByCreatedAtDesc(School school);

  List<Timetable> findAllByStatus(TimetableStatus status);

  Optional<Timetable> findByStatusAndSchoolAndNameContains(TimetableStatus status, School school, String name);

  // Method added for Teacher Portal (fuuko branch)
  Optional<Timetable> findFirstBySchoolAndStatusOrderByCreatedAtDesc(School school, TimetableStatus status);

  Optional<Timetable> findFirstBySchoolAndSemesterAndStatusOrderByCreatedAtDesc(School school, Semester semester,
      TimetableStatus status);

  List<Timetable> findAllBySchoolAndSemester(School school, Semester semester);

  @Query("SELECT t FROM Timetable t WHERE t.school = :school AND t.semester.academicYear.name = :academicYear AND t.semester.semesterNumber = :semester")
  List<Timetable> findAllBySchoolAndAcademicYearAndSemester(@Param("school") School school,
      @Param("academicYear") String academicYear, @Param("semester") int semester);

  @Query("SELECT t FROM Timetable t WHERE t.school = :school " +
      "AND (t.status = com.schoolmanagement.backend.domain.timetable.TimetableStatus.OFFICIAL " +
      "OR t.status = com.schoolmanagement.backend.domain.timetable.TimetableStatus.ARCHIVED) " +
      "AND (t.appliedDate IS NULL OR t.appliedDate <= :date) " +
      "ORDER BY t.appliedDate DESC NULLS LAST, t.createdAt DESC")
  List<Timetable> findTimetableAtDateInternal(@Param("school") School school,
      @Param("date") LocalDate date);

  default Optional<Timetable> findTimetableAtDate(School school, LocalDate date) {
    return findTimetableAtDateInternal(school, date).stream().findFirst();
  }

  void deleteBySchoolId(UUID schoolId);
}
