package com.schoolmanagement.backend.controller;

import com.schoolmanagement.backend.domain.Role;
import com.schoolmanagement.backend.dto.BulkImportResponse;
import com.schoolmanagement.backend.dto.ClassRoomDto;
import com.schoolmanagement.backend.dto.ImportStudentResult;
import com.schoolmanagement.backend.dto.SchoolStatsDto;
import com.schoolmanagement.backend.dto.StudentDto;
import com.schoolmanagement.backend.dto.UserDto;
import com.schoolmanagement.backend.dto.request.CreateClassRoomRequest;
import com.schoolmanagement.backend.dto.request.CreateStudentRequest;
import com.schoolmanagement.backend.dto.request.CreateUserRequest;
import com.schoolmanagement.backend.dto.request.UpdateStudentRequest;
import com.schoolmanagement.backend.exception.ApiException;
import com.schoolmanagement.backend.security.UserPrincipal;
import com.schoolmanagement.backend.service.ClassManagementService;
import com.schoolmanagement.backend.service.CurriculumService;
import com.schoolmanagement.backend.service.SchoolAdminService;
import com.schoolmanagement.backend.service.StudentImportService;
import com.schoolmanagement.backend.service.StudentManagementService;
import com.schoolmanagement.backend.service.TeacherManagementService;
import com.schoolmanagement.backend.service.UserLookupService;
import com.schoolmanagement.backend.dto.BulkAccountCreationResponse;
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
@lombok.extern.slf4j.Slf4j
public class SchoolAdminController {

    private final SchoolAdminService schoolAdminService;
    private final ClassManagementService classManagementService;
    private final StudentManagementService studentManagementService;
    private final TeacherManagementService teacherManagementService;
    private final StudentImportService studentImportService;
    private final UserLookupService userLookup;
    private final CurriculumService curriculumService;
    private final com.schoolmanagement.backend.service.TeacherAssignmentService teacherAssignmentService;

    public SchoolAdminController(SchoolAdminService schoolAdminService,
            ClassManagementService classManagementService,
            StudentManagementService studentManagementService,
            TeacherManagementService teacherManagementService,
            StudentImportService studentImportService,
            UserLookupService userLookup,
            CurriculumService curriculumService,
            com.schoolmanagement.backend.service.TeacherAssignmentService teacherAssignmentService) {
        this.schoolAdminService = schoolAdminService;
        this.classManagementService = classManagementService;
        this.studentManagementService = studentManagementService;
        this.teacherManagementService = teacherManagementService;
        this.studentImportService = studentImportService;
        this.userLookup = userLookup;
        this.curriculumService = curriculumService;
        this.teacherAssignmentService = teacherAssignmentService;
    }

    // ==================== STATISTICS ====================

    @GetMapping("/stats")
    public SchoolStatsDto getStats(@AuthenticationPrincipal UserPrincipal principal) {
        var admin = userLookup.requireById(principal.getId());
        if (admin.getSchool() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "School admin chưa được gán trường.");
        }
        return schoolAdminService.getSchoolStats(admin.getSchool());
    }

    // ==================== CLASS ROOM MANAGEMENT ====================

    @GetMapping("/classes")
    public List<ClassRoomDto> listClasses(@AuthenticationPrincipal UserPrincipal principal) {
        var admin = userLookup.requireById(principal.getId());
        if (admin.getSchool() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "School admin chưa được gán trường.");
        }
        return classManagementService.listClassRooms(admin.getSchool());
    }

    @GetMapping("/classes/{id}")
    public ClassRoomDto getClass(@AuthenticationPrincipal UserPrincipal principal,
            @PathVariable("id") UUID classId) {
        var admin = userLookup.requireById(principal.getId());
        if (admin.getSchool() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "School admin chưa được gán trường.");
        }
        return classManagementService.getClassRoom(admin.getSchool(), classId);
    }

    @Transactional
    @PostMapping("/classes")
    public ClassRoomDto createClass(@AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody CreateClassRoomRequest req) {
        var admin = userLookup.requireById(principal.getId());
        if (admin.getSchool() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "School admin chưa được gán trường.");
        }
        return classManagementService.createClassRoom(admin.getSchool(), req);
    }

    @Transactional
    @PutMapping("/classes/{id}")
    public ClassRoomDto updateClass(@AuthenticationPrincipal UserPrincipal principal,
            @PathVariable("id") UUID classId,
            @Valid @RequestBody CreateClassRoomRequest req) {
        var admin = userLookup.requireById(principal.getId());
        if (admin.getSchool() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "School admin chưa được gán trường.");
        }
        return classManagementService.updateClassRoom(admin.getSchool(), classId, req);
    }

    @Transactional
    @DeleteMapping("/classes/{id}")
    public void deleteClass(@AuthenticationPrincipal UserPrincipal principal,
            @PathVariable("id") UUID classId) {
        var admin = userLookup.requireById(principal.getId());
        if (admin.getSchool() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "School admin chưa được gán trường.");
        }
        classManagementService.deleteClassRoom(admin.getSchool(), classId);
    }

    // ==================== STUDENT MANAGEMENT ====================

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

    @Transactional
    @DeleteMapping("/students/{id}")
    public void deleteStudent(@AuthenticationPrincipal UserPrincipal principal,
            @PathVariable("id") UUID studentId) {
        var admin = userLookup.requireById(principal.getId());
        if (admin.getSchool() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "School admin chưa được gán trường.");
        }
        studentManagementService.deleteStudent(admin.getSchool(), studentId);
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
            @RequestParam("academicYear") String academicYear,
            @RequestParam("grade") int grade,
            @RequestParam(value = "autoAssign", defaultValue = "true") boolean autoAssign) {
        var admin = userLookup.requireById(principal.getId());
        if (admin.getSchool() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "School admin chưa được gán trường.");
        }
        return studentImportService.importStudentsFromExcel(admin.getSchool(), file, academicYear, grade, autoAssign);
    }

    // ==================== USER MANAGEMENT ====================

    @Transactional
    @PostMapping("/users")
    public UserDto createUser(@AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody CreateUserRequest req) {

        var admin = userLookup.requireById(principal.getId());
        if (admin.getSchool() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "School admin chưa được gán trường.");
        }

        Role role = req.role();
        if (role == null || role == Role.SCHOOL_ADMIN || role == Role.SYSTEM_ADMIN) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Role không hợp lệ.");
        }

        return schoolAdminService.createUserForSchool(admin.getSchool(), req.email(), req.fullName(), role);
    }

    @GetMapping("/users")
    public List<UserDto> listUsers(@AuthenticationPrincipal UserPrincipal principal) {
        var admin = userLookup.requireById(principal.getId());
        if (admin.getSchool() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "School admin chưa được gán trường.");
        }
        return schoolAdminService.listUsersInSchool(admin.getSchool());
    }

    @GetMapping("/teachers")
    public List<UserDto> listTeachers(@AuthenticationPrincipal UserPrincipal principal) {
        var admin = userLookup.requireById(principal.getId());
        if (admin.getSchool() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "School admin chưa được gán trường.");
        }
        return schoolAdminService.listTeachersInSchool(admin.getSchool());
    }

    /**
     * CSV header: email, fullName (optional), role (optional)
     */
    @Transactional
    @PostMapping("/users/import")
    public BulkImportResponse importUsers(@AuthenticationPrincipal UserPrincipal principal,
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "defaultRole", required = false, defaultValue = "STUDENT") String defaultRole) {
        var admin = userLookup.requireById(principal.getId());
        if (admin.getSchool() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "School admin chưa được gán trường.");
        }
        Role role;
        try {
            role = Role.valueOf(defaultRole.trim().toUpperCase());
        } catch (Exception e) {
            role = Role.STUDENT;
        }
        if (role == Role.SCHOOL_ADMIN || role == Role.SYSTEM_ADMIN) {
            role = Role.STUDENT;
        }
        return schoolAdminService.importCsv(admin.getSchool(), file, role);
    }

    // ==================== STUDENT ACCOUNT MANAGEMENT ====================

    /**
     * Get list of students eligible for account creation
     * (ACTIVE, has email, no user linked)
     */
    @GetMapping("/students/no-account")
    public List<StudentDto> getStudentsEligibleForAccount(@AuthenticationPrincipal UserPrincipal principal) {
        var admin = userLookup.requireById(principal.getId());
        if (admin.getSchool() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "School admin chưa được gán trường.");
        }
        return studentManagementService.getStudentsEligibleForAccount(admin.getSchool());
    }

    /**
     * Create accounts for multiple students (bulk)
     */
    @Transactional
    @PostMapping("/students/accounts")
    public BulkAccountCreationResponse createStudentAccounts(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody List<UUID> studentIds) {
        var admin = userLookup.requireById(principal.getId());
        if (admin.getSchool() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "School admin chưa được gán trường.");
        }
        return studentManagementService.createAccountsForStudents(admin.getSchool(), studentIds);
    }
    // ==================== TEACHER MANAGEMENT ====================

    @GetMapping("/teachers/profiles")
    public List<com.schoolmanagement.backend.dto.TeacherDto> listTeacherProfiles(
            @AuthenticationPrincipal UserPrincipal principal) {
        var admin = userLookup.requireById(principal.getId());
        if (admin.getSchool() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "School admin chưa được gán trường.");
        }
        return teacherManagementService.listTeachersProfile(admin.getSchool());
    }

    @Transactional
    @PostMapping("/teachers")
    public com.schoolmanagement.backend.dto.TeacherDto createTeacher(@AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody com.schoolmanagement.backend.dto.request.CreateTeacherRequest req) {
        var admin = userLookup.requireById(principal.getId());
        if (admin.getSchool() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "School admin chưa được gán trường.");
        }
        return teacherManagementService.createTeacher(admin.getSchool(), req);
    }

    @Transactional
    @PutMapping("/teachers/{teacherId}")
    public com.schoolmanagement.backend.dto.TeacherDto updateTeacher(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID teacherId,
            @Valid @RequestBody com.schoolmanagement.backend.dto.request.CreateTeacherRequest req) {
        var admin = userLookup.requireById(principal.getId());
        if (admin.getSchool() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "School admin chưa được gán trường.");
        }
        return teacherManagementService.updateTeacher(admin.getSchool(), teacherId, req);
    }

    @Transactional
    @DeleteMapping("/teachers/{teacherId}")
    public void deleteTeacher(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID teacherId) {
        var admin = userLookup.requireById(principal.getId());
        if (admin.getSchool() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "School admin chưa được gán trường.");
        }
        teacherManagementService.deleteTeacher(admin.getSchool(), teacherId);
    }

    // ==================== CURRICULUM MANAGEMENT ====================

    @GetMapping("/subjects")
    public List<com.schoolmanagement.backend.dto.SubjectDto> listSubjects(
            @AuthenticationPrincipal UserPrincipal principal) {
        // Subjects are system-wide, so school context might strictly not be needed, but
        // we check anyway

        // School check removed as Subjects are system-wide master data
        return curriculumService.listAllSubjects();
    }

    @GetMapping("/combinations")
    public List<com.schoolmanagement.backend.dto.CombinationDto> listCombinations(
            @AuthenticationPrincipal UserPrincipal principal) {
        var admin = userLookup.requireById(principal.getId());
        if (admin.getSchool() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "School admin chưa được gán trường.");
        }
        return curriculumService.listCombinations(admin.getSchool());
    }

    @Transactional
    @PostMapping("/combinations")
    public com.schoolmanagement.backend.dto.CombinationDto createCombination(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody com.schoolmanagement.backend.dto.request.CreateCombinationRequest req) {
        var admin = userLookup.requireById(principal.getId());
        if (admin.getSchool() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "School admin chưa được gán trường.");
        }
        return curriculumService.createCombination(admin.getSchool(), req);
    }

    @Transactional
    @PutMapping("/combinations/{id}")
    public com.schoolmanagement.backend.dto.CombinationDto updateCombination(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable("id") UUID id,
            @Valid @RequestBody com.schoolmanagement.backend.dto.request.CreateCombinationRequest req) {
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
    public List<com.schoolmanagement.backend.dto.TeacherAssignmentDto> listAssignments(
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
    public com.schoolmanagement.backend.dto.TeacherAssignmentDto assignTeacher(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable("id") UUID assignmentId,
            @RequestBody com.schoolmanagement.backend.dto.request.AssignTeacherRequest req) {
        var admin = userLookup.requireById(principal.getId());
        if (admin.getSchool() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "School admin chưa được gán trường.");
        }
        return teacherAssignmentService.assignTeacher(admin.getSchool(), assignmentId, req.teacherId());
    }
}
