package com.schoolmanagement.backend.service.chat;

import com.schoolmanagement.backend.domain.AttendanceStatus;
import com.schoolmanagement.backend.domain.ChatIntent;
import com.schoolmanagement.backend.domain.entity.*;
import com.schoolmanagement.backend.dto.ChatContext;
import com.schoolmanagement.backend.repo.*;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.*;

/**
 * Handler cho ASK_HOMEROOM_CLASS — GV hỏi thông tin lớp chủ nhiệm.
 *
 * Luồng: userId → User → ClassRoom (findByHomeroomTeacher)
 * → sĩ số (ClassEnrollment count) + vắng hôm nay (Attendance by classRoom + date)
 */
@Component
public class HomeroomHandler implements ChatHandler {

    private final UserRepository userRepository;
    private final ClassRoomRepository classRoomRepository;
    private final ClassEnrollmentRepository classEnrollmentRepository;
    private final AttendanceRepository attendanceRepository;

    public HomeroomHandler(UserRepository userRepository,
            ClassRoomRepository classRoomRepository,
            ClassEnrollmentRepository classEnrollmentRepository,
            AttendanceRepository attendanceRepository) {
        this.userRepository = userRepository;
        this.classRoomRepository = classRoomRepository;
        this.classEnrollmentRepository = classEnrollmentRepository;
        this.attendanceRepository = attendanceRepository;
    }

    @Override
    public ChatContext handle(UUID userId, String message) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng"));

        // Chỉ TEACHER mới được dùng
        if (user.getRole() != com.schoolmanagement.backend.domain.Role.TEACHER) {
            return ChatContext.denied(ChatIntent.ASK_HOMEROOM_CLASS,
                    "Chỉ giáo viên chủ nhiệm mới xem được thông tin lớp chủ nhiệm.");
        }

        // Tìm lớp chủ nhiệm
        ClassRoom classRoom = classRoomRepository.findByHomeroomTeacher(user).orElse(null);
        if (classRoom == null) {
            return ChatContext.denied(ChatIntent.ASK_HOMEROOM_CLASS,
                    "Bạn hiện không chủ nhiệm lớp nào.");
        }

        // Sĩ số
        long totalStudents = classEnrollmentRepository.countByClassRoom(classRoom);

        // Điểm danh hôm nay — query trực tiếp bằng classRoom + date
        LocalDate today = LocalDate.now();
        List<Attendance> attendances = attendanceRepository.findAllByClassRoomAndDate(classRoom, today);

        long absentToday = 0;
        long lateToday = 0;
        long excusedToday = 0;
        List<String> absentStudentNames = new ArrayList<>();

        for (Attendance a : attendances) {
            switch (a.getStatus()) {
                case ABSENT_UNEXCUSED -> {
                    absentToday++;
                    if (a.getStudent() != null) {
                        absentStudentNames.add(a.getStudent().getFullName());
                    }
                }
                case ABSENT_EXCUSED -> excusedToday++;
                case LATE -> lateToday++;
                default -> { /* PRESENT – do nothing */ }
            }
        }

        // Đóng gói dữ liệu
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("className", classRoom.getName());
        data.put("grade", classRoom.getGrade());
        data.put("academicYear", classRoom.getAcademicYear());
        data.put("roomNumber", classRoom.getRoomNumber() != null ? classRoom.getRoomNumber() : "Chưa gán");
        data.put("totalStudents", totalStudents);
        data.put("date", today.toString());
        data.put("absentToday", absentToday);
        data.put("lateToday", lateToday);
        data.put("excusedToday", excusedToday);

        if (!absentStudentNames.isEmpty()) {
            data.put("absentStudents", absentStudentNames.stream().distinct().toList());
        }

        data.put("hasAttendanceToday", !attendances.isEmpty());

        return ChatContext.ok(ChatIntent.ASK_HOMEROOM_CLASS, data);
    }
}
