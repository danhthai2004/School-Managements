package com.schoolmanagement.backend.repo.grade;

import com.schoolmanagement.backend.domain.entity.admin.Semester;
import com.schoolmanagement.backend.domain.entity.classes.ClassRoom;
import com.schoolmanagement.backend.domain.entity.grade.GradeEntryLock;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface GradeEntryLockRepository extends JpaRepository<GradeEntryLock, UUID> {

    Optional<GradeEntryLock> findByClassRoomAndSemester(ClassRoom classRoom, Semester semester);

    Optional<GradeEntryLock> findByClassRoomIdAndSemesterId(UUID classId, UUID semesterId);

    List<GradeEntryLock> findAllBySemester(Semester semester);

    /**
     * Check if a specific class is locked for grade entry in a given semester.
     */
    @Query("SELECT CASE WHEN COUNT(l) > 0 THEN true ELSE false END " +
           "FROM GradeEntryLock l " +
           "WHERE l.classRoom.id = :classId AND l.semester.id = :semesterId AND l.isLocked = true")
    boolean isLocked(@Param("classId") UUID classId, @Param("semesterId") UUID semesterId);
}
