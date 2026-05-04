package com.schoolmanagement.backend.repo.risk;

import com.schoolmanagement.backend.domain.entity.admin.School;
import com.schoolmanagement.backend.domain.entity.risk.RiskAssessmentHistory;
import com.schoolmanagement.backend.domain.entity.student.Student;
import com.schoolmanagement.backend.domain.risk.TeacherFeedbackStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Repository
public interface RiskAssessmentHistoryRepository extends JpaRepository<RiskAssessmentHistory, UUID> {

        /** Lấy lịch sử rủi ro của 1 học sinh, sắp xếp theo ngày mới nhất */
        List<RiskAssessmentHistory> findAllByStudentOrderByAssessmentDateDesc(Student student);

        /** Lấy lịch sử rủi ro trong khoảng thời gian (dùng cho LineChart) */
        @Query("SELECT h FROM RiskAssessmentHistory h WHERE h.student = :student " +
                        "AND h.assessmentDate BETWEEN :startDate AND :endDate " +
                        "ORDER BY h.assessmentDate ASC")
        List<RiskAssessmentHistory> findByStudentAndDateRange(
                        @Param("student") Student student,
                        @Param("startDate") LocalDate startDate,
                        @Param("endDate") LocalDate endDate);

        /** Lấy tất cả cảnh báo chưa được giáo viên xử lý trong trường */
        @Query("SELECT h FROM RiskAssessmentHistory h WHERE h.school = :school " +
                        "AND h.teacherFeedback = :status " +
                        "ORDER BY h.riskScore DESC")
        List<RiskAssessmentHistory> findAllBySchoolAndFeedbackStatus(
                        @Param("school") School school,
                        @Param("status") TeacherFeedbackStatus status);

        /** Lấy tất cả đánh giá rủi ro cao (score >= threshold) gần nhất trong trường */
        @Query("SELECT h FROM RiskAssessmentHistory h WHERE h.school = :school " +
                        "AND h.assessmentDate = :date AND h.riskScore >= :threshold " +
                        "ORDER BY h.riskScore DESC")
        List<RiskAssessmentHistory> findHighRiskBySchoolAndDate(
                        @Param("school") School school,
                        @Param("date") LocalDate date,
                        @Param("threshold") int threshold);

        /** Đếm số HS có rủi ro cao trong 1 lớp (cho Heatmap) */
        @Query("SELECT COUNT(h) FROM RiskAssessmentHistory h WHERE h.classRoom.id = :classId " +
                        "AND h.assessmentDate = :date AND h.riskScore >= :threshold")
        long countHighRiskByClassAndDate(
                        @Param("classId") UUID classId,
                        @Param("date") LocalDate date,
                        @Param("threshold") int threshold);

        /** Lấy đánh giá mới nhất cho 1 học sinh */
        @Query("SELECT h FROM RiskAssessmentHistory h WHERE h.student = :student ORDER BY h.assessmentDate DESC LIMIT 1")
        RiskAssessmentHistory findLatestByStudent(@Param("student") Student student);

        /** Lấy toàn bộ đánh giá mới nhất theo lớp */
        @Query("SELECT h FROM RiskAssessmentHistory h WHERE h.classRoom.id = :classId " +
                        "AND h.assessmentDate = :date ORDER BY h.riskScore DESC")
        List<RiskAssessmentHistory> findAllByClassAndDate(
                        @Param("classId") UUID classId, @Param("date") LocalDate date);

        /** Lấy ngày đánh giá gần nhất của toàn trường */
        @Query("SELECT MAX(h.assessmentDate) FROM RiskAssessmentHistory h WHERE h.school = :school AND h.teacherFeedback = :status")
        LocalDate findLatestDateBySchoolAndStatus(@Param("school") School school, @Param("status") TeacherFeedbackStatus status);
}
