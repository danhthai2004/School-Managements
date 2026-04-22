package com.schoolmanagement.backend.service.attendance;

import com.schoolmanagement.backend.domain.entity.student.Guardian;
import com.schoolmanagement.backend.domain.entity.attendance.Attendance;

import com.schoolmanagement.backend.service.chat.ChatHandler;
import com.schoolmanagement.backend.repo.auth.UserRepository;
import com.schoolmanagement.backend.repo.student.StudentRepository;
import com.schoolmanagement.backend.repo.student.GuardianRepository;
import com.schoolmanagement.backend.repo.attendance.AttendanceRepository;
import com.schoolmanagement.backend.domain.entity.auth.User;
import com.schoolmanagement.backend.domain.entity.student.Student;

import com.schoolmanagement.backend.domain.chat.ChatIntent;
import com.schoolmanagement.backend.domain.attendance.AttendanceStatus;

import com.schoolmanagement.backend.dto.chat.ChatContext;

import org.springframework.stereotype.Component;

import java.util.*;

/**
 * Tầng 5 — Business Handler cho ASK_ABSENCE
 *
 * Luồng:
 * - STUDENT: User → Student → Attendance (tổng hợp điểm danh)
 * - GUARDIAN: User → Guardian → Students → chọn Student → Attendance
 */
@Component
public class AttendanceHandler implements ChatHandler {

    private final UserRepository userRepository;
    private final StudentRepository studentRepository;
    private final GuardianRepository guardianRepository;
    private final AttendanceRepository attendanceRepository;

    public AttendanceHandler(UserRepository userRepository,
            StudentRepository studentRepository,
            GuardianRepository guardianRepository,
            AttendanceRepository attendanceRepository) {
        this.userRepository = userRepository;
        this.studentRepository = studentRepository;
        this.guardianRepository = guardianRepository;
        this.attendanceRepository = attendanceRepository;
    }

    @Override
    public ChatContext handle(UUID userId, String message) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng"));

        return switch (user.getRole()) {
            case STUDENT -> handleStudent(user, message);
            case GUARDIAN -> handleGuardian(user, message);
            default -> ChatContext.denied(ChatIntent.ASK_ABSENCE,
                    "Vai trò của bạn không được hỗ trợ tra cứu điểm danh qua chatbot.");
        };
    }

    private ChatContext handleStudent(User user, String message) {
        Student student = studentRepository.findByUser(user).orElse(null);
        if (student == null) {
            return ChatContext.denied(ChatIntent.ASK_ABSENCE,
                    "Không tìm thấy hồ sơ học sinh liên kết với tài khoản của bạn.");
        }
        return buildAttendanceContext(student);
    }

    private ChatContext handleGuardian(User user, String message) {
        Guardian guardian = guardianRepository.findByUser(user).orElse(null);
        if (guardian == null) {
            return ChatContext.denied(ChatIntent.ASK_ABSENCE,
                    "Không tìm thấy hồ sơ phụ huynh liên kết với tài khoản của bạn.");
        }

        List<Student> students = guardian.getStudents();
        if (students.isEmpty()) {
            return ChatContext.denied(ChatIntent.ASK_ABSENCE,
                    "Không tìm thấy học sinh nào liên kết với tài khoản phụ huynh.");
        }

        if (students.size() == 1) {
            return buildAttendanceContext(students.get(0));
        }

        // Nhiều con → tìm tên trong message
        String lowerMessage = message.toLowerCase();
        for (Student s : students) {
            if (lowerMessage.contains(s.getFullName().toLowerCase())) {
                return buildAttendanceContext(s);
            }
        }

        List<String> names = students.stream().map(Student::getFullName).toList();
        return ChatContext.needClarification(ChatIntent.ASK_ABSENCE, names);
    }

    private ChatContext buildAttendanceContext(Student student) {
        List<Attendance> records = attendanceRepository.findAllByStudent(student);

        if (records.isEmpty()) {
            return ChatContext.ok(ChatIntent.ASK_ABSENCE, Map.of(
                    "studentName", student.getFullName(),
                    "message", "Chưa có dữ liệu điểm danh."));
        }

        // Thống kê theo trạng thái
        long present = records.stream().filter(a -> AttendanceStatus.PRESENT.equals(a.getStatus())).count();
        long absent = records.stream().filter(a -> AttendanceStatus.ABSENT_UNEXCUSED.equals(a.getStatus())).count();
        long late = records.stream().filter(a -> AttendanceStatus.LATE.equals(a.getStatus())).count();
        long excused = records.stream().filter(a -> AttendanceStatus.ABSENT_EXCUSED.equals(a.getStatus())).count();
        long total = records.size();

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("studentName", student.getFullName());
        data.put("totalSessions", total);
        data.put("present", present);
        data.put("absent", absent);
        data.put("late", late);
        data.put("excused", excused);

        // Tính tỷ lệ đi học
        double attendanceRate = total > 0 ? (double) present / total * 100 : 0;
        data.put("attendanceRate", String.format("%.1f%%", attendanceRate));

        // Lấy 5 lần vắng gần nhất (nếu có)
        List<Map<String, Object>> recentAbsences = records.stream()
                .filter(a -> AttendanceStatus.ABSENT_UNEXCUSED.equals(a.getStatus())
                        || AttendanceStatus.LATE.equals(a.getStatus()))
                .sorted(Comparator.comparing(Attendance::getAttendanceDate, Comparator.reverseOrder()))
                .limit(5)
                .map(a -> {
                    Map<String, Object> item = new LinkedHashMap<>();
                    item.put("date", a.getAttendanceDate().toString());
                    item.put("status", a.getStatus().name());
                    item.put("subject", "N/A");
                    item.put("note", a.getRemarks() != null ? a.getRemarks() : "");
                    return item;
                })
                .toList();

        if (!recentAbsences.isEmpty()) {
            data.put("recentAbsences", recentAbsences);
        }

        return ChatContext.ok(ChatIntent.ASK_ABSENCE, data);
    }
}
