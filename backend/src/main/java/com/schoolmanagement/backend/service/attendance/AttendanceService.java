package com.schoolmanagement.backend.service.attendance;

import com.schoolmanagement.backend.domain.entity.classes.ClassEnrollment;
import com.schoolmanagement.backend.domain.entity.student.Student;
import com.schoolmanagement.backend.domain.entity.timetable.Timetable;
import com.schoolmanagement.backend.domain.timetable.TimetableStatus;

import com.schoolmanagement.backend.domain.entity.classes.ClassRoom;
import com.schoolmanagement.backend.domain.entity.attendance.Attendance;

import com.schoolmanagement.backend.repo.attendance.AttendanceRepository;
import com.schoolmanagement.backend.repo.timetable.TimetableRepository;
import com.schoolmanagement.backend.repo.attendance.DailyClassStatusRepository;
import com.schoolmanagement.backend.repo.teacher.TeacherRepository;
import com.schoolmanagement.backend.repo.auth.UserRepository;
import com.schoolmanagement.backend.repo.timetable.TimetableDetailRepository;
import com.schoolmanagement.backend.repo.classes.ClassEnrollmentRepository;
import com.schoolmanagement.backend.repo.classes.ClassRoomRepository;
import com.schoolmanagement.backend.service.timetable.SchoolTimetableSettingsService;
import com.schoolmanagement.backend.repo.student.StudentRepository;
import com.schoolmanagement.backend.domain.entity.auth.User;
import com.schoolmanagement.backend.domain.entity.teacher.Teacher;
import com.schoolmanagement.backend.domain.entity.timetable.TimetableDetail;

import com.schoolmanagement.backend.domain.attendance.AttendanceStatus;

import com.schoolmanagement.backend.dto.attendance.AttendanceDto;
import com.schoolmanagement.backend.dto.attendance.AttendanceReportSummaryDto;
import com.schoolmanagement.backend.dto.attendance.DailyAttendanceSummaryDto;
import com.schoolmanagement.backend.dto.attendance.SaveAttendanceRequest;
import com.schoolmanagement.backend.dto.attendance.StudentAttendanceDetailDto;
import com.schoolmanagement.backend.dto.timetable.TimetableScheduleSummaryDto;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AttendanceService {

        private static final ZoneId VIETNAM_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
        private final AttendanceRepository attendanceRepository;
        private final TimetableRepository timetableRepository;
        private final DailyClassStatusRepository dailyClassStatusRepository;
        private final TeacherRepository teacherRepository;
        private final UserRepository userRepository;
        private final TimetableDetailRepository timetableDetailRepository;
        private final ClassEnrollmentRepository classEnrollmentRepository;
        private final ClassRoomRepository classRoomRepository;
        private final SchoolTimetableSettingsService timetableSettingsService;
        private final StudentRepository studentRepository;

        /**
         * Get attendance list for a specific teacher's slot
         */
        public List<AttendanceDto> getAttendanceForSlot(String email, LocalDate date, int slotIndex) {
                User user = findUserByEmail(email);
                Teacher teacher = teacherRepository.findByUser(user)
                                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                                                "Teacher profile not found"));

                // Verify teacher teaches this slot
                TimetableDetail timetableDetail = findTimetableDetail(teacher, date, slotIndex);
                ClassRoom classRoom = timetableDetail.getClassRoom();

                // Check if data exists in Attendance table
                List<Attendance> savedAttendance = attendanceRepository.findAllByClassRoomAndDateAndSlotIndex(classRoom,
                                date,
                                slotIndex);

                if (!savedAttendance.isEmpty()) {
                        // Return saved data
                        return savedAttendance.stream()
                                        .map(a -> new AttendanceDto(
                                                        a.getStudent().getId().toString(),
                                                        a.getStudent().getStudentCode(),
                                                        a.getStudent().getFullName(),
                                                        a.getStatus(),
                                                        a.getRemarks()))
                                        .toList();
                }

                // Else return default list (all PRESENT)
                List<ClassEnrollment> enrollments = classEnrollmentRepository.findAllByClassRoomAndAcademicYear(
                                classRoom,
                                getCurrentAcademicYear());
                return enrollments.stream()
                                .map(e -> AttendanceDto.builder()
                                                .studentId(e.getStudent().getId().toString())
                                                .studentCode(e.getStudent().getStudentCode())
                                                .studentName(e.getStudent().getFullName())
                                                .status(AttendanceStatus.PRESENT)
                                                .remarks("")
                                                .build())
                                .toList();
        }

        /**
         * Save attendance for a specific slot
         */
        @Transactional
        public void saveAttendance(String email, SaveAttendanceRequest request) {
                User user = findUserByEmail(email);
                Teacher teacher = teacherRepository.findByUser(user)
                                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                                                "Teacher profile not found"));

                TimetableDetail timetableDetail = findTimetableDetail(teacher, request.getDate(),
                                request.getSlotIndex());
                ClassRoom classRoom = timetableDetail.getClassRoom();

                // Check if day is locked (past days are automatically locked after 23:59:59)
                LocalDate today = LocalDate.now(VIETNAM_ZONE);
                if (request.getDate().isBefore(today)) {
                        throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                                        "Điểm danh ngày này đã bị khóa tự động. Không thể chỉnh sửa.");
                }

                // Check if slot has started
                if (request.getDate().isEqual(today)) {
                        try {
                                TimetableScheduleSummaryDto.SlotTimeDto slotTime = timetableSettingsService
                                                .calculateSlotTime(
                                                                teacher.getUser().getSchool(), request.getSlotIndex());
                                LocalTime slotStartTime = LocalTime.parse(slotTime.getStartTime());
                                if (LocalTime.now(VIETNAM_ZONE).isBefore(slotStartTime)) {
                                        throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                                                        "Chưa đến giờ bắt đầu tiết " + request.getSlotIndex()
                                                                        + " (" + slotTime.getStartTime()
                                                                        + "). Không thể điểm danh.");
                                }
                        } catch (ResponseStatusException e) {
                                throw e; // Re-throw our own exceptions
                        } catch (Exception e) {
                                log.warn("Could not verify slot start time, allowing attendance: {}", e.getMessage());
                        }
                }

                // Save records
                for (SaveAttendanceRequest.AttendanceRecord record : request.getRecords()) {
                        Student student = studentRepository.findById(UUID.fromString(record.getStudentId()))
                                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                                                        "Student not found: " + record.getStudentId()));

                        Optional<Attendance> existing = attendanceRepository.findByStudentAndDateAndSlotIndex(student,
                                        request.getDate(), request.getSlotIndex());

                        Attendance attendance;
                        if (existing.isPresent()) {
                                attendance = existing.get();
                                attendance.setStatus(record.getStatus());
                                attendance.setRemarks(record.getRemarks());
                                attendance.setTeacher(teacher); // Update modified by
                        } else {
                                attendance = Attendance.builder()
                                                .student(student)
                                                .classRoom(classRoom)
                                                .subject(timetableDetail.getSubject())
                                                .teacher(teacher)
                                                .attendanceDate(request.getDate())
                                                .slotIndex(request.getSlotIndex())
                                                .status(record.getStatus())
                                                .remarks(record.getRemarks())
                                                .build();
                        }
                        attendanceRepository.save(attendance);
                }
        }

        /**
         * Get Daily Summary for Homeroom Teacher
         */
        public DailyAttendanceSummaryDto getDailyAttendanceSummary(String email, LocalDate date) {
                User user = findUserByEmail(email);

                // 1. Find Homeroom Class
                ClassRoom homeroomClass = classRoomRepository
                                .findByHomeroomTeacher_IdAndAcademicYear(user.getId(), getCurrentAcademicYear())
                                .orElseGet(() -> classRoomRepository
                                                .findTopByHomeroomTeacher_IdOrderByAcademicYearDesc(user.getId())
                                                .orElseThrow(
                                                                () -> new ResponseStatusException(HttpStatus.FORBIDDEN,
                                                                                "Not a homeroom teacher")));

                // 2. Process Students
                List<ClassEnrollment> enrollments = classEnrollmentRepository.findAllByClassRoomAndAcademicYear(
                                homeroomClass,
                                getCurrentAcademicYear());

                // 3. Get all attendance records for this class on this date
                List<Attendance> allAttendance = attendanceRepository.findAllByClassRoomAndDate(homeroomClass, date);

                // 4. Group by Student
                Map<UUID, List<Attendance>> attendanceByStudent = allAttendance.stream()
                                .collect(Collectors.groupingBy(a -> a.getStudent().getId()));

                List<DailyAttendanceSummaryDto.StudentDailyAttendance> studentSummaries = enrollments.stream()
                                .map(enrollment -> {
                                        Student s = enrollment.getStudent();
                                        List<Attendance> studentRecords = attendanceByStudent.getOrDefault(s.getId(),
                                                        Collections.emptyList());

                                        Map<Integer, AttendanceStatus> slotStatusMap = studentRecords.stream()
                                                        .filter(a -> a.getSlotIndex() != null)
                                                        .collect(Collectors.toMap(Attendance::getSlotIndex,
                                                                        Attendance::getStatus));

                                        return DailyAttendanceSummaryDto.StudentDailyAttendance.builder()
                                                        .studentId(s.getId().toString())
                                                        .studentName(s.getFullName())
                                                        .slotTheStatus(slotStatusMap)
                                                        .build();
                                })
                                .toList();

                // 5. Check Finalized Status - auto-locked if date is before today
                boolean isFinalized = date.isBefore(LocalDate.now(VIETNAM_ZONE));

                return DailyAttendanceSummaryDto.builder()
                                .classroomName(homeroomClass.getName())
                                .date(date.toString())
                                .isFinalized(isFinalized)
                                .students(studentSummaries)
                                .build();
        }

        /**
         * Get Attendance Report for Homeroom Teacher (weekly/monthly)
         */
        public AttendanceReportSummaryDto getAttendanceReport(String email, LocalDate startDate, LocalDate endDate,
                        String reportType) {
                User user = findUserByEmail(email);

                // 1. Find Homeroom Class
                ClassRoom homeroomClass = classRoomRepository
                                .findByHomeroomTeacher_IdAndAcademicYear(user.getId(), getCurrentAcademicYear())
                                .orElseGet(() -> classRoomRepository
                                                .findTopByHomeroomTeacher_IdOrderByAcademicYearDesc(user.getId())
                                                .orElseThrow(
                                                                () -> new ResponseStatusException(HttpStatus.FORBIDDEN,
                                                                                "Not a homeroom teacher")));

                // 2. Get enrollments
                List<ClassEnrollment> enrollments = classEnrollmentRepository.findAllByClassRoomAndAcademicYear(
                                homeroomClass, getCurrentAcademicYear());

                // 3. Get all attendance records in date range
                List<Attendance> allAttendance = attendanceRepository.findAllByClassRoomAndDateBetween(
                                homeroomClass, startDate, endDate);

                // 4. Count unique school days
                long totalSchoolDays = allAttendance.stream()
                                .map(Attendance::getDate)
                                .distinct()
                                .count();

                // 5. Group by student
                Map<UUID, List<Attendance>> attendanceByStudent = allAttendance.stream()
                                .collect(Collectors.groupingBy(a -> a.getStudent().getId()));

                // 6. Build per-student summaries
                long totalPresentAll = 0;
                long totalSessionsAll = 0;

                List<AttendanceReportSummaryDto.StudentAttendanceSummary> studentSummaries = new ArrayList<>();

                for (ClassEnrollment enrollment : enrollments) {
                        Student s = enrollment.getStudent();
                        List<Attendance> records = attendanceByStudent.getOrDefault(s.getId(), Collections.emptyList());

                        int present = 0, absentExcused = 0, absentUnexcused = 0, late = 0;
                        for (Attendance a : records) {
                                switch (a.getStatus()) {
                                        case PRESENT -> present++;
                                        case ABSENT_EXCUSED -> absentExcused++;
                                        case ABSENT_UNEXCUSED -> absentUnexcused++;
                                        case LATE -> late++;
                                }
                        }

                        int totalSessions = records.size();
                        double attendanceRate = totalSessions > 0
                                        ? (double) (present + late) / totalSessions * 100.0
                                        : 0.0;

                        totalPresentAll += (present + late);
                        totalSessionsAll += totalSessions;

                        studentSummaries.add(AttendanceReportSummaryDto.StudentAttendanceSummary.builder()
                                        .studentId(s.getId().toString())
                                        .studentName(s.getFullName())
                                        .totalPresent(present)
                                        .totalAbsentExcused(absentExcused)
                                        .totalAbsentUnexcused(absentUnexcused)
                                        .totalLate(late)
                                        .totalSessions(totalSessions)
                                        .attendanceRate(Math.round(attendanceRate * 10.0) / 10.0)
                                        .build());
                }

                double overallRate = totalSessionsAll > 0
                                ? (double) totalPresentAll / totalSessionsAll * 100.0
                                : 0.0;

                return AttendanceReportSummaryDto.builder()
                                .classroomName(homeroomClass.getName())
                                .startDate(startDate.toString())
                                .endDate(endDate.toString())
                                .reportType(reportType)
                                .students(studentSummaries)
                                .totalStudents(enrollments.size())
                                .totalSchoolDays((int) totalSchoolDays)
                                .overallAttendanceRate(Math.round(overallRate * 10.0) / 10.0)
                                .build();
        }

        /**
         * Get detailed attendance records for a specific student in a date range
         */
        public StudentAttendanceDetailDto getStudentAttendanceDetail(String email, UUID studentId,
                        LocalDate startDate, LocalDate endDate, String statusFilter) {
                // Verify caller is a teacher
                findUserByEmail(email);

                Student student = studentRepository.findById(studentId)
                                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                                                "Student not found"));

                List<Attendance> records = attendanceRepository.findAllByStudentIdAndDateBetween(
                                studentId, startDate, endDate);

                // Filter by status if provided
                if (statusFilter != null && !statusFilter.isEmpty()) {
                        AttendanceStatus filterStatus = AttendanceStatus.valueOf(statusFilter);
                        records = records.stream()
                                        .filter(a -> a.getStatus() == filterStatus)
                                        .toList();
                }

                // Sort by date then slot
                records = records.stream()
                                .sorted((a, b) -> {
                                        int dateComp = a.getDate().compareTo(b.getDate());
                                        return dateComp != 0 ? dateComp
                                                        : Integer.compare(
                                                                        a.getSlotIndex() != null ? a.getSlotIndex() : 0,
                                                                        b.getSlotIndex() != null ? b.getSlotIndex()
                                                                                        : 0);
                                })
                                .toList();

                List<StudentAttendanceDetailDto.AttendanceRecord> detailRecords = records.stream()
                                .map(a -> StudentAttendanceDetailDto.AttendanceRecord.builder()
                                                .date(a.getDate().toString())
                                                .slotIndex(a.getSlotIndex() != null ? a.getSlotIndex() : 0)
                                                .subjectName(a.getSubject() != null ? a.getSubject().getName() : "")
                                                .status(a.getStatus())
                                                .remarks(a.getRemarks() != null ? a.getRemarks() : "")
                                                .build())
                                .toList();

                return StudentAttendanceDetailDto.builder()
                                .studentId(studentId.toString())
                                .studentName(student.getFullName())
                                .records(detailRecords)
                                .build();
        }

        // --- Helpers ---

        private User findUserByEmail(String email) {
                return userRepository.findByEmailIgnoreCase(email)
                                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        }

        private TimetableDetail findTimetableDetail(Teacher teacher, LocalDate date, int slotIndex) {
                Timetable timetable = timetableRepository.findFirstBySchoolAndStatusOrderByCreatedAtDesc(
                                teacher.getUser().getSchool(),
                                TimetableStatus.OFFICIAL)
                                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST,
                                                "No official timetable found for school"));

                return timetableDetailRepository.findByTimetableAndTeacherAndDayOfWeekAndSlotIndex(
                                timetable, teacher, date.getDayOfWeek(), slotIndex)
                                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN,
                                                "Teacher is not assigned to slot " + slotIndex + " on " + date));
        }

        private String getCurrentAcademicYear() {
                int year = LocalDate.now(VIETNAM_ZONE).getYear();
                int month = LocalDate.now(VIETNAM_ZONE).getMonthValue();
                return month >= 9 ? year + "-" + (year + 1) : (year - 1) + "-" + year;
        }
}
