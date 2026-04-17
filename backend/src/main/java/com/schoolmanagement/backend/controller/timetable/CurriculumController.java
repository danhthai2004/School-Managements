package com.schoolmanagement.backend.controller.timetable;

import com.schoolmanagement.backend.dto.classes.CombinationDto;
import com.schoolmanagement.backend.dto.classes.SubjectDto;
import com.schoolmanagement.backend.dto.teacher.TeacherAssignmentDto;
import com.schoolmanagement.backend.dto.teacher.AssignTeacherRequest;
import com.schoolmanagement.backend.dto.classes.CreateCombinationRequest;
import com.schoolmanagement.backend.exception.ApiException;
import com.schoolmanagement.backend.security.UserPrincipal;
import com.schoolmanagement.backend.service.timetable.CurriculumService;
import com.schoolmanagement.backend.service.teacher.TeacherAssignmentService;
import com.schoolmanagement.backend.service.auth.UserLookupService;
import com.schoolmanagement.backend.dto.teacher.TeacherAssignmentUpdate;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/school")
@Transactional(readOnly = true)
public class CurriculumController {

    private final CurriculumService curriculumService;
    private final TeacherAssignmentService teacherAssignmentService;
    private final UserLookupService userLookup;

    public CurriculumController(CurriculumService curriculumService,
            TeacherAssignmentService teacherAssignmentService,
            UserLookupService userLookup) {
        this.curriculumService = curriculumService;
        this.teacherAssignmentService = teacherAssignmentService;
        this.userLookup = userLookup;
    }

    // ==================== SUBJECTS & COMBINATIONS ====================

    @GetMapping("/subjects")
    public List<SubjectDto> listSubjects(
            @AuthenticationPrincipal UserPrincipal principal) {
        return curriculumService.listAllSubjects();
    }

    @GetMapping("/combinations")
    public List<CombinationDto> listCombinations(
            @AuthenticationPrincipal UserPrincipal principal) {
        var admin = userLookup.requireById(principal.getId());
        if (admin.getSchool() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "School admin chưa được gán trường.");
        }
        return curriculumService.listCombinations(admin.getSchool());
    }

    @Transactional
    @PostMapping("/combinations")
    public CombinationDto createCombination(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody CreateCombinationRequest req) {
        var admin = userLookup.requireById(principal.getId());
        if (admin.getSchool() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "School admin chưa được gán trường.");
        }
        return curriculumService.createCombination(admin.getSchool(), req);
    }

    @Transactional
    @PutMapping("/combinations/{id}")
    public CombinationDto updateCombination(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable("id") UUID id,
            @Valid @RequestBody CreateCombinationRequest req) {
        var admin = userLookup.requireById(principal.getId());
        if (admin.getSchool() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "School admin chưa được gán trường.");
        }
        return curriculumService.updateCombination(id, admin.getSchool(), req);
    }

    @Transactional
    @DeleteMapping("/combinations/{id}")
    public void deleteCombination(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable("id") UUID id) {
        var admin = userLookup.requireById(principal.getId());
        if (admin.getSchool() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "School admin chưa được gán trường.");
        }
        curriculumService.deleteCombination(id, admin.getSchool());
    }

    // ==================== TEACHER ASSIGNMENT ====================

    @Transactional
    @PostMapping("/assignments/init")
    public void initializeAssignments(@AuthenticationPrincipal UserPrincipal principal) {
        var admin = userLookup.requireById(principal.getId());
        if (admin.getSchool() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "School admin chưa được gán trường.");
        }
        teacherAssignmentService.initializeAssignments(admin.getSchool());
    }

    @GetMapping("/assignments")
    public List<TeacherAssignmentDto> listAssignments(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(value = "classId", required = false) UUID classId) {
        var admin = userLookup.requireById(principal.getId());
        if (admin.getSchool() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "School admin chưa được gán trường.");
        }
        return teacherAssignmentService.listAssignments(admin.getSchool(), classId);
    }

    @Transactional
    @PutMapping("/assignments/{id}/teacher")
    public TeacherAssignmentDto assignTeacher(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable("id") UUID assignmentId,
            @RequestBody AssignTeacherRequest req) {
        var admin = userLookup.requireById(principal.getId());
        if (admin.getSchool() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "School admin chưa được gán trường.");
        }
        return teacherAssignmentService.assignTeacher(admin.getSchool(), assignmentId, req.teacherId());
    }

    @Transactional
    @PutMapping("/assignments/bulk-teacher")
    public List<TeacherAssignmentDto> bulkAssignTeachers(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody List<TeacherAssignmentUpdate> req) {
        var admin = userLookup.requireById(principal.getId());
        if (admin.getSchool() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "School admin chưa được gán trường.");
        }
        return teacherAssignmentService.bulkAssignTeachers(admin.getSchool(), req);
    }
}
