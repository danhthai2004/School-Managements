package com.schoolmanagement.backend.service.chat;

import com.schoolmanagement.backend.domain.ChatIntent;
import com.schoolmanagement.backend.domain.Role;
import com.schoolmanagement.backend.domain.entity.*;
import com.schoolmanagement.backend.dto.ChatContext;
import com.schoolmanagement.backend.repo.*;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.*;

/**
 * Tầng 5 — Business Handler cho ASK_SCORE
 *
 * Luồng:
 * - STUDENT: User → Student → Grade (chỉ xem điểm của mình)
 * - GUARDIAN: User → Guardian → Students → chọn Student → Grade
 * - TEACHER: User → Teacher → Grade (xem điểm lớp mình dạy)
 */
@Component
public class ScoreHandler implements ChatHandler {

    private final UserRepository userRepository;
    private final StudentRepository studentRepository;
    private final GuardianRepository guardianRepository;
    private final GradeRepository gradeRepository;

    public ScoreHandler(UserRepository userRepository,
            StudentRepository studentRepository,
            GuardianRepository guardianRepository,
            GradeRepository gradeRepository) {
        this.userRepository = userRepository;
        this.studentRepository = studentRepository;
        this.guardianRepository = guardianRepository;
        this.gradeRepository = gradeRepository;
    }

    @Override
    public ChatContext handle(UUID userId, String message) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng"));

        return switch (user.getRole()) {
            case STUDENT -> handleStudent(user, message);
            case GUARDIAN -> handleGuardian(user, message);
            case TEACHER -> handleTeacher(user, message);
            default -> ChatContext.denied(ChatIntent.ASK_SCORE,
                    "Vai trò của bạn không được hỗ trợ tra cứu điểm qua chatbot.");
        };
    }

    private ChatContext handleStudent(User user, String message) {
        Student student = studentRepository.findByUser(user)
                .orElse(null);
        if (student == null) {
            return ChatContext.denied(ChatIntent.ASK_SCORE,
                    "Không tìm thấy hồ sơ học sinh liên kết với tài khoản của bạn.");
        }

        List<Grade> grades = gradeRepository.findAllByStudent(student);
        if (grades.isEmpty()) {
            return ChatContext.ok(ChatIntent.ASK_SCORE, Map.of(
                    "studentName", student.getFullName(),
                    "message", "Chưa có dữ liệu điểm số."));
        }

        return ChatContext.ok(ChatIntent.ASK_SCORE, buildScoreData(student, grades));
    }

    private ChatContext handleGuardian(User user, String message) {
        Guardian guardian = guardianRepository.findByUser(user)
                .orElse(null);
        if (guardian == null) {
            return ChatContext.denied(ChatIntent.ASK_SCORE,
                    "Không tìm thấy hồ sơ phụ huynh liên kết với tài khoản của bạn.");
        }

        List<Student> students = guardian.getStudents();
        if (students.isEmpty()) {
            return ChatContext.denied(ChatIntent.ASK_SCORE,
                    "Không tìm thấy học sinh nào liên kết với tài khoản phụ huynh.");
        }

        // Nếu chỉ có 1 con → query trực tiếp
        if (students.size() == 1) {
            Student student = students.get(0);
            List<Grade> grades = gradeRepository.findAllByStudent(student);
            if (grades.isEmpty()) {
                return ChatContext.ok(ChatIntent.ASK_SCORE, Map.of(
                        "studentName", student.getFullName(),
                        "message", "Chưa có dữ liệu điểm số."));
            }
            return ChatContext.ok(ChatIntent.ASK_SCORE, buildScoreData(student, grades));
        }

        // Nếu có nhiều con → kiểm tra tên trong message
        String lowerMessage = message.toLowerCase();
        for (Student s : students) {
            if (lowerMessage.contains(s.getFullName().toLowerCase())) {
                List<Grade> grades = gradeRepository.findAllByStudent(s);
                if (grades.isEmpty()) {
                    return ChatContext.ok(ChatIntent.ASK_SCORE, Map.of(
                            "studentName", s.getFullName(),
                            "message", "Chưa có dữ liệu điểm số."));
                }
                return ChatContext.ok(ChatIntent.ASK_SCORE, buildScoreData(s, grades));
            }
        }

        // Không tìm thấy tên → yêu cầu làm rõ
        List<String> names = students.stream().map(Student::getFullName).toList();
        return ChatContext.needClarification(ChatIntent.ASK_SCORE, names);
    }

    private ChatContext handleTeacher(User user, String message) {
        // Teacher xem điểm: không hỗ trợ qua chatbot (quá phức tạp → dùng UI chính)
        return ChatContext.denied(ChatIntent.ASK_SCORE,
                "Giáo viên vui lòng sử dụng chức năng Quản lý Điểm trên giao diện chính để tra cứu điểm.");
    }

    /**
     * Đóng gói dữ liệu điểm thành Map cho NLG xử lý.
     */
    private Map<String, Object> buildScoreData(Student student, List<Grade> grades) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("studentName", student.getFullName());
        data.put("studentCode", student.getStudentCode());

        List<Map<String, Object>> gradeList = new ArrayList<>();
        for (Grade g : grades) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("subject", g.getSubject() != null ? g.getSubject().getName() : "N/A");
            item.put("semester", g.getSemester());
            item.put("academicYear", g.getAcademicYear());
            item.put("oralScore", formatScore(g.getOralScore()));
            item.put("test15min", formatScore(g.getTest15minScore()));
            item.put("test45min", formatScore(g.getTest45minScore()));
            item.put("midterm", formatScore(g.getMidtermScore()));
            item.put("final", formatScore(g.getFinalScore()));
            item.put("average", formatScore(g.getAverageScore()));
            item.put("rank", g.getPerformanceCategory() != null ? g.getPerformanceCategory() : "");
            gradeList.add(item);
        }
        data.put("grades", gradeList);
        return data;
    }

    private String formatScore(BigDecimal score) {
        return score != null ? score.toPlainString() : "—";
    }
}
