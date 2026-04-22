package com.schoolmanagement.backend.service.timetable;

import com.schoolmanagement.backend.domain.entity.timetable.Timetable;
import com.schoolmanagement.backend.domain.entity.classes.LessonSlot;
import com.schoolmanagement.backend.domain.entity.teacher.Teacher;
import com.schoolmanagement.backend.domain.entity.timetable.TimetableDetail;

import com.schoolmanagement.backend.repo.timetable.TimetableRepository;
import com.schoolmanagement.backend.repo.timetable.TimetableDetailRepository;
import com.schoolmanagement.backend.repo.classes.LessonSlotRepository;
import com.schoolmanagement.backend.domain.entity.admin.School;

import com.schoolmanagement.backend.domain.timetable.TimetableStatus;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Xung đột hiện chỉ tính với TKB chính khóa do đã bỏ phân phòng và giám thị.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ConflictDetectionService {

    private final TimetableRepository timetableRepository;
    private final TimetableDetailRepository timetableDetailRepository;
    private final LessonSlotRepository lessonSlotRepository;

    /**
     * Kiểm tra giáo viên có bị trùng với TKB chính khóa không.
     * So sánh ngày thi → DayOfWeek → tìm các tiết dạy, rồi check overlap giờ.
     */
    public List<String> checkTeacherTimetableConflicts(UUID teacherId, School school,
            com.schoolmanagement.backend.domain.entity.admin.Semester semester,
            LocalDate examDate,
            LocalTime startTime, LocalTime endTime) {
        List<String> conflicts = new ArrayList<>();

        if (teacherId == null) {
            return conflicts;
        }

        // Tìm TKB chính khóa (OFFICIAL)
        Timetable official = timetableRepository
                .findFirstBySchoolAndSemesterAndStatusOrderByCreatedAtDesc(school, semester, TimetableStatus.OFFICIAL)
                .orElse(null);

        if (official == null) {
            return conflicts; // Chưa có TKB → không có xung đột
        }

        DayOfWeek dayOfWeek = examDate.getDayOfWeek();

        // Lấy tất cả lesson slot của trường
        List<LessonSlot> slots = lessonSlotRepository.findAllBySchoolOrderBySlotIndexAsc(school);

        // Tìm các tiết dạy của giáo viên vào ngày thi
        Teacher teacherRef = new Teacher();
        teacherRef.setId(teacherId);

        List<TimetableDetail> teacherDetails = timetableDetailRepository
                .findAllByTimetableAndTeacher(official, teacherRef);

        for (TimetableDetail detail : teacherDetails) {
            if (detail.getDayOfWeek() != dayOfWeek)
                continue;

            // Tìm LessonSlot tương ứng
            LessonSlot slot = slots.stream()
                    .filter(s -> s.getSlotIndex() == detail.getSlotIndex())
                    .findFirst()
                    .orElse(null);

            if (slot == null)
                continue;

            // Kiểm tra overlap: slot[start, end) ∩ exam[start, end)
            if (slot.getStartTime().isBefore(endTime) && slot.getEndTime().isAfter(startTime)) {
                conflicts.add(String.format(
                        "Giáo viên có tiết dạy %s (tiết %d) từ %s đến %s vào thứ %s",
                        detail.getSubject().getName(),
                        detail.getSlotIndex(),
                        slot.getStartTime(), slot.getEndTime(),
                        dayOfWeek.name()));
            }
        }

        return conflicts;
    }
}
