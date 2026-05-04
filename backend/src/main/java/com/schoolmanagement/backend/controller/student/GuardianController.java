package com.schoolmanagement.backend.controller.student;

import com.schoolmanagement.backend.domain.auth.Role;
import com.schoolmanagement.backend.domain.entity.auth.User;
import com.schoolmanagement.backend.domain.entity.classes.ClassRoom;
import com.schoolmanagement.backend.domain.entity.student.Student;
import com.schoolmanagement.backend.dto.attendance.AttendanceSummaryDto;
import com.schoolmanagement.backend.dto.exam.ExamScheduleDto;
import com.schoolmanagement.backend.dto.grade.ScoreDto;
import com.schoolmanagement.backend.dto.student.GuardianDto;
import com.schoolmanagement.backend.dto.student.StudentDto;
import com.schoolmanagement.backend.dto.timetable.SimpleTimetableDetailDto;
import com.schoolmanagement.backend.security.UserPrincipal;
import com.schoolmanagement.backend.service.admin.SemesterService;
import com.schoolmanagement.backend.service.auth.UserLookupService;
import com.schoolmanagement.backend.service.classes.ClassManagementService;
import com.schoolmanagement.backend.service.student.GuardianService;
import com.schoolmanagement.backend.service.student.StudentManagementService;
import com.schoolmanagement.backend.service.student.StudentPortalService;
import com.schoolmanagement.backend.service.timetable.TimetableService;
import lombok.AllArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/guardian")
@Transactional(readOnly = true)
@AllArgsConstructor
public class GuardianController {
  private static final Logger log = LoggerFactory.getLogger(GuardianController.class);
  private final StudentManagementService studentManagementService;
  private final UserLookupService userLookupService;
  private final TimetableService timetableService;
  private final ClassManagementService classManagementService;
  private final StudentPortalService studentPortalService;
  private final GuardianService guardianService;
  private final SemesterService semesterService;

  @GetMapping("/student")
  public StudentDto getStudentData(@AuthenticationPrincipal UserPrincipal principal) {
    log.info("Guardian Controller hit!");
    User user = userLookupService.requireById(principal.getId());

    String guardianEmail = user.getEmail();
    return studentManagementService.getStudentWithGuardian(guardianEmail);
  }

  @GetMapping("/timetable/{studentId}")
  public List<SimpleTimetableDetailDto> getTimetableData(@AuthenticationPrincipal UserPrincipal principal,
      @PathVariable("studentId") String studentId,
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate targetDate) {
    log.info("Timetable data hit!");
    Student student = studentManagementService.getSingleStudent(UUID.fromString(studentId));
    String academicYearName = semesterService.getActiveAcademicYearName(student.getSchool());
    ClassRoom classRoom = classManagementService.getClassRoomLegacy(UUID.fromString(studentId), academicYearName,
        student.getSchool());

    return timetableService.getTimetableDetailsOfStudent(student, classRoom, targetDate);
  }

  /**
   * Get exam schedule for the student.
   * Supports filtering by academic year and semester.
   */
  @GetMapping("/exams")
  public ResponseEntity<List<ExamScheduleDto>> getExamSchedule(
      @RequestParam String studentId,
      @RequestParam(required = false) String semesterId) {
    log.info("Exams data hit!");
    List<ExamScheduleDto> exams = studentPortalService.getExamScheduleStudent(UUID.fromString(studentId),
        semesterId != null ? UUID.fromString(semesterId) : null);
    return ResponseEntity.ok(exams);
  }

  /**
   * Get scores for the student.
   * 
   * @param studentId  Student ID
   * @param semesterId Optional semester ID filter
   */
  @GetMapping("/scores")
  public ResponseEntity<List<ScoreDto>> getScores(
      @RequestParam String studentId,
      @RequestParam(required = false) String semesterId) {
    log.info("Scores data hit for guardian!");
    List<ScoreDto> scores = studentPortalService.getScores(
        UUID.fromString(studentId), semesterId);
    return ResponseEntity.ok(scores);
  }

  /**
   * Get profile data for the guardian user
   * Including user's phone number, email, full name, etc...
   */
  @GetMapping("/profile")
  public ResponseEntity<GuardianDto> getProfileData(@AuthenticationPrincipal UserPrincipal principal) {
    User user = userLookupService.requireById(principal.getId());
    if (user.getRole() != Role.GUARDIAN) {
      throw new ResponseStatusException(
          HttpStatus.FORBIDDEN,
          "Only guardian role is able to proceed");
    }
    GuardianDto guardianDto = guardianService.findGuardianByUser(user);
    return ResponseEntity.ok(guardianDto);
  }

  /**
   * Get attendance summary for the student.
   */
  @GetMapping("/attendance")
  public ResponseEntity<AttendanceSummaryDto> getAttendance(
      @RequestParam String studentId,
      @RequestParam(required = false) Integer month,
      @RequestParam(required = false) Integer year,
      @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate targetDate) {
    log.info("Attendance data hit for guardian!");
    AttendanceSummaryDto attendance = studentPortalService.getAttendance(
        UUID.fromString(studentId), month, year, targetDate);
    return ResponseEntity.ok(attendance);
  }
}
