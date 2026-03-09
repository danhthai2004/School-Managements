package com.schoolmanagement.backend.service.timetable;

import com.schoolmanagement.backend.domain.entity.student.Guardian;
import com.schoolmanagement.backend.domain.entity.classes.ClassEnrollment;
import com.schoolmanagement.backend.domain.entity.classes.ClassRoom;
import com.schoolmanagement.backend.domain.entity.admin.School;
import com.schoolmanagement.backend.domain.entity.timetable.Timetable;
import com.schoolmanagement.backend.domain.entity.timetable.TimetableDetail;

import com.schoolmanagement.backend.service.chat.ChatHandler;
import com.schoolmanagement.backend.repo.auth.UserRepository;
import com.schoolmanagement.backend.repo.student.StudentRepository;
import com.schoolmanagement.backend.repo.student.GuardianRepository;
import com.schoolmanagement.backend.repo.classes.ClassEnrollmentRepository;
import com.schoolmanagement.backend.repo.timetable.TimetableDetailRepository;
import com.schoolmanagement.backend.repo.timetable.TimetableRepository;
import com.schoolmanagement.backend.domain.entity.auth.User;
import com.schoolmanagement.backend.domain.entity.student.Student;

import com.schoolmanagement.backend.domain.chat.ChatIntent;
import com.schoolmanagement.backend.domain.timetable.TimetableStatus;

import com.schoolmanagement.backend.dto.chat.ChatContext;

import org.springframework.stereotype.Component;

import java.time.DayOfWeek;
import java.util.*;
import java.util.stream.Collectors;

/**
 * Tầng 5 — Business Handler cho ASK_TIMETABLE
 *
 * Luồng:
 * - STUDENT: User → Student → ClassEnrollment → ClassRoom → TimetableDetail
 * - GUARDIAN: User → Guardian → Students → chọn Student → ClassEnrollment → ...
 */
@Component
public class TimetableHandler implements ChatHandler {

    private final UserRepository userRepository;
    private final StudentRepository studentRepository;
    private final GuardianRepository guardianRepository;
    private final ClassEnrollmentRepository classEnrollmentRepository;
    private final TimetableDetailRepository timetableDetailRepository;
    private final TimetableRepository timetableRepository;

    public TimetableHandler(UserRepository userRepository,
            StudentRepository studentRepository,
            GuardianRepository guardianRepository,
            ClassEnrollmentRepository classEnrollmentRepository,
            TimetableDetailRepository timetableDetailRepository,
            TimetableRepository timetableRepository) {
        this.userRepository = userRepository;
        this.studentRepository = studentRepository;
        this.guardianRepository = guardianRepository;
        this.classEnrollmentRepository = classEnrollmentRepository;
        this.timetableDetailRepository = timetableDetailRepository;
        this.timetableRepository = timetableRepository;
    }

    @Override
    public ChatContext handle(UUID userId, String message) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("Không tìm thấy người dùng"));

        return switch (user.getRole()) {
            case STUDENT -> handleStudent(user, message);
            case GUARDIAN -> handleGuardian(user, message);
            default -> ChatContext.denied(ChatIntent.ASK_TIMETABLE,
                    "Vai trò của bạn không được hỗ trợ tra cứu thời khóa biểu qua chatbot.");
        };
    }

    private ChatContext handleStudent(User user, String message) {
        Student student = studentRepository.findByUser(user).orElse(null);
        if (student == null) {
            return ChatContext.denied(ChatIntent.ASK_TIMETABLE,
                    "Không tìm thấy hồ sơ học sinh liên kết với tài khoản của bạn.");
        }
        return buildTimetableContext(student);
    }

    private ChatContext handleGuardian(User user, String message) {
        Guardian guardian = guardianRepository.findByUser(user).orElse(null);
        if (guardian == null) {
            return ChatContext.denied(ChatIntent.ASK_TIMETABLE,
                    "Không tìm thấy hồ sơ phụ huynh liên kết với tài khoản của bạn.");
        }

        List<Student> students = guardian.getStudents();
        if (students.isEmpty()) {
            return ChatContext.denied(ChatIntent.ASK_TIMETABLE,
                    "Không tìm thấy học sinh nào liên kết với tài khoản phụ huynh.");
        }

        if (students.size() == 1) {
            return buildTimetableContext(students.get(0));
        }

        // Nhiều con → tìm tên trong message
        String lowerMessage = message.toLowerCase();
        for (Student s : students) {
            if (lowerMessage.contains(s.getFullName().toLowerCase())) {
                return buildTimetableContext(s);
            }
        }

        List<String> names = students.stream().map(Student::getFullName).toList();
        return ChatContext.needClarification(ChatIntent.ASK_TIMETABLE, names);
    }

    /**
     * Xây dựng context thời khóa biểu cho 1 học sinh.
     * Luồng: Student → ClassEnrollment (mới nhất) → ClassRoom → TimetableDetail
     * (OFFICIAL)
     */
    private ChatContext buildTimetableContext(Student student) {
        // Tìm enrollment gần nhất
        List<ClassEnrollment> enrollments = classEnrollmentRepository.findAllByStudent(student);
        if (enrollments.isEmpty()) {
            return ChatContext.ok(ChatIntent.ASK_TIMETABLE, Map.of(
                    "studentName", student.getFullName(),
                    "message", "Học sinh chưa được xếp vào lớp nào."));
        }

        // Lấy enrollment mới nhất (theo academic year)
        ClassEnrollment latestEnrollment = enrollments.stream()
                .max(Comparator.comparing(ClassEnrollment::getAcademicYear))
                .orElse(enrollments.get(0));

        ClassRoom classRoom = latestEnrollment.getClassRoom();

        // Tìm Timetable OFFICIAL của trường
        School school = classRoom.getSchool();
        List<Timetable> timetables = timetableRepository
                .findAllBySchoolOrderByCreatedAtDesc(school);

        Timetable officialTimetable = timetables.stream()
                .filter(t -> t.getStatus() == TimetableStatus.OFFICIAL)
                .findFirst()
                .orElse(null);

        if (officialTimetable == null) {
            return ChatContext.ok(ChatIntent.ASK_TIMETABLE, Map.of(
                    "studentName", student.getFullName(),
                    "className", classRoom.getName(),
                    "message", "Chưa có thời khóa biểu chính thức."));
        }

        // Lấy chi tiết thời khóa biểu cho lớp
        List<TimetableDetail> details = timetableDetailRepository
                .findAllByTimetableAndClassRoom(officialTimetable, classRoom);

        if (details.isEmpty()) {
            return ChatContext.ok(ChatIntent.ASK_TIMETABLE, Map.of(
                    "studentName", student.getFullName(),
                    "className", classRoom.getName(),
                    "message", "Chưa có dữ liệu thời khóa biểu cho lớp này."));
        }

        // Đóng gói dữ liệu
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("studentName", student.getFullName());
        data.put("className", classRoom.getName());
        data.put("academicYear", officialTimetable.getAcademicYear());
        data.put("semester", officialTimetable.getSemester());

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
            for (TimetableDetail d : entry.getValue()) {
                Map<String, Object> slot = new LinkedHashMap<>();
                slot.put("slot", d.getSlotIndex());
                slot.put("subject", d.getSubject() != null ? d.getSubject().getName() : "Trống");
                slot.put("teacher", d.getTeacher() != null ? d.getTeacher().getFullName() : "");
                slots.add(slot);
            }
            dayData.put("slots", slots);
            schedule.add(dayData);
        }
        data.put("schedule", schedule);

        return ChatContext.ok(ChatIntent.ASK_TIMETABLE, data);
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
