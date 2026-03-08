package com.schoolmanagement.backend.service.chat;

import com.schoolmanagement.backend.domain.ChatIntent;
import com.schoolmanagement.backend.domain.Role;
import com.schoolmanagement.backend.domain.AttendanceStatus;
import com.schoolmanagement.backend.domain.entity.*;
import com.schoolmanagement.backend.dto.ChatContext;
import com.schoolmanagement.backend.repo.*;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.*;

/**
 * Handler cho ASK_QUICK_STATS — Admin hỏi thống kê nhanh toàn trường.
 *
 * Luồng: userId → User → School → đếm tổng HS, GV, lớp + vắng hôm nay
 *
 * Chỉ trả dữ liệu tổng hợp (aggregated), không lộ thông tin cá nhân.
 */
@Component
public class QuickStatsHandler implements ChatHandler {

    private final UserRepository userRepository;
    private final StudentRepository studentRepository;
    private final TeacherRepository teacherRepository;
    private final ClassRoomRepository classRoomRepository;
    private final AttendanceSessionRepository attendanceSessionRepository;
    private final AttendanceRepository attendanceRepository;

    public QuickStatsHandler(UserRepository userRepository,
            StudentRepository studentRepository,
            TeacherRepository teacherRepository,
            ClassRoomRepository classRoomRepository,
            AttendanceSessionRepository attendanceSessionRepository,
            AttendanceRepository attendanceRepository) {
        this.userRepository = userRepository;
        this.studentRepository = studentRepository;
        this.teacherRepository = teacherRepository;
        this.classRoomRepository = classRoomRepository;
        this.attendanceSessionRepository = attendanceSessionRepository;
        this.attendanceRepository = attendanceRepository;
    }

    @Override
    public ChatContext handle(UUID userId, String message) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng"));

        // Chỉ SCHOOL_ADMIN mới được dùng
        if (user.getRole() != Role.SCHOOL_ADMIN) {
            return ChatContext.denied(ChatIntent.ASK_QUICK_STATS,
                    "Chỉ quản trị viên trường học mới xem được thống kê nhanh.");
        }

        School school = user.getSchool();
        if (school == null) {
            return ChatContext.denied(ChatIntent.ASK_QUICK_STATS,
                    "Tài khoản của bạn chưa được liên kết với trường nào.");
        }

        // Thống kê tổng quan
        long totalStudents = studentRepository.countBySchool(school);
        long totalTeachers = teacherRepository.countBySchool(school);
        long totalClasses = classRoomRepository.countBySchool(school);

        // Điểm danh hôm nay
        LocalDate today = LocalDate.now();
        List<Attendance> attendances = attendanceRepository.findBySchoolAndAttendanceDateBetween(school, today, today);

        long totalAttendanceRecords = attendances.size();
        long absentToday = 0;
        long lateToday = 0;
        long excusedToday = 0;
        long presentToday = 0;

        for (Attendance a : attendances) {
            switch (a.getStatus()) {
                case ABSENT_UNEXCUSED -> absentToday++;
                case LATE -> lateToday++;
                case ABSENT_EXCUSED -> excusedToday++;
                case PRESENT -> presentToday++;
            }
        }

        // Đóng gói dữ liệu
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("schoolName", school.getName());
        data.put("date", today.toString());

        // Thống kê tổng quan
        data.put("totalStudents", totalStudents);
        data.put("totalTeachers", totalTeachers);
        data.put("totalClasses", totalClasses);

        // Điểm danh hôm nay
        data.put("hasAttendanceToday", !attendances.isEmpty());
        data.put("sessionsToday", (int) attendances.stream().map(a -> a.getClassRoom().getId()).distinct().count());
        data.put("presentToday", presentToday);
        data.put("absentToday", absentToday);
        data.put("lateToday", lateToday);
        data.put("excusedToday", excusedToday);

        if (totalAttendanceRecords > 0) {
            double attendanceRate = (double) presentToday / totalAttendanceRecords * 100;
            data.put("attendanceRate", String.format("%.1f%%", attendanceRate));
        }

        return ChatContext.ok(ChatIntent.ASK_QUICK_STATS, data);
    }
}
