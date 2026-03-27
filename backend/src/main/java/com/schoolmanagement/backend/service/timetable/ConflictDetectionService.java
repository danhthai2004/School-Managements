package com.schoolmanagement.backend.service.timetable;

import com.schoolmanagement.backend.domain.entity.timetable.Timetable;
import com.schoolmanagement.backend.domain.entity.classes.LessonSlot;
import com.schoolmanagement.backend.domain.entity.teacher.Teacher;
import com.schoolmanagement.backend.domain.entity.timetable.TimetableDetail;

import com.schoolmanagement.backend.domain.entity.classes.ExamRoom;
import com.schoolmanagement.backend.domain.entity.exam.ExamSchedule;
import com.schoolmanagement.backend.domain.entity.teacher.ExamInvigilator;

import com.schoolmanagement.backend.repo.classes.ExamRoomRepository;
import com.schoolmanagement.backend.repo.teacher.ExamInvigilatorRepository;
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
 * Dịch vụ phát hiện xung đột lịch thi.
 * Kiểm tra 2 loại:
 * 1. Trùng phòng / giáo viên với ca thi khác
 * 2. Trùng phòng / giáo viên với thời khóa biểu chính khóa
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ConflictDetectionService {

    private final ExamRoomRepository examRoomRepository;
    private final ExamInvigilatorRepository examInvigilatorRepository;
    private final TimetableRepository timetableRepository;
    private final TimetableDetailRepository timetableDetailRepository;
    private final LessonSlotRepository lessonSlotRepository;

    /**
     * Kiểm tra phòng có bị trùng với ca thi khác không.
     */
    public List<String> checkRoomConflicts(UUID roomId, LocalDate examDate,
            LocalTime startTime, LocalTime endTime) {
        List<String> conflicts = new ArrayList<>();
        List<ExamRoom> conflicting = examRoomRepository.findConflictingRooms(
                roomId, examDate, startTime, endTime);

        for (ExamRoom examRoom : conflicting) {
            ExamSchedule examSchedule = examRoom.getExamSchedule();
            conflicts.add(String.format(
                    "Phòng đã được gán cho môn %s (khối %d) từ %s đến %s ngày %s",
                    examSchedule.getSubject().getName(),
                    examSchedule.getGrade() != null ? examSchedule.getGrade() : 0,
                    examSchedule.getStartTime(), examSchedule.getEndTime(), examSchedule.getExamDate()));
        }
        return conflicts;
    }

    /**
     * Kiểm tra giáo viên có bị trùng với ca thi khác không.
     */
    public List<String> checkTeacherExamConflicts(UUID teacherId, LocalDate examDate,
            LocalTime startTime, LocalTime endTime) {
        List<String> conflicts = new ArrayList<>();
        List<ExamInvigilator> conflicting = examInvigilatorRepository.findConflictingTeachers(
                teacherId, examDate, startTime, endTime);

        for (ExamInvigilator invigilator : conflicting) {
            ExamRoom examRoom = invigilator.getExamRoom();
            ExamSchedule examSchedule = examRoom.getExamSchedule();
            conflicts.add(String.format(
                    "Giáo viên đã gác thi môn %s tại phòng %s từ %s đến %s ngày %s",
                    examSchedule.getSubject().getName(),
                    examRoom.getRoom().getName(),
                    examSchedule.getStartTime(), examSchedule.getEndTime(), examSchedule.getExamDate()));
        }
        return conflicts;
    }

    /**
     * Kiểm tra giáo viên có bị trùng với TKB chính khóa không.
     * So sánh ngày thi → DayOfWeek → tìm các tiết dạy, rồi check overlap giờ.
     */
    public List<String> checkTeacherTimetableConflicts(UUID teacherId, School school,
            com.schoolmanagement.backend.domain.entity.admin.Semester semester,
            LocalDate examDate,
            LocalTime startTime, LocalTime endTime) {
        List<String> conflicts = new ArrayList<>();

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

    /**
     * Phương thức tổng hợp: kiểm tra toàn bộ xung đột cho 1 phòng + giáo viên.
     */
    public List<String> checkAllConflicts(UUID roomId, UUID teacherId, School school,
            com.schoolmanagement.backend.domain.entity.admin.Semester semester,
            LocalDate examDate, LocalTime startTime, LocalTime endTime) {
        List<String> all = new ArrayList<>();
        all.addAll(checkRoomConflicts(roomId, examDate, startTime, endTime));
        if (teacherId != null) {
            all.addAll(checkTeacherExamConflicts(teacherId, examDate, startTime, endTime));
            all.addAll(checkTeacherTimetableConflicts(teacherId, school, semester,
                    examDate, startTime, endTime));
        }
        return all;
    }
}
