package com.schoolmanagement.backend.repo.grade;

import com.schoolmanagement.backend.domain.entity.admin.Semester;
import com.schoolmanagement.backend.domain.entity.classes.ClassRoom;
import com.schoolmanagement.backend.domain.entity.grade.StudentRanking;
import com.schoolmanagement.backend.domain.entity.student.Student;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface StudentRankingRepository extends JpaRepository<StudentRanking, UUID> {
    Optional<StudentRanking> findByStudentAndSemester(Student student, Semester semester);
    List<StudentRanking> findAllByClassRoomAndSemesterOrderByGpaDesc(ClassRoom classRoom, Semester semester);
    
    @org.springframework.data.jpa.repository.Modifying
    @org.springframework.data.jpa.repository.Query("DELETE FROM StudentRanking r WHERE r.student = :student")
    void deleteAllByStudent(@org.springframework.data.repository.query.Param("student") Student student);
}
