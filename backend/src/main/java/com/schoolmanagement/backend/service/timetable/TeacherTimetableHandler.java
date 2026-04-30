package com.schoolmanagement.backend.service.timetable;

import com.schoolmanagement.backend.domain.entity.auth.User;
import com.schoolmanagement.backend.domain.auth.Role;
import com.schoolmanagement.backend.domain.entity.teacher.Teacher;
import com.schoolmanagement.backend.domain.entity.admin.School;
import com.schoolmanagement.backend.domain.entity.timetable.Timetable;
import com.schoolmanagement.backend.domain.entity.timetable.TimetableDetail;

import com.schoolmanagement.backend.service.chat.ChatHandler;
import com.schoolmanagement.backend.repo.auth.UserRepository;
import com.schoolmanagement.backend.repo.teacher.TeacherRepository;
import com.schoolmanagement.backend.repo.timetable.TimetableRepository;
import com.schoolmanagement.backend.repo.timetable.TimetableDetailRepository;

import com.schoolmanagement.backend.domain.chat.ChatIntent;
import com.schoolmanagement.backend.domain.timetable.TimetableStatus;

import com.schoolmanagement.backend.dto.chat.ChatContext;

import org.springframework.stereotype.Component;

import java.time.DayOfWeek;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Handler cho ASK_TEACHER_TIMETABLE — GV hỏi lịch dạy cá nhân.
 *
 * Luồng: userId → User → Teacher (qua TeacherRepo.findByUser)
 * → Timetable OFFICIAL → TimetableDetail (lọc theo teacher)
 * → Format theo ngày/tiết/lớp/môn
 *
 * Bảo mật: Chỉ trả lịch của chính GV đó (qua teacherId từ JWT).
 */
@Component
public class TeacherTimetableHandler implements ChatHandler {

    private final UserRepository userRepository;
    private final TeacherRepository teacherRepository;
    private final TimetableRepository timetableRepository;
    private final TimetableDetailRepository timetableDetailRepository;

    public TeacherTimetableHandler(UserRepository userRepository,
            TeacherRepository teacherRepository,
            TimetableRepository timetableRepository,
            TimetableDetailRepository timetableDetailRepository) {
        this.userRepository = userRepository;
        this.teacherRepository = teacherRepository;
        this.timetableRepository = timetableRepository;
        this.timetableDetailRepository = timetableDetailRepository;
    }

    @Override
    public ChatContext handle(UUID userId, String message, Map<String, String> parameters) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng"));

        // Chỉ TEACHER mới được dùng
        if (user.getRole() != Role.TEACHER) {
            return ChatContext.denied(ChatIntent.ASK_TEACHER_TIMETABLE,
                    "Chỉ giáo viên mới xem được lịch dạy cá nhân.");
        }

        Teacher teacher = teacherRepository.findByUser(user).orElse(null);
        if (teacher == null) {
            return ChatContext.denied(ChatIntent.ASK_TEACHER_TIMETABLE,
                    "Không tìm thấy hồ sơ giáo viên liên kết với tài khoản của bạn.");
        }

        // Tìm Timetable OFFICIAL của trường
        School school = teacher.getSchool();
        List<Timetable> timetables = timetableRepository
                .findAllBySchoolOrderByCreatedAtDesc(school);

        Timetable officialTimetable = timetables.stream()
                .filter(timetable -> timetable.getStatus() == TimetableStatus.OFFICIAL)
                .findFirst()
                .orElse(null);

        if (officialTimetable == null) {
            return ChatContext.ok(ChatIntent.ASK_TEACHER_TIMETABLE, Map.of(
                    "teacherName", teacher.getFullName(),
                    "message", "Chưa có thời khóa biểu chính thức."));
        }

        // Lấy chi tiết TKB cho giáo viên
        List<TimetableDetail> details = timetableDetailRepository
                .findAllByTimetableAndTeacher(officialTimetable, teacher);

        if (details.isEmpty()) {
            return ChatContext.ok(ChatIntent.ASK_TEACHER_TIMETABLE, Map.of(
                    "teacherName", teacher.getFullName(),
                    "message", "Chưa có tiết dạy nào trong thời khóa biểu hiện tại."));
        }

        // Đóng gói dữ liệu
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("teacherName", teacher.getFullName());
        data.put("academicYear",
                officialTimetable.getSemester() != null && officialTimetable.getSemester().getAcademicYear() != null
                        ? officialTimetable.getSemester().getAcademicYear().getName()
                        : "");
        data.put("semester",
                officialTimetable.getSemester() != null ? officialTimetable.getSemester().getSemesterNumber() : "");
        data.put("totalSlots", details.size());

        // Nhóm theo ngày
        Map<DayOfWeek, List<TimetableDetail>> byDay = details.stream()
                .sorted(Comparator.comparingInt(TimetableDetail::getSlotIndex))
                .collect(Collectors.groupingBy(TimetableDetail::getDayOfWeek,
                        LinkedHashMap::new, Collectors.toList()));

        List<Map<String, Object>> schedule = new ArrayList<>();
        for (Map.Entry<DayOfWeek, List<TimetableDetail>> entry : byDay.entrySet()) {
            Map<String, Object> dayData = new LinkedHashMap<>();
            dayData.put("day", translateDayOfWeek(entry.getKey()));

            List<Map<String, Object>> slots = new ArrayList<>();
            for (TimetableDetail detail : entry.getValue()) {
                Map<String, Object> slot = new LinkedHashMap<>();
                slot.put("slot", detail.getSlotIndex());
                slot.put("subject", detail.getSubject() != null ? detail.getSubject().getName() : "Trống");
                slot.put("class", detail.getClassRoom() != null ? detail.getClassRoom().getName() : "");
                slots.add(slot);
            }
            dayData.put("slots", slots);
            schedule.add(dayData);
        }
        data.put("schedule", schedule);

        return ChatContext.ok(ChatIntent.ASK_TEACHER_TIMETABLE, data);
    }

    private String translateDayOfWeek(DayOfWeek day) {
        return switch (day) {
            case MONDAY -> "Thứ Hai";
            case TUESDAY -> "Thứ Ba";
            case WEDNESDAY -> "Thứ Tư";
            case THURSDAY -> "Thứ Năm";
            case FRIDAY -> "Thứ Sáu";
            case SATURDAY -> "Thứ Bảy";
            case SUNDAY -> "Chủ Nhật";
        };
    }
}
