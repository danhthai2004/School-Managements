package com.schoolmanagement.backend.service.common;

import com.schoolmanagement.backend.domain.entity.auth.User;
import com.schoolmanagement.backend.domain.auth.Role;
import com.schoolmanagement.backend.domain.entity.classes.ClassRoom;
import com.schoolmanagement.backend.domain.entity.attendance.Attendance;

import com.schoolmanagement.backend.service.chat.ChatHandler;
import com.schoolmanagement.backend.repo.auth.UserRepository;
import com.schoolmanagement.backend.repo.classes.ClassRoomRepository;
import com.schoolmanagement.backend.repo.classes.ClassEnrollmentRepository;
import com.schoolmanagement.backend.repo.attendance.AttendanceRepository;

import com.schoolmanagement.backend.domain.chat.ChatIntent;

import com.schoolmanagement.backend.dto.chat.ChatContext;
import com.schoolmanagement.backend.service.admin.SemesterService;

import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.*;

/**
 * Handler cho ASK_HOMEROOM_CLASS — GV hỏi thông tin lớp chủ nhiệm.
 *
 * Luồng: userId → User → ClassRoom (findByHomeroomTeacher)
 * → sĩ số (ClassEnrollment count) + vắng hôm nay (AttendanceSession +
 * Attendance)
 *
 * Bảo mật: Chỉ trả info lớp mà GV đó chủ nhiệm.
 */
@Component
public class HomeroomHandler implements ChatHandler {

    private final UserRepository userRepository;
    private final ClassRoomRepository classRoomRepository;
    private final ClassEnrollmentRepository classEnrollmentRepository;
    private final AttendanceRepository attendanceRepository;
    private final SemesterService semesterService;

    public HomeroomHandler(UserRepository userRepository,
            ClassRoomRepository classRoomRepository,
            ClassEnrollmentRepository classEnrollmentRepository,
            AttendanceRepository attendanceRepository,
            SemesterService semesterService) {
        this.userRepository = userRepository;
        this.classRoomRepository = classRoomRepository;
        this.classEnrollmentRepository = classEnrollmentRepository;
        this.attendanceRepository = attendanceRepository;
        this.semesterService = semesterService;
    }

    @Override
    public ChatContext handle(UUID userId, String message) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng"));

        // Chỉ TEACHER mới được dùng
        if (user.getRole() != Role.TEACHER) {
            return ChatContext.denied(ChatIntent.ASK_HOMEROOM_CLASS,
                    "Chỉ giáo viên chủ nhiệm mới xem được thông tin lớp chủ nhiệm.");
        }

        // Tìm lớp chủ nhiệm
        ClassRoom classRoom = findActiveHomeroom(user).orElse(null);
        if (classRoom == null) {
            return ChatContext.denied(ChatIntent.ASK_HOMEROOM_CLASS,
                    "Bạn hiện không chủ nhiệm lớp nào.");
        }

        // Sĩ số
        long totalStudents = classEnrollmentRepository.countByClassRoom(classRoom);

        // Điểm danh hôm nay
        LocalDate today = LocalDate.now();
        List<Attendance> attendances = attendanceRepository.findByClassRoomAndAttendanceDate(classRoom, today);

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
                case LATE -> lateToday++;
                case ABSENT_EXCUSED -> excusedToday++;

                case PRESENT -> {
                }
            }
        }

        // Đóng gói dữ liệu
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("className", classRoom.getName());
        data.put("grade", classRoom.getGrade());
        data.put("academicYear", classRoom.getAcademicYear());
        data.put("roomNumber", classRoom.getRoom() != null ? classRoom.getRoom().getName() : "Chưa gán");
        data.put("totalStudents", totalStudents);
        data.put("date", today.toString());
        data.put("absentToday", absentToday);
        data.put("lateToday", lateToday);
        data.put("excusedToday", excusedToday);

        if (!absentStudentNames.isEmpty()) {
            // Loại bỏ trùng lắp
            data.put("absentStudents", absentStudentNames.stream().distinct().toList());
        }

        data.put("hasAttendanceToday", !attendances.isEmpty());

        return ChatContext.ok(ChatIntent.ASK_HOMEROOM_CLASS, data);
    }

    private Optional<ClassRoom> findActiveHomeroom(User teacher) {
        if (teacher == null)
            return Optional.empty();

        if (teacher.getSchool() != null) {
            com.schoolmanagement.backend.domain.entity.admin.AcademicYear currentAcademicYear = semesterService
                    .getActiveAcademicYearSafe(teacher.getSchool());
            if (currentAcademicYear != null) {
                Optional<ClassRoom> found = classRoomRepository.findByHomeroomTeacher_IdAndAcademicYear(teacher.getId(),
                        currentAcademicYear);
                if (found.isPresent())
                    return found;
            }
        }
        return classRoomRepository.findTopByHomeroomTeacher_IdOrderByAcademicYear_StartDateDesc(teacher.getId());
    }
}
