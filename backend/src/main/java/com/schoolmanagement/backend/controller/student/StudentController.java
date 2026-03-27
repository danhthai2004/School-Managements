package com.schoolmanagement.backend.controller.student;

import com.schoolmanagement.backend.dto.student.StudentProfileDto;

import com.schoolmanagement.backend.dto.admin.BulkPromoteResponse;
import com.schoolmanagement.backend.dto.student.ImportStudentResult;
import com.schoolmanagement.backend.dto.student.StudentDto;
import com.schoolmanagement.backend.dto.admin.BulkPromoteRequest;
import com.schoolmanagement.backend.dto.student.CreateStudentRequest;
import com.schoolmanagement.backend.dto.student.UpdateStudentRequest;
import com.schoolmanagement.backend.exception.ApiException;
import com.schoolmanagement.backend.security.UserPrincipal;
import com.schoolmanagement.backend.service.student.StudentImportService;
import com.schoolmanagement.backend.service.student.StudentManagementService;
import com.schoolmanagement.backend.service.auth.UserLookupService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/school")
@Transactional(readOnly = true)
public class StudentController {

    private final StudentManagementService studentManagementService;
    private final StudentImportService studentImportService;
    private final UserLookupService userLookup;
    private final com.schoolmanagement.backend.repo.admin.AcademicYearRepository academicYearRepository;

    public StudentController(StudentManagementService studentManagementService,
            StudentImportService studentImportService,
            UserLookupService userLookup,
            com.schoolmanagement.backend.repo.admin.AcademicYearRepository academicYearRepository) {
        this.studentManagementService = studentManagementService;
        this.studentImportService = studentImportService;
        this.userLookup = userLookup;
        this.academicYearRepository = academicYearRepository;
    }

    @GetMapping("/students")
    public List<StudentDto> listStudents(@AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(required = false) UUID classId) {
        var admin = userLookup.requireById(principal.getId());
        if (admin.getSchool() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "School admin chưa được gán trường.");
        }
        return studentManagementService.listStudents(admin.getSchool(), classId);
    }

    @GetMapping("/students/{id}")
    public StudentDto getStudent(@AuthenticationPrincipal UserPrincipal principal,
            @PathVariable("id") UUID studentId) {
        var admin = userLookup.requireById(principal.getId());
        if (admin.getSchool() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "School admin chưa được gán trường.");
        }
        return studentManagementService.getStudent(admin.getSchool(), studentId);
    }

    @Transactional
    @PostMapping("/students")
    public StudentDto createStudent(@AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody CreateStudentRequest req) {
        var admin = userLookup.requireById(principal.getId());
        if (admin.getSchool() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "School admin chưa được gán trường.");
        }
        return studentManagementService.createStudent(admin.getSchool(), req);
    }

    @org.springframework.transaction.annotation.Transactional(propagation = org.springframework.transaction.annotation.Propagation.NOT_SUPPORTED)
    @PostMapping("/students/bulk-delete") // Changed to POST for reliable body payload support
    public com.schoolmanagement.backend.dto.admin.BulkDeleteResponse bulkDeleteStudents(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody com.schoolmanagement.backend.dto.admin.BulkDeleteRequest request) {
        var admin = userLookup.requireById(principal.getId());
        if (admin.getSchool() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "School admin chưa được gán trường.");
        }
        return studentManagementService.deleteStudents(admin.getSchool(), request);
    }

    @Transactional
    @PutMapping("/students/{id}")
    public StudentDto updateStudent(@AuthenticationPrincipal UserPrincipal principal,
            @PathVariable("id") UUID studentId,
            @Valid @RequestBody UpdateStudentRequest req) {
        var admin = userLookup.requireById(principal.getId());
        if (admin.getSchool() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "School admin chưa được gán trường.");
        }
        return studentManagementService.updateStudent(admin.getSchool(), studentId, req);
    }

    @GetMapping("/students/{id}/profile")
    public StudentProfileDto getStudentProfile(@AuthenticationPrincipal UserPrincipal principal,
            @PathVariable("id") UUID studentId) {
        var admin = userLookup.requireById(principal.getId());
        if (admin.getSchool() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "School admin chưa được gán trường.");
        }
        return studentManagementService.getStudentProfile(admin.getSchool(), studentId);
    }

    @Transactional
    @PostMapping("/students/{id}/transfer")
    public StudentProfileDto transferStudent(@AuthenticationPrincipal UserPrincipal principal,
            @PathVariable("id") UUID studentId,
            @RequestParam("newClassId") UUID newClassId) {
        var admin = userLookup.requireById(principal.getId());
        if (admin.getSchool() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "School admin chưa được gán trường.");
        }
        return studentManagementService.transferStudent(admin.getSchool(), studentId, newClassId);
    }

    @PostMapping("/students/promote")
    public BulkPromoteResponse promoteStudents(@AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody BulkPromoteRequest request) {
        var admin = userLookup.requireById(principal.getId());
        if (admin.getSchool() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "School admin chưa được gán trường.");
        }
        return studentManagementService.promoteStudents(admin.getSchool(), request);
    }

    /**
     * Import students from Excel file with auto class assignment
     * Excel columns: fullName (required), dateOfBirth, gender, department,
     * birthPlace, address, email, phone, guardianName, guardianPhone,
     * guardianRelationship
     */
    @Transactional
    @PostMapping("/students/import-excel")
    public ImportStudentResult importStudentsFromExcel(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam("file") MultipartFile file,
            @RequestParam("academicYearId") UUID academicYearId,
            @RequestParam("grade") int grade,
            @RequestParam(value = "autoAssign", defaultValue = "true") boolean autoAssign) {
        var admin = userLookup.requireById(principal.getId());
        if (admin.getSchool() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "School admin chưa được gán trường.");
        }
        com.schoolmanagement.backend.domain.entity.admin.AcademicYear ay = academicYearRepository
                .findByIdAndSchool(academicYearId, admin.getSchool())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy năm học"));
        return studentImportService.importStudentsFromExcel(admin.getSchool(), file, ay, grade, autoAssign);
    }

    @Transactional
    @PostMapping("/students/{id}/avatar")
    public java.util.Map<String, String> uploadAvatar(@AuthenticationPrincipal UserPrincipal principal,
            @PathVariable("id") UUID studentId,
            @RequestParam("file") MultipartFile file) {
        var admin = userLookup.requireById(principal.getId());
        if (admin.getSchool() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "School admin chưa được gán trường.");
        }
        String url = studentManagementService.uploadAvatar(admin.getSchool(), studentId, file);
        return java.util.Map.of("url", url);
    }
}
