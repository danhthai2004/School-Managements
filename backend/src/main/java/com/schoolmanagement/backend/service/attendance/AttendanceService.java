package com.schoolmanagement.backend.service.attendance;

import com.schoolmanagement.backend.domain.entity.classes.ClassEnrollment;
import com.schoolmanagement.backend.domain.entity.student.Student;
import com.schoolmanagement.backend.domain.entity.timetable.Timetable;
import com.schoolmanagement.backend.domain.timetable.TimetableStatus;

import com.schoolmanagement.backend.domain.entity.classes.ClassRoom;
import com.schoolmanagement.backend.domain.entity.attendance.Attendance;
import com.schoolmanagement.backend.domain.entity.admin.AcademicYear;
import com.schoolmanagement.backend.domain.entity.admin.School;

import com.schoolmanagement.backend.repo.attendance.AttendanceRepository;
import com.schoolmanagement.backend.repo.timetable.TimetableRepository;
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
import com.schoolmanagement.backend.dto.attendance.SaveAttendanceResultDto;
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
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class AttendanceService {

        private static final ZoneId VIETNAM_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

        private final AttendanceRepository attendanceRepository;
        private final TimetableRepository timetableRepository;
        private final TeacherRepository teacherRepository;
        private final UserRepository userRepository;
        private final TimetableDetailRepository timetableDetailRepository;
        private final ClassEnrollmentRepository classEnrollmentRepository;
        private final ClassRoomRepository classRoomRepository;
        private final com.schoolmanagement.backend.service.admin.SemesterService semesterService;
        private final SchoolTimetableSettingsService settingsService;
        private final StudentRepository studentRepository;

        // ==================== TEACHER: GET ATTENDANCE FOR SLOT ====================

        /**
         * Returns the attendance list for a specific slot.
         * Always shows the full class roster, merging any existing records.
         */
        public List<AttendanceDto> getAttendanceForSlot(String email, LocalDate date, int slotIndex) {
                User user = findUserByEmail(email);
                Teacher teacher = findTeacher(user);

                TimetableDetail detail = findTimetableDetail(teacher, date, slotIndex);
                ClassRoom classRoom = detail.getClassRoom();

                // 1. Full class roster (source of truth)
                AcademicYear year = getAcademicYear(user.getSchool(), date);
                List<ClassEnrollment> enrollments = classEnrollmentRepository
                                .findAllByClassRoomAndAcademicYear(classRoom, year);

                // 2. Existing records — look up by student IDs, not by classRoom
                // to correctly find records even if classRoom was different
                List<UUID> studentIds = enrollments.stream()
                                .map(e -> e.getStudent().getId())
                                .toList();

                Map<UUID, Attendance> savedMap = studentIds.isEmpty()
                                ? Collections.emptyMap()
                                : attendanceRepository
                                                .findAllByStudentIdInAndDateAndSlotIndex(studentIds, date, slotIndex)
                                                .stream()
                                                .collect(Collectors.toMap(
                                                                a -> a.getStudent().getId(),
                                                                Function.identity(),
                                                                (a, b) -> a));

                // 3. Merge: saved record wins, otherwise default to PRESENT
                return enrollments.stream()
                                .map(e -> {
                                        Student s = e.getStudent();
                                        Attendance saved = savedMap.get(s.getId());
                                        return AttendanceDto.builder()
                                                        .studentId(s.getId().toString())
                                                        .studentCode(s.getStudentCode())
                                                        .studentName(s.getFullName())
                                                        .status(saved != null ? saved.getStatus()
                                                                        : AttendanceStatus.PRESENT)
                                                        .remarks(saved != null ? saved.getRemarks() : "")
                                                        .build();
                                })
                                .sorted(Comparator.comparing(AttendanceDto::getStudentCode))
                                .toList();
        }

        // ==================== TEACHER: SAVE ATTENDANCE ====================

        /**
         * Saves attendance for a specific slot.
         * 
         * Flow:
         * 1. Validate teacher owns this slot on this date
         * 2. Validate date/time constraints
         * 3. De-duplicate incoming records (prevent same student appearing twice)
         * 4. Bulk-fetch existing DB records (one query, not N queries)
         * 5. Upsert: update existing or create new
         * 6. SaveAll in a single batch
         */
        @Transactional
        public SaveAttendanceResultDto saveAttendance(String email, SaveAttendanceRequest request) {
                User user = findUserByEmail(email);
                Teacher teacher = findTeacher(user);

                LocalDate date = request.getDate();
                int slotIndex = request.getSlotIndex();

                TimetableDetail detail = findTimetableDetail(teacher, date, slotIndex);
                ClassRoom classRoom = detail.getClassRoom();

                // --- Validation ---
                validateAttendanceDate(date, teacher, slotIndex);

                // --- Step 1: De-duplicate incoming records ---
                // If frontend sends the same studentId twice, keep only the first occurrence
                Map<UUID, SaveAttendanceRequest.AttendanceRecord> uniqueRecords = new LinkedHashMap<>();
                for (SaveAttendanceRequest.AttendanceRecord record : request.getRecords()) {
                        UUID sid = UUID.fromString(record.getStudentId());
                        uniqueRecords.putIfAbsent(sid, record);
                }

                List<UUID> studentIds = new ArrayList<>(uniqueRecords.keySet());
                if (studentIds.isEmpty()) {
                        return new SaveAttendanceResultDto(0, List.of());
                }

                // --- Step 2: Bulk-fetch students ---
                Map<UUID, Student> studentMap = studentRepository.findAllById(studentIds).stream()
                                .collect(Collectors.toMap(Student::getId, Function.identity()));

                // --- Step 3: Bulk-fetch existing attendance records ---
                // One query matches the unique constraint (student_id, attendance_date,
                // slot_index)
                Map<UUID, Attendance> existingMap = attendanceRepository
                                .findAllByStudentIdInAndDateAndSlotIndex(studentIds, date, slotIndex)
                                .stream()
                                .collect(Collectors.toMap(
                                                a -> a.getStudent().getId(),
                                                Function.identity(),
                                                (a, b) -> a)); // handle unlikely duplicates

                // --- Step 4: Upsert ---
                List<Attendance> toSave = new ArrayList<>();
                List<SaveAttendanceResultDto.SkippedStudentDto> skipped = new ArrayList<>();

                for (Map.Entry<UUID, SaveAttendanceRequest.AttendanceRecord> entry : uniqueRecords.entrySet()) {
                        UUID sid = entry.getKey();
                        SaveAttendanceRequest.AttendanceRecord record = entry.getValue();
                        Student student = studentMap.get(sid);

                        if (student == null) {
                                log.warn("Student {} not found during attendance save", sid);
                                skipped.add(new SaveAttendanceResultDto.SkippedStudentDto(
                                                sid.toString(), "Học sinh không tồn tại trong hệ thống."));
                                continue;
                        }

                        Attendance attendance = existingMap.get(sid);
                        if (attendance != null) {
                                // UPDATE existing record
                                attendance.setStatus(record.getStatus());
                                attendance.setRemarks(record.getRemarks());
                                attendance.setTeacher(teacher);
                                attendance.setClassRoom(classRoom);
                                attendance.setSubject(detail.getSubject());
                        } else {
                                // INSERT new record
                                attendance = Attendance.builder()
                                                .student(student)
                                                .classRoom(classRoom)
                                                .subject(detail.getSubject())
                                                .teacher(teacher)
                                                .attendanceDate(date)
                                                .slotIndex(slotIndex)
                                                .status(record.getStatus())
                                                .remarks(record.getRemarks())
                                                .build();
                        }
                        toSave.add(attendance);
                }

                attendanceRepository.saveAll(toSave);

                log.info("Saved attendance: {} records for slot {} on {} by teacher {}",
                                toSave.size(), slotIndex, date, email);

                return new SaveAttendanceResultDto(toSave.size(), skipped);
        }

        // ==================== HOMEROOM: DAILY SUMMARY ====================

        /**
         * Returns a daily attendance summary for the homeroom teacher's class.
         */
        public DailyAttendanceSummaryDto getDailyAttendanceSummary(String email, LocalDate date) {
                User user = findUserByEmail(email);
                AcademicYear year = getAcademicYear(user.getSchool(), date);
                ClassRoom homeroom = findHomeroomClass(user, year);

                List<ClassEnrollment> enrollments = classEnrollmentRepository
                                .findAllByClassRoomAndAcademicYear(homeroom, year);

                // Single query for all attendance records of this class on this date
                Map<UUID, List<Attendance>> byStudent = attendanceRepository
                                .findAllByClassRoomAndDate(homeroom, date)
                                .stream()
                                .collect(Collectors.groupingBy(a -> a.getStudent().getId()));

                List<DailyAttendanceSummaryDto.StudentDailyAttendance> summaries = enrollments.stream()
                                .map(e -> {
                                        Student s = e.getStudent();
                                        Map<Integer, AttendanceStatus> slotMap = byStudent
                                                        .getOrDefault(s.getId(), Collections.emptyList())
                                                        .stream()
                                                        .filter(a -> a.getSlotIndex() > 0)
                                                        .collect(Collectors.toMap(
                                                                        Attendance::getSlotIndex,
                                                                        Attendance::getStatus,
                                                                        (a, b) -> a));
                                        return DailyAttendanceSummaryDto.StudentDailyAttendance.builder()
                                                        .studentId(s.getId().toString())
                                                        .studentName(s.getFullName())
                                                        .slotTheStatus(slotMap)
                                                        .build();
                                })
                                .toList();

                boolean isFinalized = date.isBefore(LocalDate.now(VIETNAM_ZONE));

                return DailyAttendanceSummaryDto.builder()
                                .classroomName(homeroom.getName())
                                .date(date.toString())
                                .isFinalized(isFinalized)
                                .students(summaries)
                                .build();
        }

        // ==================== HOMEROOM: ATTENDANCE REPORT ====================

        /**
         * Generates an attendance report for a date range (weekly/monthly).
         */
        public AttendanceReportSummaryDto getAttendanceReport(String email, LocalDate startDate, LocalDate endDate,
                        String reportType) {
                User user = findUserByEmail(email);
                AcademicYear year = getAcademicYear(user.getSchool(), endDate);
                ClassRoom homeroom = findHomeroomClass(user, year);

                List<ClassEnrollment> enrollments = classEnrollmentRepository
                                .findAllByClassRoomAndAcademicYear(homeroom, year);

                // Single query for the entire date range
                List<Attendance> allRecords = attendanceRepository
                                .findAllByClassRoomAndDateBetween(homeroom, startDate, endDate);

                long totalSchoolDays = allRecords.stream()
                                .map(Attendance::getAttendanceDate)
                                .distinct()
                                .count();

                Map<UUID, List<Attendance>> byStudent = allRecords.stream()
                                .collect(Collectors.groupingBy(a -> a.getStudent().getId()));

                long totalPresentAll = 0;
                long totalSessionsAll = 0;
                List<AttendanceReportSummaryDto.StudentAttendanceSummary> studentSummaries = new ArrayList<>();

                for (ClassEnrollment e : enrollments) {
                        Student student = e.getStudent();
                        List<Attendance> records = byStudent.getOrDefault(student.getId(), Collections.emptyList());

                        // Count statuses in a single pass
                        int present = 0, absentExcused = 0, absentUnexcused = 0, late = 0;
                        for (Attendance a : records) {
                                switch (a.getStatus()) {
                                        case PRESENT -> present++;
                                        case ABSENT_EXCUSED -> absentExcused++;
                                        case ABSENT_UNEXCUSED -> absentUnexcused++;
                                        case LATE -> late++;
                                }
                        }

                        int total = records.size();
                        double rate = total > 0 ? (double) (present + late) / total * 100.0 : 0.0;
                        totalPresentAll += (present + late);
                        totalSessionsAll += total;

                        studentSummaries.add(AttendanceReportSummaryDto.StudentAttendanceSummary.builder()
                                        .studentId(student.getId().toString())
                                        .studentName(student.getFullName())
                                        .totalPresent(present)
                                        .totalAbsentExcused(absentExcused)
                                        .totalAbsentUnexcused(absentUnexcused)
                                        .totalLate(late)
                                        .totalSessions(total)
                                        .attendanceRate(Math.round(rate * 10.0) / 10.0)
                                        .build());
                }

                double overallRate = totalSessionsAll > 0
                                ? (double) totalPresentAll / totalSessionsAll * 100.0
                                : 0.0;

                return AttendanceReportSummaryDto.builder()
                                .classroomName(homeroom.getName())
                                .startDate(startDate.toString())
                                .endDate(endDate.toString())
                                .reportType(reportType)
                                .students(studentSummaries)
                                .totalStudents(enrollments.size())
                                .totalSchoolDays((int) totalSchoolDays)
                                .overallAttendanceRate(Math.round(overallRate * 10.0) / 10.0)
                                .build();
        }

        // ==================== HOMEROOM: STUDENT DETAIL ====================

        /**
         * Returns detailed attendance records for a specific student in a date range.
         */
        public StudentAttendanceDetailDto getStudentAttendanceDetail(String email, UUID studentId,
                        LocalDate startDate, LocalDate endDate, String statusFilter) {
                findUserByEmail(email); // verify caller is a teacher

                Student student = studentRepository.findById(studentId)
                                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                                                "Không tìm thấy học sinh."));

                List<Attendance> records = attendanceRepository.findAllByStudentIdAndDateBetween(
                                studentId, startDate, endDate);

                // Optional status filter
                if (statusFilter != null && !statusFilter.isBlank()) {
                        AttendanceStatus filter = AttendanceStatus.valueOf(statusFilter);
                        records = records.stream()
                                        .filter(a -> a.getStatus() == filter)
                                        .toList();
                }

                List<StudentAttendanceDetailDto.AttendanceRecord> details = records.stream()
                                .sorted(Comparator.comparing(Attendance::getAttendanceDate)
                                                .thenComparingInt(Attendance::getSlotIndex))
                                .map(a -> StudentAttendanceDetailDto.AttendanceRecord.builder()
                                                .date(a.getAttendanceDate().toString())
                                                .slotIndex(a.getSlotIndex())
                                                .subjectName(a.getSubject() != null ? a.getSubject().getName() : "")
                                                .status(a.getStatus())
                                                .remarks(a.getRemarks() != null ? a.getRemarks() : "")
                                                .build())
                                .toList();

                return StudentAttendanceDetailDto.builder()
                                .studentId(studentId.toString())
                                .studentName(student.getFullName())
                                .records(details)
                                .build();
        }

        // ==================== ADMIN: GET / SAVE ATTENDANCE ====================

        public List<AttendanceDto> getAttendanceForSlotAsAdmin(School school, UUID classRoomId,
                        LocalDate date, int slotIndex) {
                ClassRoom classRoom = classRoomRepository.findByIdAndSchool(classRoomId, school)
                                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                                                "Lớp học không tồn tại hoặc không thuộc trường."));

                // 1. Full class roster
                AcademicYear year = getAcademicYear(school, date);
                List<ClassEnrollment> enrollments = classEnrollmentRepository
                                .findAllByClassRoomAndAcademicYear(classRoom, year);

                // 2. Existing records — bulk lookup by student IDs
                List<UUID> studentIds = enrollments.stream()
                                .map(e -> e.getStudent().getId())
                                .toList();

                Map<UUID, Attendance> savedMap = studentIds.isEmpty()
                                ? Collections.emptyMap()
                                : attendanceRepository
                                                .findAllByStudentIdInAndDateAndSlotIndex(studentIds, date, slotIndex)
                                                .stream()
                                                .collect(Collectors.toMap(
                                                                a -> a.getStudent().getId(),
                                                                Function.identity(),
                                                                (a, b) -> a));

                // 3. Merge
                return enrollments.stream()
                                .map(e -> {
                                        Student s = e.getStudent();
                                        Attendance saved = savedMap.get(s.getId());
                                        return AttendanceDto.builder()
                                                        .studentId(s.getId().toString())
                                                        .studentCode(s.getStudentCode())
                                                        .studentName(s.getFullName())
                                                        .status(saved != null ? saved.getStatus()
                                                                        : AttendanceStatus.PRESENT)
                                                        .remarks(saved != null ? saved.getRemarks() : "")
                                                        .build();
                                })
                                .sorted(Comparator.comparing(AttendanceDto::getStudentCode))
                                .toList();
        }

        @Transactional
        public SaveAttendanceResultDto saveAttendanceAsAdmin(School school, UUID classRoomId,
                        SaveAttendanceRequest request) {
                ClassRoom classRoom = classRoomRepository.findByIdAndSchool(classRoomId, school)
                                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                                                "Lớp học không tồn tại."));

                Timetable timetable = timetableRepository
                                .findFirstBySchoolAndStatusOrderByCreatedAtDesc(school, TimetableStatus.OFFICIAL)
                                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST,
                                                "Chưa có thời khóa biểu chính thức."));

                TimetableDetail detail = timetableDetailRepository
                                .findByTimetableAndClassRoomAndDayOfWeekAndSlotIndex(timetable, classRoom,
                                                request.getDate().getDayOfWeek(), request.getSlotIndex())
                                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST,
                                                "Không có tiết học này trong thời khóa biểu."));

                // De-duplicate
                Map<UUID, SaveAttendanceRequest.AttendanceRecord> uniqueRecords = new LinkedHashMap<>();
                for (SaveAttendanceRequest.AttendanceRecord item : request.getRecords()) {
                        UUID sid = UUID.fromString(item.getStudentId());
                        uniqueRecords.putIfAbsent(sid, item);
                }

                List<UUID> studentIds = new ArrayList<>(uniqueRecords.keySet());

                // Bulk fetch students
                Map<UUID, Student> studentMap = studentRepository.findAllById(studentIds).stream()
                                .collect(Collectors.toMap(Student::getId, Function.identity()));

                // Bulk fetch existing records
                Map<UUID, Attendance> existingMap = attendanceRepository
                                .findAllByStudentIdInAndDateAndSlotIndex(studentIds, request.getDate(),
                                                request.getSlotIndex())
                                .stream()
                                .collect(Collectors.toMap(
                                                a -> a.getStudent().getId(),
                                                Function.identity(),
                                                (a, b) -> a));

                List<Attendance> toSave = new ArrayList<>();
                List<SaveAttendanceResultDto.SkippedStudentDto> skipped = new ArrayList<>();

                for (Map.Entry<UUID, SaveAttendanceRequest.AttendanceRecord> entry : uniqueRecords.entrySet()) {
                        UUID sid = entry.getKey();
                        SaveAttendanceRequest.AttendanceRecord item = entry.getValue();
                        Student student = studentMap.get(sid);

                        if (student == null) {
                                skipped.add(new SaveAttendanceResultDto.SkippedStudentDto(
                                                sid.toString(), "Không tìm thấy học sinh."));
                                continue;
                        }

                        Attendance attendance = existingMap.get(sid);
                        if (attendance != null) {
                                attendance.setStatus(item.getStatus());
                                attendance.setRemarks(item.getRemarks());
                                attendance.setClassRoom(classRoom);
                                attendance.setSubject(detail.getSubject());
                        } else {
                                attendance = Attendance.builder()
                                                .student(student)
                                                .classRoom(classRoom)
                                                .subject(detail.getSubject())
                                                .attendanceDate(request.getDate())
                                                .slotIndex(request.getSlotIndex())
                                                .status(item.getStatus())
                                                .remarks(item.getRemarks())
                                                .build();
                        }
                        toSave.add(attendance);
                }

                attendanceRepository.saveAll(toSave);
                return new SaveAttendanceResultDto(toSave.size(), skipped);
        }

        public List<TimetableDetail> getTimetableSlotsForClassOnDate(School school, UUID classRoomId, LocalDate date) {
                ClassRoom classRoom = classRoomRepository.findByIdAndSchool(classRoomId, school)
                                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                                                "Lớp học không tồn tại."));

                Timetable timetable = timetableRepository
                                .findFirstBySchoolAndStatusOrderByCreatedAtDesc(school, TimetableStatus.OFFICIAL)
                                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST,
                                                "Chưa có thời khóa biểu chính thức."));

                return timetableDetailRepository.findAllByTimetableAndClassRoomAndDayOfWeek(
                                timetable, classRoom, date.getDayOfWeek());
        }

        // ==================== PRIVATE HELPERS ====================

        private User findUserByEmail(String email) {
                return userRepository.findByEmailIgnoreCaseWithSchool(email)
                                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                                                "Không tìm thấy người dùng."));
        }

        private Teacher findTeacher(User user) {
                return teacherRepository.findByUser(user)
                                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                                                "Không tìm thấy hồ sơ giáo viên."));
        }

        private AcademicYear getAcademicYear(School school, LocalDate date) {
                return semesterService.getAcademicYearByDate(school, date);
        }

        private ClassRoom findHomeroomClass(User user, AcademicYear year) {
                return classRoomRepository
                                .findByHomeroomTeacher_IdAndAcademicYear(user.getId(), year)
                                .orElseGet(() -> classRoomRepository
                                                .findTopByHomeroomTeacher_IdOrderByAcademicYear_StartDateDesc(
                                                                user.getId())
                                                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN,
                                                                "Bạn không phải là giáo viên chủ nhiệm.")));
        }

        private TimetableDetail findTimetableDetail(Teacher teacher, LocalDate date, int slotIndex) {
                Timetable timetable = timetableRepository
                                .findFirstBySchoolAndStatusOrderByCreatedAtDesc(
                                                teacher.getUser().getSchool(), TimetableStatus.OFFICIAL)
                                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST,
                                                "Chưa có thời khóa biểu chính thức."));

                return timetableDetailRepository
                                .findByTimetableAndTeacherAndDayOfWeekAndSlotIndex(
                                                timetable, teacher, date.getDayOfWeek(), slotIndex)
                                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN,
                                                "Giáo viên không được phân tiết " + slotIndex + " vào ngày " + date));
        }

        /**
         * Validates date constraints for saving attendance:
         * - Cannot save for past dates (auto-locked after midnight)
         * - Cannot save for future dates
         * - Cannot save for closed semesters
         * - Cannot save before slot start time
         */
        private void validateAttendanceDate(LocalDate date, Teacher teacher, int slotIndex) {
                LocalDate today = LocalDate.now(VIETNAM_ZONE);

                if (date.isBefore(today)) {
                        throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                                        "Điểm danh ngày này đã bị khóa tự động. Không thể chỉnh sửa.");
                }
                if (date.isAfter(today)) {
                        throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                                        "Không thể thực hiện điểm danh cho tương lai. Vui lòng quay lại vào ngày "
                                                        + date);
                }

                // Check semester status
                var semester = semesterService.getSemesterByDate(teacher.getUser().getSchool(), date);
                if (semester != null
                                && semester.getStatus() == com.schoolmanagement.backend.domain.admin.SemesterStatus.CLOSED) {
                        throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                                        "Học kỳ đã chốt sổ. Chỉ Giám thị hoặc Admin mới được phép chỉnh sửa.");
                }

                // Check slot start time (today only)
                if (date.isEqual(today)) {
                        try {
                                TimetableScheduleSummaryDto.SlotTimeDto slotTime = settingsService
                                                .calculateSlotTime(teacher.getUser().getSchool(), slotIndex);
                                LocalTime slotStart = LocalTime.parse(slotTime.getStartTime());
                                if (LocalTime.now(VIETNAM_ZONE).isBefore(slotStart)) {
                                        throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                                                        "Chưa đến giờ bắt đầu tiết " + slotIndex
                                                                        + " (" + slotTime.getStartTime()
                                                                        + "). Không thể điểm danh.");
                                }
                        } catch (ResponseStatusException e) {
                                throw e;
                        } catch (Exception e) {
                                log.warn("Cannot verify slot start time, allowing: {}", e.getMessage());
                        }
                }
        }
}
