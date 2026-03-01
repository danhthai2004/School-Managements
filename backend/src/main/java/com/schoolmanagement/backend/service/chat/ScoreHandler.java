package com.schoolmanagement.backend.service.chat;

import com.schoolmanagement.backend.domain.ChatIntent;
import com.schoolmanagement.backend.domain.entity.*;
import com.schoolmanagement.backend.dto.ChatContext;
import com.schoolmanagement.backend.repo.*;
import org.springframework.stereotype.Component;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Tầng 5 — Business Handler cho ASK_SCORE
 *
 * Luồng:
 * - STUDENT: User → Student → Grade (chỉ xem điểm của mình)
 * - GUARDIAN: User → Guardian(s) → Students → chọn Student → Grade
 * - TEACHER: dùng UI chính
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
        Student student = studentRepository.findByUserId(user.getId()).orElse(null);
        if (student == null) {
            return ChatContext.denied(ChatIntent.ASK_SCORE,
                    "Không tìm thấy hồ sơ học sinh liên kết với tài khoản của bạn.");
        }

        List<Grade> grades = gradeRepository.findAllByStudentId(student.getId());
        if (grades.isEmpty()) {
            return ChatContext.ok(ChatIntent.ASK_SCORE, Map.of(
                    "studentName", student.getFullName(),
                    "message", "Chưa có dữ liệu điểm số."));
        }

        return ChatContext.ok(ChatIntent.ASK_SCORE, buildScoreData(student, grades));
    }

    private ChatContext handleGuardian(User user, String message) {
        List<Guardian> guardianRecords = guardianRepository.findAllByUserId(user.getId());
        if (guardianRecords.isEmpty()) {
            return ChatContext.denied(ChatIntent.ASK_SCORE,
                    "Không tìm thấy hồ sơ phụ huynh liên kết với tài khoản của bạn.");
        }

        // Guardian can have multiple students (one Guardian row per student)
        List<Student> students = guardianRecords.stream()
                .map(Guardian::getStudent)
                .filter(Objects::nonNull)
                .distinct()
                .toList();

        if (students.isEmpty()) {
            return ChatContext.denied(ChatIntent.ASK_SCORE,
                    "Không tìm thấy học sinh nào liên kết với tài khoản phụ huynh.");
        }

        // Nếu chỉ có 1 con → query trực tiếp
        if (students.size() == 1) {
            Student student = students.get(0);
            List<Grade> grades = gradeRepository.findAllByStudentId(student.getId());
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
                List<Grade> grades = gradeRepository.findAllByStudentId(s.getId());
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
        return ChatContext.denied(ChatIntent.ASK_SCORE,
                "Giáo viên vui lòng sử dụng chức năng Quản lý Điểm trên giao diện chính để tra cứu điểm.");
    }

    /**
     * Đóng gói dữ liệu điểm thành Map cho NLG xử lý.
     * Grade model hiện tại: type (REGULAR / MID_TERM / FINAL_TERM) + value (Double)
     */
    private Map<String, Object> buildScoreData(Student student, List<Grade> grades) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("studentName", student.getFullName());
        data.put("studentCode", student.getStudentCode());

        // Group grades by subject → semester → type
        Map<String, List<Grade>> bySubject = grades.stream()
                .filter(g -> g.getSubject() != null)
                .collect(Collectors.groupingBy(g -> g.getSubject().getName()));

        List<Map<String, Object>> subjectGrades = new ArrayList<>();
        for (Map.Entry<String, List<Grade>> entry : bySubject.entrySet()) {
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("subject", entry.getKey());

            List<Grade> subjectList = entry.getValue();
            if (!subjectList.isEmpty()) {
                item.put("semester", subjectList.get(0).getSemester());
                item.put("academicYear", subjectList.get(0).getAcademicYear());
            }

            // Collect scores by type
            List<Double> regular = subjectList.stream()
                    .filter(g -> g.getType() == Grade.GradeType.REGULAR)
                    .map(Grade::getValue).toList();
            List<Double> midTerm = subjectList.stream()
                    .filter(g -> g.getType() == Grade.GradeType.MID_TERM)
                    .map(Grade::getValue).toList();
            List<Double> finalTerm = subjectList.stream()
                    .filter(g -> g.getType() == Grade.GradeType.FINAL_TERM)
                    .map(Grade::getValue).toList();

            item.put("regularScores", regular);
            item.put("midTermScores", midTerm);
            item.put("finalTermScores", finalTerm);

            // Compute weighted average if all types present
            double avgScore = computeAverage(regular, midTerm, finalTerm);
            if (avgScore >= 0) {
                item.put("average", String.format("%.2f", avgScore));
            }

            subjectGrades.add(item);
        }
        data.put("grades", subjectGrades);
        return data;
    }

    /**
     * Compute weighted average: REGULAR (hệ số 1), MID_TERM (hệ số 2), FINAL_TERM (hệ số 3)
     */
    private double computeAverage(List<Double> regular, List<Double> midTerm, List<Double> finalTerm) {
        double totalWeight = 0;
        double totalScore = 0;

        for (Double v : regular) {
            totalScore += v * 1;
            totalWeight += 1;
        }
        for (Double v : midTerm) {
            totalScore += v * 2;
            totalWeight += 2;
        }
        for (Double v : finalTerm) {
            totalScore += v * 3;
            totalWeight += 3;
        }

        return totalWeight > 0 ? totalScore / totalWeight : -1;
    }
}
