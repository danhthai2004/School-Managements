package com.schoolmanagement.backend.controller;

import com.schoolmanagement.backend.domain.TimetableStatus;
import com.schoolmanagement.backend.domain.entity.School;
import com.schoolmanagement.backend.domain.entity.Timetable;
import com.schoolmanagement.backend.domain.entity.TimetableDetail;
import com.schoolmanagement.backend.dto.SimpleTimetableDetailDto;
import com.schoolmanagement.backend.dto.TimetableDetailDto;
import com.schoolmanagement.backend.service.TimetableService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.schoolmanagement.backend.domain.entity.User;
import com.schoolmanagement.backend.dto.StudentDto;
import com.schoolmanagement.backend.security.UserPrincipal;
import com.schoolmanagement.backend.service.StudentManagementService;
import com.schoolmanagement.backend.service.UserLookupService;

import java.util.List;

@RestController
@RequestMapping("/api/guardian")
@Transactional(readOnly = true)
public class GuardianController {
  private static final Logger log = LoggerFactory.getLogger(GuardianController.class);
  private final StudentManagementService studentManagementService;
  private final UserLookupService userLookupService;
  private final TimetableService timetableService;

  // constructor
  public GuardianController(StudentManagementService studentManagementService, UserLookupService userLookupService, TimetableService timetableService) {
    this.studentManagementService = studentManagementService;
    this.userLookupService = userLookupService;
    this.timetableService = timetableService;
  }

  @GetMapping("/student")
  public StudentDto getStudentData(@AuthenticationPrincipal UserPrincipal principal) {
    log.info("Guardian Controller hit!");
    User user = userLookupService.requireById(principal.getId());

    String guardianEmail = user.getEmail();
    return studentManagementService.getStudentWithGuardian(guardianEmail);
  }

  @GetMapping("/timetable/{className}")
  public List<SimpleTimetableDetailDto> getTimetableData(@AuthenticationPrincipal UserPrincipal principal,
                                                         @PathVariable("className") String className) {
    log.info("Timetable data hit!");
    User user = userLookupService.requireById(principal.getId());
    return timetableService.getTimetableDetailsOfStudent(user, className);
  }
}
