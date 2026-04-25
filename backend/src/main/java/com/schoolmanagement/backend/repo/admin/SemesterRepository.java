package com.schoolmanagement.backend.repo.admin;

import com.schoolmanagement.backend.domain.admin.SemesterStatus;
import com.schoolmanagement.backend.domain.entity.admin.AcademicYear;
import com.schoolmanagement.backend.domain.entity.admin.School;
import com.schoolmanagement.backend.domain.entity.admin.Semester;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface SemesterRepository extends JpaRepository<Semester, UUID> {

    List<Semester> findByAcademicYearOrderBySemesterNumber(AcademicYear academicYear);

    List<Semester> findBySchoolOrderByStartDateDesc(School school);

    Optional<Semester> findBySchoolAndStatus(School school, SemesterStatus status);

    /**
     * Tìm học kỳ hiện tại dựa trên ngày thực tế.
     * So sánh ngày hiện tại với startDate/endDate của học kỳ.
     */
    @Query("SELECT s FROM Semester s WHERE s.school = :school AND s.startDate <= :date AND s.endDate >= :date ORDER BY s.status ASC, s.startDate DESC")
    List<Semester> findCurrentBySchoolAndDate(@Param("school") School school, @Param("date") LocalDate date);

    /**
     * Tìm tất cả học kỳ ACTIVE cùng trường (để chuyển sang CLOSED khi activate
     * mới).
     */
    List<Semester> findBySchoolAndStatus(School school, SemesterStatus status,
            org.springframework.data.domain.Sort sort);

    List<Semester> findByAcademicYearAndStatus(AcademicYear academicYear, SemesterStatus status);

    boolean existsByAcademicYearAndSemesterNumber(AcademicYear academicYear, int semesterNumber);

    /**
     * Đếm số bản ghi liên quan để kiểm tra trước khi xóa.
     */
    @Query("SELECT COUNT(g) FROM Grade g WHERE g.semester = :semester")
    long countGradesBySemester(@Param("semester") Semester semester);

    @Query("SELECT COUNT(t) FROM Timetable t WHERE t.semester = :semester")
    long countTimetablesBySemester(@Param("semester") Semester semester);
}
