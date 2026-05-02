package com.schoolmanagement.backend.controller.common;

import com.schoolmanagement.backend.service.admin.ImportTemplateService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.IOException;

@RestController
@RequestMapping("/api/templates")
@RequiredArgsConstructor
public class ImportTemplateController {

    private final ImportTemplateService templateService;

    @GetMapping("/students")
    public ResponseEntity<byte[]> downloadStudentTemplate() throws IOException {
        byte[] content = templateService.generateStudentTemplate();

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=Mau_Import_HocSinh.csv")
                .contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
                .body(content);
    }

    @GetMapping("/teachers")
    public ResponseEntity<byte[]> downloadTeacherTemplate() throws IOException {
        byte[] content = templateService.generateTeacherTemplate();

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=Mau_Import_GiaoVien.csv")
                .contentType(MediaType.parseMediaType("text/csv; charset=UTF-8"))
                .body(content);
    }
}
