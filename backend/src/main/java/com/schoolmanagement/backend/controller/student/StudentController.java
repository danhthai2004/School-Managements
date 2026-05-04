package com.schoolmanagement.backend.controller.student;

import com.schoolmanagement.backend.dto.student.StudentProfileDto;
import com.schoolmanagement.backend.dto.student.StudentPageResponse;
import com.schoolmanagement.backend.dto.grade.ScoreDto;
import com.schoolmanagement.backend.dto.admin.BulkDeleteResponse;
import com.schoolmanagement.backend.dto.admin.BulkDeleteRequest;

import com.schoolmanagement.backend.dto.admin.BulkPromoteResponse;
import com.schoolmanagement.backend.dto.student.ImportStudentResult;
import com.schoolmanagement.backend.dto.student.BulkEnrollRequest;
import com.schoolmanagement.backend.dto.student.BulkEnrollResponse;
import com.schoolmanagement.backend.dto.student.StudentDto;
import com.schoolmanagement.backend.dto.admin.BulkPromoteRequest;
import com.schoolmanagement.backend.dto.student.CreateStudentRequest;
import com.schoolmanagement.backend.dto.student.UpdateStudentRequest;
import com.schoolmanagement.backend.domain.entity.admin.AcademicYear;
import com.schoolmanagement.backend.exception.ApiException;
import com.schoolmanagement.backend.repo.admin.AcademicYearRepository;
import com.schoolmanagement.backend.service.student.StudentPortalService;
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
import org.springframework.transaction.annotation.Propagation;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/school")
@Transactional(readOnly = true)
public class StudentController {

    private final StudentManagementService studentManagementService;
    private final StudentImportService studentImportService;
    private final StudentPortalService studentPortalService;
    private final UserLookupService userLookup;
    private final AcademicYearRepository academicYearRepository;

    public StudentController(StudentManagementService studentManagementService,
            StudentImportService studentImportService,
            StudentPortalService studentPortalService,
            UserLookupService userLookup,
            AcademicYearRepository academicYearRepository) {
        this.studentManagementService = studentManagementService;
        this.studentImportService = studentImportService;
        this.studentPortalService = studentPortalService;
        this.userLookup = userLookup;
        this.academicYearRepository = academicYearRepository;
    }

    @GetMapping("/students")
    @org.springframework.transaction.annotation.Transactional(readOnly = true)
    public StudentPageResponse listStudents(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(required = false) UUID classId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size,
            @RequestParam(required = false) String search,
            @RequestParam(required = false) Integer grade,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "fullName") String sortBy,
            @RequestParam(defaultValue = "asc") String sortDir,
            @RequestParam(required = false) Boolean unassigned) {
        var admin = userLookup.requireById(principal.getId());
        if (admin.getSchool() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "School admin chưa được gán trường.");
        }
        return studentManagementService.listStudents(
                admin.getSchool(), classId, page, size, search, grade, status, sortBy, sortDir, unassigned);
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

    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    @PostMapping("/students/bulk-delete") // Changed to POST for reliable body payload support
    public BulkDeleteResponse bulkDeleteStudents(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody BulkDeleteRequest request) {
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

    @Transactional
    @PostMapping("/students/bulk-enroll")
    public BulkEnrollResponse bulkEnrollStudents(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody BulkEnrollRequest request) {
        var admin = userLookup.requireById(principal.getId());
        if (admin.getSchool() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "School admin chưa được gán trường.");
        }
        return studentManagementService.bulkEnrollStudents(admin.getSchool(), request);
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
        AcademicYear ay = academicYearRepository
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

    @GetMapping("/students/{id}/scores")
    public List<ScoreDto> getStudentScores(
            @PathVariable("id") UUID studentId,
            @RequestParam(required = false) String semesterId) {
        return studentPortalService.getScores(studentId, semesterId);
    }
}
