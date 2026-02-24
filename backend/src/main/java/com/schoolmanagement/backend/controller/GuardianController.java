package com.schoolmanagement.backend.controller;

import com.schoolmanagement.backend.domain.Role;
import com.schoolmanagement.backend.domain.entity.*;
import com.schoolmanagement.backend.dto.SimpleTimetableDetailDto;
import com.schoolmanagement.backend.dto.StudentDto;
import com.schoolmanagement.backend.dto.student.ExamScheduleDto;
import com.schoolmanagement.backend.repo.GuardianRepository;
import com.schoolmanagement.backend.service.*;
import com.schoolmanagement.backend.util.TimeUtils;
import lombok.AllArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import com.schoolmanagement.backend.dto.StudentDto.GuardianDto;
import com.schoolmanagement.backend.security.UserPrincipal;
import org.springframework.web.server.ResponseStatusException;

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
  private final GuardianRepository guardianRepository;

  @GetMapping("/student")
  public StudentDto getStudentData(@AuthenticationPrincipal UserPrincipal principal) {
    log.info("Guardian Controller hit!");
    User user = userLookupService.requireById(principal.getId());

    String guardianEmail = user.getEmail();
    return studentManagementService.getStudentWithGuardian(guardianEmail);
  }

  @GetMapping("/timetable/{studentId}")
  public List<SimpleTimetableDetailDto> getTimetableData(@AuthenticationPrincipal UserPrincipal principal,
                                                         @PathVariable("studentId") String studentId) {
    log.info("Timetable data hit!");
    Student student = studentManagementService.getSingleStudent(UUID.fromString(studentId));
    String academicYear = TimeUtils.getCurrentAcademicYear();
    ClassRoom classRoom = classManagementService.getClassRoom(UUID.fromString(studentId), academicYear);

    return timetableService.getTimetableDetailsOfStudent(student, classRoom);
  }


  /**
   * Get exam schedule for the student.
   * Supports filtering by academic year and semester.
   */
  @GetMapping("/exams")
  public ResponseEntity<List<ExamScheduleDto>> getExamSchedule(
          @RequestParam String studentId,
          @RequestParam(required = false) String academicYear,
          @RequestParam(required = false) Integer semester) {
    log.info("Exams data hit!");
    List<ExamScheduleDto> exams = studentPortalService.getExamScheduleStudent(UUID.fromString(studentId), academicYear, semester);
    return ResponseEntity.ok(exams);
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
              "Only guardian role is able to proceed"
      );
    }
    GuardianDto guardianDto = guardianService.findGuardianByUser(user);
    return ResponseEntity.ok(guardianDto);
  }
}
