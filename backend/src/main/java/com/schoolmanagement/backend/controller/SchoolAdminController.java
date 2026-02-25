package com.schoolmanagement.backend.controller;

import com.schoolmanagement.backend.domain.Role;
import com.schoolmanagement.backend.dto.BulkImportResponse;
import com.schoolmanagement.backend.dto.SchoolStatsDto;
import com.schoolmanagement.backend.dto.UserDto;
import com.schoolmanagement.backend.dto.request.CreateUserRequest;
import com.schoolmanagement.backend.exception.ApiException;
import com.schoolmanagement.backend.security.UserPrincipal;
import com.schoolmanagement.backend.service.SchoolAdminService;
import com.schoolmanagement.backend.service.UserLookupService;
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
    private final UserLookupService userLookup;
    private final com.schoolmanagement.backend.service.StudentAccountService studentAccountService;
    private final com.schoolmanagement.backend.service.NotificationService notificationService;
    private final com.schoolmanagement.backend.service.ExamScheduleService examScheduleService;

    public SchoolAdminController(SchoolAdminService schoolAdminService,
            UserLookupService userLookup,
            com.schoolmanagement.backend.service.StudentAccountService studentAccountService,
            com.schoolmanagement.backend.service.NotificationService notificationService,
            com.schoolmanagement.backend.service.ExamScheduleService examScheduleService) {
        this.schoolAdminService = schoolAdminService;
        this.userLookup = userLookup;
        this.studentAccountService = studentAccountService;
        this.notificationService = notificationService;
        this.examScheduleService = examScheduleService;
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

    @Transactional
    @PostMapping("/users/{id}/reset-password")
    public void resetPassword(@AuthenticationPrincipal UserPrincipal principal,
            @PathVariable("id") UUID userId) {
        if (principal.getId().equals(userId)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Không thể đặt lại mật khẩu cho chính mình.");
        }
        var admin = userLookup.requireById(principal.getId());
        if (admin.getSchool() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "School admin chưa được gán trường.");
        }
        schoolAdminService.resetPassword(admin.getSchool(), userId);
    }

    @Transactional
    @PutMapping("/users/{id}/status")
    public void updateUserStatus(@AuthenticationPrincipal UserPrincipal principal,
            @PathVariable("id") UUID userId,
            @RequestParam boolean enabled) {
        if (principal.getId().equals(userId)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Không thể thay đổi trạng thái tài khoản của chính mình.");
        }
        var admin = userLookup.requireById(principal.getId());
        if (admin.getSchool() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "School admin chưa được gán trường.");
        }
        schoolAdminService.toggleUserStatus(admin.getSchool(), userId, enabled);
    }

    @Transactional
    @DeleteMapping("/students/{id}/account")
    public void deleteStudentAccount(@AuthenticationPrincipal UserPrincipal principal,
            @PathVariable("id") UUID studentId) {
        var admin = userLookup.requireById(principal.getId());
        if (admin.getSchool() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "School admin chưa được gán trường.");
        }
        studentAccountService.deleteAccountForStudent(admin.getSchool(), studentId);
    }

    @Transactional
    @DeleteMapping("/users/{id}")
    public void deleteUser(@AuthenticationPrincipal UserPrincipal principal,
            @PathVariable("id") UUID userId) {
        if (principal.getId().equals(userId)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Không thể xóa tài khoản của chính mình.");
        }
        var admin = userLookup.requireById(principal.getId());
        if (admin.getSchool() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "School admin chưa được gán trường.");
        }
        schoolAdminService.deleteUser(admin.getSchool(), userId);
    }

    // ==================== NOTIFICATION MANAGEMENT ====================

    /**
     * Get all notifications created for this school.
     */
    @GetMapping("/notifications")
    public java.util.List<com.schoolmanagement.backend.dto.NotificationDto> getSchoolNotifications(
            @AuthenticationPrincipal UserPrincipal principal) {
        log.info("[Notification] GET /notifications - User: {}, Role: {}", principal.getEmail(), principal.getRole());
        var admin = userLookup.requireById(principal.getId());
        if (admin.getSchool() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "School admin chưa được gán trường.");
        }
        return notificationService.getForSchool(admin.getSchool());
    }

    /**
     * Get all visible notifications for the school admin (includes system-wide
     * notifications).
     */
    @GetMapping("/notifications/visible")
    public java.util.List<com.schoolmanagement.backend.dto.NotificationDto> getVisibleNotifications(
            @AuthenticationPrincipal UserPrincipal principal) {
        log.info("[Notification] GET /notifications/visible - User: {}", principal.getEmail());
        var admin = userLookup.requireById(principal.getId());
        if (admin.getSchool() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "School admin chưa được gán trường.");
        }
        return notificationService.getVisibleForUser(admin.getSchool().getId(), Role.SCHOOL_ADMIN);
    }

    /**
     * Get count of recent notifications (for badge on bell icon).
     */
    @GetMapping("/notifications/count")
    public NotificationCountResponse getNotificationCount(@AuthenticationPrincipal UserPrincipal principal) {
        log.info("[Notification] GET /notifications/count - User: {}", principal.getEmail());
        var admin = userLookup.requireById(principal.getId());
        if (admin.getSchool() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "School admin chưa được gán trường.");
        }
        long count = notificationService.countRecentForSchool(admin.getSchool().getId());
        return new NotificationCountResponse(count);
    }

    /**
     * Create a new notification for the school.
     */
    @Transactional
    @PostMapping("/notifications")
    public com.schoolmanagement.backend.dto.NotificationDto createNotification(
            @Valid @RequestBody CreateSchoolNotificationRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        log.info("[Notification] POST /notifications - User: {}, Title: {}", principal.getEmail(), request.title());
        var admin = userLookup.requireById(principal.getId());
        if (admin.getSchool() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "School admin chưa được gán trường.");
        }
        return notificationService.createForSchool(
                request.title(),
                request.message(),
                admin.getSchool(),
                admin);
    }

    /**
     * Delete a notification.
     */
    @Transactional
    @DeleteMapping("/notifications/{id}")
    public void deleteNotification(@PathVariable UUID id, @AuthenticationPrincipal UserPrincipal principal) {
        var admin = userLookup.requireById(principal.getId());
        notificationService.delete(id, admin);
    }

    public record CreateSchoolNotificationRequest(
            @jakarta.validation.constraints.NotBlank String title,
            @jakarta.validation.constraints.NotBlank String message) {
    }

    public record NotificationCountResponse(long count) {
    }

    // ==================== EXAM SCHEDULE ====================

    /**
     * Generate exam schedules for selected subjects and grades.
     */
    @PostMapping("/exam-schedules/generate")
    @Transactional
    public java.util.List<com.schoolmanagement.backend.dto.ExamScheduleViewDto> generateExamSchedule(
            @Valid @RequestBody com.schoolmanagement.backend.dto.ExamScheduleGenerateRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        log.info("[ExamSchedule] Generating exam schedule - User: {}, ExamType: {}",
                principal.getEmail(), request.examType());
        var admin = userLookup.requireById(principal.getId());
        return examScheduleService.generateExamSchedule(admin.getSchool(), request, admin);
    }

    /**
     * Get all exam schedules for the school.
     */
    @GetMapping("/exam-schedules")
    public java.util.List<com.schoolmanagement.backend.dto.ExamScheduleViewDto> getExamSchedules(
            @RequestParam String academicYear,
            @RequestParam Integer semester,
            @AuthenticationPrincipal UserPrincipal principal) {
        var admin = userLookup.requireById(principal.getId());
        return examScheduleService.getExamSchedules(admin.getSchool(), academicYear, semester);
    }

    /**
     * Delete exam schedules by type and period.
     */
    @DeleteMapping("/exam-schedules")
    @Transactional
    public void deleteExamSchedules(
            @RequestParam com.schoolmanagement.backend.domain.ExamType examType,
            @RequestParam String academicYear,
            @RequestParam Integer semester,
            @AuthenticationPrincipal UserPrincipal principal) {
        var admin = userLookup.requireById(principal.getId());
        examScheduleService.deleteExistingSchedules(admin.getSchool(), examType, academicYear, semester);
    }
}
