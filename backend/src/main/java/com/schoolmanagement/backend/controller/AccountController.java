package com.schoolmanagement.backend.controller;

import com.schoolmanagement.backend.dto.BulkAccountCreationResponse;
import com.schoolmanagement.backend.dto.GuardianDto;
import com.schoolmanagement.backend.dto.StudentDto;
import com.schoolmanagement.backend.dto.TeacherDto;
import com.schoolmanagement.backend.exception.ApiException;
import com.schoolmanagement.backend.security.UserPrincipal;
import com.schoolmanagement.backend.service.StudentAccountService;
import com.schoolmanagement.backend.service.TeacherManagementService;
import com.schoolmanagement.backend.service.UserLookupService;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/school")
@Transactional(readOnly = true)
public class AccountController {

    private final StudentAccountService studentAccountService;
    private final TeacherManagementService teacherManagementService;
    private final UserLookupService userLookup;

    public AccountController(StudentAccountService studentAccountService,
            TeacherManagementService teacherManagementService,
            UserLookupService userLookup) {
        this.studentAccountService = studentAccountService;
        this.teacherManagementService = teacherManagementService;
        this.userLookup = userLookup;
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
        return studentAccountService.getStudentsEligibleForAccount(admin.getSchool());
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
        return studentAccountService.createAccountsForStudents(admin.getSchool(), studentIds);
    }

    // ==================== TEACHER ACCOUNT MANAGEMENT ====================

    /**
     * Get list of teachers eligible for account creation
     * (ACTIVE, has email, no user linked)
     */
    @GetMapping("/teachers/no-account")
    public List<TeacherDto> getTeachersEligibleForAccount(
            @AuthenticationPrincipal UserPrincipal principal) {
        var admin = userLookup.requireById(principal.getId());
        if (admin.getSchool() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "School admin chưa được gán trường.");
        }
        return teacherManagementService.getTeachersEligibleForAccount(admin.getSchool());
    }

    /**
     * Create accounts for multiple teachers (bulk)
     */
    @Transactional
    @PostMapping("/teachers/accounts")
    public BulkAccountCreationResponse createTeacherAccounts(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody List<UUID> teacherIds) {
        var admin = userLookup.requireById(principal.getId());
        if (admin.getSchool() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "School admin chưa được gán trường.");
        }
        return teacherManagementService.createAccountsForTeachers(admin.getSchool(), teacherIds);
    }

    // ==================== GUARDIAN ACCOUNT MANAGEMENT ====================

    @GetMapping("/guardians/eligible-for-account")
    public List<GuardianDto> getGuardiansEligibleForAccount(
            @AuthenticationPrincipal UserPrincipal principal) {
        var admin = userLookup.requireById(principal.getId());
        if (admin.getSchool() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "School admin chưa được gán trường.");
        }
        return studentAccountService.getGuardiansEligibleForAccount(admin.getSchool());
    }

    @PostMapping("/guardians/accounts")
    public BulkAccountCreationResponse createGuardianAccounts(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody List<UUID> guardianIds) {
        var admin = userLookup.requireById(principal.getId());
        if (admin.getSchool() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "School admin chưa được gán trường.");
        }
        return studentAccountService.createAccountsForGuardians(admin.getSchool(), guardianIds);
    }
}
