package com.schoolmanagement.backend.service.exam;

import com.schoolmanagement.backend.domain.entity.exam.ExamSchedule;
import com.schoolmanagement.backend.repo.exam.ExamSessionRepository;
import com.schoolmanagement.backend.repo.exam.ExamScheduleRepository;
import com.schoolmanagement.backend.repo.admin.SchoolRepository;
import com.schoolmanagement.backend.domain.entity.admin.AcademicYear;
import com.schoolmanagement.backend.domain.entity.admin.School;
import com.schoolmanagement.backend.domain.entity.exam.ExamSession;
import com.schoolmanagement.backend.domain.exam.ExamSessionStatus;
import com.schoolmanagement.backend.domain.exam.ExamStatus;
import com.schoolmanagement.backend.domain.exam.ExamType;
import com.schoolmanagement.backend.repo.classes.SubjectRepository;

import com.schoolmanagement.backend.dto.exam.ExamScheduleDetailDto;
import com.schoolmanagement.backend.dto.exam.ExamSessionDto;
import com.schoolmanagement.backend.exception.ApiException;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class ExamSessionService {

        private final ExamSessionRepository examSessionRepo;
        private final ExamScheduleRepository examScheduleRepo;
        private final SchoolRepository schoolRepo;
        private final com.schoolmanagement.backend.repo.admin.SemesterRepository semesterRepo;
        private final com.schoolmanagement.backend.repo.admin.AcademicYearRepository academicYearRepo;
        private final SubjectRepository subjectRepo;

        // ==================== ExamSession CRUD ====================

        public List<ExamSessionDto> listSessions(UUID schoolId, String academicYear, Integer semester) {
                return examSessionRepo.findBySchoolIdOrderByStartDateDesc(schoolId).stream()
                                .filter(s -> (academicYear == null || (s.getAcademicYear() != null
                                                && s.getAcademicYear().getName().equals(academicYear))))
                                .filter(s -> (semester == null || (s.getSemester() != null
                                                && s.getSemester().getSemesterNumber() == semester)))
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

                AcademicYear academicYear = academicYearRepo.findBySchoolAndName(school, dto.getAcademicYear())
                                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy năm học"));

                // Resolve Semester entity from academicYear + semesterNumber
                com.schoolmanagement.backend.domain.entity.admin.Semester semesterEntity = semesterRepo
                                .findByAcademicYearOrderBySemesterNumber(academicYear).stream()
                                .filter(s -> s.getSemesterNumber() == dto.getSemester())
                                .findFirst().orElse(null);

                ExamSession session = ExamSession.builder()
                                .name(dto.getName())
                                .academicYear(academicYear)
                                .semester(semesterEntity)
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

                AcademicYear academicYear = academicYearRepo
                                .findBySchoolAndName(session.getSchool(), dto.getAcademicYear())
                                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy năm học"));

                // Resolve Semester entity
                com.schoolmanagement.backend.domain.entity.admin.Semester semesterEntity = semesterRepo
                                .findByAcademicYearOrderBySemesterNumber(academicYear).stream()
                                .filter(s -> s.getSemesterNumber() == dto.getSemester())
                                .findFirst().orElse(null);

                session.setName(dto.getName());
                session.setAcademicYear(academicYear);
                session.setSemester(semesterEntity);
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

                // 1. Delete exam schedules (depend on exam_session)
                examScheduleRepo.deleteByExamSession_Id(id);
                // 2. Finally delete the session itself
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

                return schedules.stream().map(this::toDetailDto).collect(Collectors.toList());
        }

        private ExamScheduleDetailDto toDetailDto(ExamSchedule es) {
                return ExamScheduleDetailDto.builder()
                                .id(es.getId().toString())
                                .subjectName(es.getSubject().getName())
                                .grade(es.getGrade())
                                .examDate(es.getExamDate().toString())
                                .startTime(es.getStartTime().toString())
                                .endTime(es.getEndTime() != null ? es.getEndTime().toString() : "")
                                .note(es.getNote() != null ? es.getNote() : "")
                                .build();
        }

        @Transactional
        public void bulkCreateSchedules(UUID sessionId, List<ExamScheduleDetailDto> dtos, UUID schoolId) {
                ExamSession session = examSessionRepo.findByIdAndSchoolId(sessionId, schoolId)
                                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy kỳ thi"));

                List<ExamSchedule> newSchedules = new ArrayList<>();

                for (ExamScheduleDetailDto dto : dtos) {
                        var subject = subjectRepo.findByNameIgnoreCase(dto.getSubjectName())
                                        .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND,
                                                        "Không tìm thấy môn học: " + dto.getSubjectName()));

                        ExamSchedule schedule = ExamSchedule.builder()
                                        .examSession(session)
                                        .subject(subject)
                                        .grade(dto.getGrade())
                                        .examDate(java.time.LocalDate.parse(dto.getExamDate()))
                                        .startTime(LocalTime.parse(dto.getStartTime()))
                                        .endTime(dto.getEndTime() != null && !dto.getEndTime().isBlank()
                                                        ? LocalTime.parse(dto.getEndTime())
                                                        : null)
                                        .duration(60) // Default 60 mins
                                        .note(dto.getNote())
                                        .examType(session.getName().contains("Giữa") ? ExamType.MIDTERM
                                                        : ExamType.FINAL)
                                        .status(ExamStatus.UPCOMING)
                                        .school(session.getSchool())
                                        .academicYear(session.getAcademicYear())
                                        .semester(session.getSemester())
                                        .build();
                        newSchedules.add(schedule);
                }

                examScheduleRepo.saveAll(newSchedules);
                log.info("Bulk created {} schedules for session {}", newSchedules.size(), session.getName());
        }

        @Transactional
        public ExamScheduleDetailDto updateSchedule(UUID scheduleId, ExamScheduleDetailDto dto, UUID schoolId) {
                ExamSchedule schedule = examScheduleRepo.findById(scheduleId)
                                .filter(s -> s.getSchool().getId().equals(schoolId))
                                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy lịch thi"));

                if (schedule.getExamSession().getStatus() != ExamSessionStatus.DRAFT) {
                        throw new ApiException(HttpStatus.BAD_REQUEST,
                                        "Chỉ có thể chỉnh sửa lịch thi khi kỳ thi đang ở trạng thái Nháp");
                }

                var subject = subjectRepo.findByNameIgnoreCase(dto.getSubjectName())
                                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND,
                                                "Không tìm thấy môn học: " + dto.getSubjectName()));

                schedule.setSubject(subject);
                schedule.setGrade(dto.getGrade());
                schedule.setExamDate(java.time.LocalDate.parse(dto.getExamDate()));
                schedule.setStartTime(LocalTime.parse(dto.getStartTime()));
                schedule.setEndTime(dto.getEndTime() != null && !dto.getEndTime().isBlank()
                                ? LocalTime.parse(dto.getEndTime())
                                : null);
                schedule.setNote(dto.getNote());

                return toDetailDto(examScheduleRepo.save(schedule));
        }

        @Transactional
        public void deleteSchedule(UUID scheduleId, UUID schoolId) {
                ExamSchedule schedule = examScheduleRepo.findById(scheduleId)
                                .filter(s -> s.getSchool().getId().equals(schoolId))
                                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy lịch thi"));

                if (schedule.getExamSession().getStatus() != ExamSessionStatus.DRAFT) {
                        throw new ApiException(HttpStatus.BAD_REQUEST,
                                        "Chỉ có thể xóa lịch thi khi kỳ thi đang ở trạng thái Nháp");
                }

                examScheduleRepo.delete(schedule);
        }

        // ==================== Helpers ====================

        private ExamSessionDto toDto(ExamSession examSession) {
                return ExamSessionDto.builder()
                                .id(examSession.getId())
                                .name(examSession.getName())
                                .academicYear(examSession.getAcademicYear() != null
                                                ? examSession.getAcademicYear().getName()
                                                : "")
                                .semester(examSession.getSemester() != null
                                                ? examSession.getSemester().getSemesterNumber()
                                                : 1)
                                .startDate(examSession.getStartDate())
                                .endDate(examSession.getEndDate())
                                .status(examSession.getStatus())
                                .build();
        }
}
