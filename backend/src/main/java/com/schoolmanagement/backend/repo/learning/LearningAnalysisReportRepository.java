package com.schoolmanagement.backend.repo.learning;

import com.schoolmanagement.backend.domain.entity.admin.School;
import com.schoolmanagement.backend.domain.entity.admin.Semester;
import com.schoolmanagement.backend.domain.entity.learning.LearningAnalysisReport;
import com.schoolmanagement.backend.domain.entity.student.Student;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface LearningAnalysisReportRepository extends JpaRepository<LearningAnalysisReport, UUID> {

    /** Lấy báo cáo mới nhất của 1 học sinh (sắp xếp theo ngày tạo) */
    @Query("SELECT r FROM LearningAnalysisReport r WHERE r.student = :student " +
            "ORDER BY r.createdAt DESC LIMIT 1")
    Optional<LearningAnalysisReport> findLatestByStudent(@Param("student") Student student);

    /** Lấy báo cáo của 1 học sinh trong 1 kỳ cụ thể */
    Optional<LearningAnalysisReport> findByStudentAndSemester(Student student, Semester semester);

    /** Lấy toàn bộ lịch sử báo cáo của 1 học sinh (cho biểu đồ xu hướng) */
    List<LearningAnalysisReport> findAllByStudentOrderByCreatedAtDesc(Student student);

    /** Lấy tất cả báo cáo của 1 trường trong 1 kỳ (cho Admin Dashboard) */
    List<LearningAnalysisReport> findAllBySchoolAndSemester(School school, Semester semester);

    /** Lấy tất cả báo cáo của 1 lớp trong 1 kỳ (cho Giáo viên chủ nhiệm) */
    @Query("SELECT r FROM LearningAnalysisReport r WHERE r.classRoom.id = :classId " +
            "AND r.semester = :semester ORDER BY r.predictedGpa DESC")
    List<LearningAnalysisReport> findAllByClassAndSemester(
            @Param("classId") UUID classId,
            @Param("semester") Semester semester);

    /** Đếm số HS đã có báo cáo trong 1 kỳ (cho tiến trình Batch) */
    long countBySchoolAndSemester(School school, Semester semester);

    /** Lấy danh sách student_id đã có report trong 1 kỳ (tránh phân tích trùng) */
    @Query("SELECT r.student.id FROM LearningAnalysisReport r " +
            "WHERE r.school = :school AND r.semester = :semester")
    List<UUID> findAnalyzedStudentIds(
            @Param("school") School school,
            @Param("semester") Semester semester);
}
