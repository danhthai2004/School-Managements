package com.schoolmanagement.backend.controller.grade;

import com.schoolmanagement.backend.dto.grade.GradeBookDto;
import com.schoolmanagement.backend.service.grade.GradeService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;
import java.util.List;
import java.util.Map;

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

@PostMapping("/sub-columns")
        public ResponseEntity<Map<String, Object>> addSubGradeColumn(
                        Authentication authentication,
                        @RequestBody SubColumnRequest request) {
                Map<String, Object> result = gradeService.addSubGradeColumn(
                                authentication.getName(),
                                request.classId(),
                                request.subjectId(),
                                request.semester(),
                                request.category());
                return ResponseEntity.ok(result);
        }

        @DeleteMapping("/sub-columns")
        public ResponseEntity<Void> removeSubGradeColumn(
                        Authentication authentication,
                        @RequestParam UUID classId,
                        @RequestParam UUID subjectId,
                        @RequestParam(defaultValue = "1") Integer semester,
                        @RequestParam String category,
                        @RequestParam Integer subIndex) {
                gradeService.removeSubGradeColumn(
                                authentication.getName(), classId, subjectId, semester, category, subIndex);
                return ResponseEntity.ok().build();
        }

        @PostMapping("/resolve")
        public ResponseEntity<Void> resolveOverflow(
                        Authentication authentication,
                        @RequestBody ResolveRequest request) {
                gradeService.resolveOverflow(
                                authentication.getName(),
                                request.classId(),
                                request.subjectId(),
                                request.semester(),
                                request.strategy());
                return ResponseEntity.ok().build();
        }

        /**
         * Get homeroom grade summary (GVCN only).
         * Returns consolidated grades for all subjects Ã— all students in the homeroom
         * class.
         */
        @GetMapping("/homeroom-summary")
        public ResponseEntity<com.schoolmanagement.backend.dto.grade.HomeroomGradeSummaryDto> getHomeroomSummary(
                        Authentication authentication,
                        @RequestParam(defaultValue = "1") Integer semester) {
                return ResponseEntity.ok(gradeService.getHomeroomGradeSummary(
                                authentication.getName(), semester));
        }

        // ==================== REQUEST RECORDS ====================

        public record SaveGradeRequest(
                        UUID classId,
                        UUID subjectId,
                        String semesterId,
                        List<GradeBookDto.StudentGradeDto> students) {
        }

        public record SubColumnRequest(
                        UUID classId,
                        UUID subjectId,
                        Integer semester,
                        String category) {
        }

        public record ResolveRequest(
                        UUID classId,
                        UUID subjectId,
                        Integer semester,
                        String strategy) { // "AVERAGE" or "MAX"
        }
}

