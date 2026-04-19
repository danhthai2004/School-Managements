package com.schoolmanagement.backend.controller.grade;

import com.schoolmanagement.backend.dto.grade.GradeBookDto;
import com.schoolmanagement.backend.dto.grade.GradeImportResultDto;
import com.schoolmanagement.backend.service.grade.GradeExportService;
import com.schoolmanagement.backend.service.grade.GradeImportService;
import com.schoolmanagement.backend.service.grade.GradeService;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.Workbook;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.UUID;
import java.util.List;

@RestController
@RequestMapping("/api/teacher/grades")
@RequiredArgsConstructor
public class GradeController {

        private final GradeService gradeService;
        private final GradeImportService gradeImportService;
        private final GradeExportService gradeExportService;

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

        /**
         * Import grades from an uploaded Excel file
         */
        @PostMapping("/import-excel")
        public ResponseEntity<GradeImportResultDto> importGradesFromExcel(
                        Authentication authentication,
                        @RequestParam("file") MultipartFile file,
                        @RequestParam("classId") UUID classId,
                        @RequestParam("subjectId") UUID subjectId,
                        @RequestParam("semesterId") String semesterId) {
                GradeImportResultDto result = gradeImportService.importGradesFromExcel(
                                authentication.getName(), file, classId, subjectId, semesterId);
                return ResponseEntity.ok(result);
        }

        /**
         * Download an Excel template pre-filled with student list for a class-subject
         */
        @GetMapping("/template")
        public void downloadTemplate(
                        Authentication authentication,
                        @RequestParam UUID classId,
                        @RequestParam UUID subjectId,
                        @RequestParam(required = false) String semesterId,
                        HttpServletResponse response) throws IOException {
                Workbook workbook = gradeImportService.generateTemplate(
                                authentication.getName(), classId, subjectId, semesterId);

                response.setContentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
                response.setHeader("Content-Disposition", "attachment; filename=bang_diem_mau.xlsx");
                workbook.write(response.getOutputStream());
                workbook.close();
        }

        /**
         * Export a formatted grade report (bảng điểm chính thức)
         */
        @GetMapping("/export")
        public void exportGradeReport(
                        Authentication authentication,
                        @RequestParam UUID classId,
                        @RequestParam UUID subjectId,
                        @RequestParam(required = false) String semesterId,
                        HttpServletResponse response) throws IOException {
                Workbook workbook = gradeExportService.exportGradeReport(
                                authentication.getName(), classId, subjectId, semesterId);

                String filename = "bang_diem_" + classId + ".xlsx";
                response.setContentType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
                response.setHeader("Content-Disposition",
                                "attachment; filename=\"" + filename + "\"; filename*=UTF-8''" +
                                                java.net.URLEncoder
                                                                .encode(filename,
                                                                                java.nio.charset.StandardCharsets.UTF_8)
                                                                .replace("+", "%20"));
                workbook.write(response.getOutputStream());
                workbook.close();
        }

        public record SaveGradeRequest(
                        UUID classId,
                        UUID subjectId,
                        String semesterId,
                        List<GradeBookDto.StudentGradeDto> students) {
        }
}