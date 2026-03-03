package com.schoolmanagement.backend.service;

import com.schoolmanagement.backend.domain.ExamSessionStatus;
import com.schoolmanagement.backend.domain.InvigilatorRole;
import com.schoolmanagement.backend.domain.entity.*;
import com.schoolmanagement.backend.dto.ExamAllocateRequest;
import com.schoolmanagement.backend.dto.ExamRoomDetailDto;
import com.schoolmanagement.backend.dto.ExamScheduleDetailDto;
import com.schoolmanagement.backend.dto.ExamSessionDto;
import com.schoolmanagement.backend.dto.ExamStudentDetailDto;
import com.schoolmanagement.backend.exception.ApiException;
import com.schoolmanagement.backend.repo.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ExamSessionService {

        private final ExamSessionRepository examSessionRepo;
        private final ExamScheduleRepository examScheduleRepo;
        private final ExamRoomRepository examRoomRepo;
        private final ExamInvigilatorRepository examInvigilatorRepo;
        private final RoomRepository roomRepo;
        private final SubjectRepository subjectRepo;
        private final TeacherRepository teacherRepo;
        private final SchoolRepository schoolRepo;
        private final ExamStudentRepository examStudentRepo;
        private final ExamAllocationService allocationService;
        private final ConflictDetectionService conflictService;

        // ==================== ExamSession CRUD ====================

        public List<ExamSessionDto> listSessions(UUID schoolId) {
                return examSessionRepo.findBySchoolIdOrderByStartDateDesc(schoolId).stream()
                                .map(this::toDto)
                                .collect(Collectors.toList());
        }

        public ExamSessionDto getSession(UUID id, UUID schoolId) {
                ExamSession session = examSessionRepo.findByIdAndSchoolId(id, schoolId)
                                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy kỳ thi"));
                return toDto(session);
        }

        @Transactional
        public ExamSessionDto createSession(ExamSessionDto dto, UUID schoolId) {
                School school = schoolRepo.findById(schoolId)
                                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy trường"));

                ExamSession session = ExamSession.builder()
                                .name(dto.getName())
                                .academicYear(dto.getAcademicYear())
                                .semester(dto.getSemester())
                                .startDate(dto.getStartDate())
                                .endDate(dto.getEndDate())
                                .status(dto.getStatus() != null ? dto.getStatus() : ExamSessionStatus.DRAFT)
                                .school(school)
                                .build();

                return toDto(examSessionRepo.save(session));
        }

        @Transactional
        public ExamSessionDto updateSession(UUID id, ExamSessionDto dto, UUID schoolId) {
                ExamSession session = examSessionRepo.findByIdAndSchoolId(id, schoolId)
                                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy kỳ thi"));

                session.setName(dto.getName());
                session.setAcademicYear(dto.getAcademicYear());
                session.setSemester(dto.getSemester());
                session.setStartDate(dto.getStartDate());
                session.setEndDate(dto.getEndDate());
                if (dto.getStatus() != null) {
                        session.setStatus(dto.getStatus());
                }

                return toDto(examSessionRepo.save(session));
        }

        @Transactional
        public void deleteSession(UUID id, UUID schoolId) {
                ExamSession session = examSessionRepo.findByIdAndSchoolId(id, schoolId)
                                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy kỳ thi"));

                // Cascade delete child entities in correct order
                // 1. Delete invigilators (depend on exam_rooms)
                examInvigilatorRepo.deleteBySessionId(id);
                // 2. Delete students (depend on exam_rooms)
                examStudentRepo.deleteBySessionId(id);
                // 3. Delete exam rooms (depend on exam_schedules)
                examRoomRepo.deleteBySessionId(id);
                // 4. Delete exam schedules (depend on exam_session)
                examScheduleRepo.deleteBySessionId(id);
                // 5. Finally delete the session itself
                examSessionRepo.delete(session);

                log.info("Deleted exam session '{}' (id={}) and all related data", session.getName(), id);
        }

        @Transactional
        public ExamSessionDto updateSessionStatus(UUID id, String statusStr, UUID schoolId) {
                ExamSession session = examSessionRepo.findByIdAndSchoolId(id, schoolId)
                                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy kỳ thi"));

                ExamSessionStatus newStatus;
                try {
                        newStatus = ExamSessionStatus.valueOf(statusStr.toUpperCase());
                } catch (IllegalArgumentException e) {
                        throw new ApiException(HttpStatus.BAD_REQUEST,
                                        "Trạng thái không hợp lệ: " + statusStr
                                                        + ". Chỉ hỗ trợ: DRAFT, PUBLISHED, COMPLETED");
                }

                // Validate status transition
                ExamSessionStatus currentStatus = session.getStatus();
                if (currentStatus == ExamSessionStatus.DRAFT && newStatus != ExamSessionStatus.PUBLISHED) {
                        throw new ApiException(HttpStatus.BAD_REQUEST,
                                        "Kỳ thi đang ở trạng thái Nháp chỉ có thể chuyển sang Công bố");
                }
                if (currentStatus == ExamSessionStatus.PUBLISHED && newStatus != ExamSessionStatus.COMPLETED) {
                        throw new ApiException(HttpStatus.BAD_REQUEST,
                                        "Kỳ thi đang Công bố chỉ có thể chuyển sang Hoàn thành");
                }
                if (currentStatus == ExamSessionStatus.COMPLETED) {
                        throw new ApiException(HttpStatus.BAD_REQUEST,
                                        "Kỳ thi đã Hoàn thành không thể thay đổi trạng thái");
                }

                session.setStatus(newStatus);
                log.info("Updated exam session '{}' status: {} -> {}", session.getName(), currentStatus, newStatus);
                return toDto(examSessionRepo.save(session));
        }

        // ==================== Allocation Flow ====================

        /**
         * Thực hiện phân bổ: tạo ExamSchedule, ExamRoom, ExamInvigilator,
         * rồi gọi ExamAllocationService để phân bổ học sinh.
         */
        @Transactional
        public int allocateExam(ExamAllocateRequest req, School school) {
                // Validate session
                ExamSession session = examSessionRepo.findById(req.getExamSessionId())
                                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy kỳ thi"));

                Subject subject = subjectRepo.findById(req.getSubjectId())
                                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy môn học"));

                // Conflict check cho mỗi phòng
                List<String> allConflicts = new ArrayList<>();
                for (ExamAllocateRequest.RoomAllocation ra : req.getRooms()) {
                        List<String> roomConflicts = conflictService.checkRoomConflicts(
                                        ra.getRoomId(), req.getExamDate(), req.getStartTime(), req.getEndTime());
                        allConflicts.addAll(roomConflicts);

                        if (ra.getTeacherIds() != null) {
                                for (UUID teacherId : ra.getTeacherIds()) {
                                        allConflicts.addAll(conflictService.checkTeacherExamConflicts(
                                                        teacherId, req.getExamDate(), req.getStartTime(),
                                                        req.getEndTime()));
                                        allConflicts.addAll(conflictService.checkTeacherTimetableConflicts(
                                                        teacherId, school, session.getAcademicYear(),
                                                        session.getSemester(),
                                                        req.getExamDate(), req.getStartTime(), req.getEndTime()));
                                }
                        }
                }

                if (!allConflicts.isEmpty()) {
                        throw new ApiException(HttpStatus.CONFLICT,
                                        "Phát hiện xung đột:\n• " + String.join("\n• ", allConflicts));
                }

                // Tạo ExamSchedule
                ExamSchedule schedule = ExamSchedule.builder()
                                .examSession(session)
                                .subject(subject)
                                .grade(req.getGrade())
                                .examDate(req.getExamDate())
                                .startTime(req.getStartTime())
                                .endTime(req.getEndTime())
                                .duration((int) java.time.Duration.between(req.getStartTime(), req.getEndTime())
                                                .toMinutes())
                                .examType(com.schoolmanagement.backend.domain.ExamType.MIDTERM) // Fallback for DB
                                                                                                // backward
                                                                                                // compatibility
                                .status(com.schoolmanagement.backend.domain.ExamStatus.UPCOMING)
                                .academicYear(session.getAcademicYear())
                                .semester(session.getSemester())
                                .school(school)
                                .build();
                schedule = examScheduleRepo.save(schedule);

                // Tạo ExamRoom + ExamInvigilator cho mỗi phòng
                for (ExamAllocateRequest.RoomAllocation ra : req.getRooms()) {
                        Room room = roomRepo.findById(ra.getRoomId())
                                        .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND,
                                                        "Không tìm thấy phòng " + ra.getRoomId()));

                        ExamRoom examRoom = ExamRoom.builder()
                                        .examSchedule(schedule)
                                        .room(room)
                                        .capacity(ra.getCapacity() != null ? ra.getCapacity() : room.getCapacity())
                                        .build();
                        examRoom = examRoomRepo.save(examRoom);

                        // Gán giám thị
                        if (ra.getTeacherIds() != null) {
                                for (int i = 0; i < ra.getTeacherIds().size(); i++) {
                                        UUID teacherId = ra.getTeacherIds().get(i);
                                        Teacher teacher = teacherRepo.findById(teacherId)
                                                        .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND,
                                                                        "Không tìm thấy giáo viên"));

                                        ExamInvigilator invigilator = ExamInvigilator.builder()
                                                        .examRoom(examRoom)
                                                        .teacher(teacher)
                                                        .role(i == 0 ? InvigilatorRole.MAIN_INVIGILATOR
                                                                        : InvigilatorRole.ASST_INVIGILATOR)
                                                        .build();
                                        examInvigilatorRepo.save(invigilator);
                                }
                        }
                }

                // Phân bổ học sinh ngẫu nhiên
                return allocationService.allocateStudents(schedule, school, session.getAcademicYear());
        }

        // ==================== View Schedule Details ====================

        @Transactional(readOnly = true)
        public List<ExamScheduleDetailDto> getSessionSchedules(UUID sessionId, UUID schoolId) {
                // Validate session belongs to school
                ExamSession session = examSessionRepo.findById(sessionId)
                                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy kỳ thi"));
                if (!session.getSchool().getId().equals(schoolId)) {
                        throw new ApiException(HttpStatus.FORBIDDEN, "Không có quyền truy cập kỳ thi này");
                }

                List<ExamSchedule> schedules = examScheduleRepo.findByExamSessionIdOrderByExamDate(sessionId);

                return schedules.stream().map(es -> {
                        List<ExamRoom> rooms = examRoomRepo.findByExamScheduleId(es.getId());

                        List<ExamRoomDetailDto> roomDtos = rooms.stream().map(er -> {
                                long studentCount = examStudentRepo.countByExamRoomId(er.getId());
                                List<ExamInvigilator> invigilators = examInvigilatorRepo.findByExamRoomId(er.getId());
                                List<String> invigilatorNames = invigilators.stream()
                                                .map(ei -> ei.getTeacher().getFullName())
                                                .collect(Collectors.toList());

                                return ExamRoomDetailDto.builder()
                                                .id(er.getId().toString())
                                                .roomName(er.getRoom().getName())
                                                .building(er.getRoom().getBuilding())
                                                .capacity(er.getCapacity())
                                                .studentCount(studentCount)
                                                .invigilatorNames(invigilatorNames)
                                                .build();
                        }).collect(Collectors.toList());

                        return ExamScheduleDetailDto.builder()
                                        .id(es.getId().toString())
                                        .subjectName(es.getSubject().getName())
                                        .grade(es.getGrade())
                                        .examDate(es.getExamDate().toString())
                                        .startTime(es.getStartTime().toString())
                                        .endTime(es.getEndTime() != null ? es.getEndTime().toString() : "")
                                        .rooms(roomDtos)
                                        .build();
                }).collect(Collectors.toList());
        }

        @Transactional(readOnly = true)
        public List<ExamStudentDetailDto> getRoomStudents(UUID examRoomId) {
                return examStudentRepo.findByExamRoomId(examRoomId).stream()
                                .map(es -> ExamStudentDetailDto.builder()
                                                .id(es.getId().toString())
                                                .studentCode(es.getStudent().getStudentCode())
                                                .fullName(es.getStudent().getFullName())
                                                .build())
                                .collect(Collectors.toList());
        }

        // ==================== Helpers ====================

        private ExamSessionDto toDto(ExamSession s) {
                return ExamSessionDto.builder()
                                .id(s.getId())
                                .name(s.getName())
                                .academicYear(s.getAcademicYear())
                                .semester(s.getSemester())
                                .startDate(s.getStartDate())
                                .endDate(s.getEndDate())
                                .status(s.getStatus())
                                .build();
        }
}
