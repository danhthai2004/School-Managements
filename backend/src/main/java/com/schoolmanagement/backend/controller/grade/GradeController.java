package com.schoolmanagement.backend.controller.grade;

import com.schoolmanagement.backend.dto.grade.GradeBookDto;
import com.schoolmanagement.backend.service.grade.GradeService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;
import java.util.List;

@RestController
@RequestMapping("/api/teacher/grades")
@RequiredArgsConstructor
public class GradeController {

    private final GradeService gradeService;

    @GetMapping
    public ResponseEntity<GradeBookDto> getGradeBook(
            Authentication authentication,
            @RequestParam UUID classId,
            @RequestParam UUID subjectId,
            @RequestParam String semesterId) {
        return ResponseEntity.ok(gradeService.getGradeBook(
                authentication.getName(), classId, subjectId, semesterId));
    }

    @PostMapping
    public ResponseEntity<Void> saveGrades(
            Authentication authentication,
            @RequestBody SaveGradeRequest request) {
        gradeService.saveGrades(
                authentication.getName(),
                request.classId(),
                request.subjectId(),
                request.semesterId(),
                request.students());
        return ResponseEntity.ok().build();
    }

    public record SaveGradeRequest(
            UUID classId,
            UUID subjectId,
            String semesterId,
            List<GradeBookDto.StudentGradeDto> students) {
    }
}
