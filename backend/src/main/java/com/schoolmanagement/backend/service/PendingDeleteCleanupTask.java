package com.schoolmanagement.backend.service;

import com.schoolmanagement.backend.domain.entity.School;
import com.schoolmanagement.backend.domain.entity.User;
import com.schoolmanagement.backend.repo.SchoolRepository;
import com.schoolmanagement.backend.repo.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

/**
 * Scheduled task to permanently delete users and schools after 14 days of
 * pending delete.
 */
@Slf4j
@Service
public class PendingDeleteCleanupTask {

    private final UserRepository users;
    private final SchoolRepository schools;
    private final ActivityLogService activityLog;
    private final SystemAdminService systemAdminService;
    private final UserDeletionHelper userDeletionHelper;

    public PendingDeleteCleanupTask(UserRepository users, SchoolRepository schools,
            ActivityLogService activityLog, SystemAdminService systemAdminService,
            UserDeletionHelper userDeletionHelper) {
        this.users = users;
        this.schools = schools;
        this.activityLog = activityLog;
        this.systemAdminService = systemAdminService;
        this.userDeletionHelper = userDeletionHelper;
    }

    /**
     * Run every hour to clean up expired pending delete users and schools.
     */
    @Scheduled(fixedRate = 3600000) // 1 hour in milliseconds
    @Transactional
    public void cleanupExpiredPendingDelete() {
        Instant cutoff = Instant.now().minus(14, ChronoUnit.DAYS);

        // Cleanup expired users
        cleanupExpiredUsers(cutoff);

        // Cleanup expired schools
        cleanupExpiredSchools(cutoff);
    }

    private void cleanupExpiredUsers(Instant cutoff) {
        List<User> expiredUsers = users.findByPendingDeleteAtBefore(cutoff);

        for (User user : expiredUsers) {
            log.info("Auto-deleting user after 14 days pending: id={} email={}", user.getId(), user.getEmail());
            activityLog.log("USER_AUTO_DELETED", null, user.getId(),
                    "User auto-deleted after 14 days pending: " + user.getEmail());
            userDeletionHelper.cascadeDeleteUser(user);
        }

        if (!expiredUsers.isEmpty()) {
            log.info("Cleaned up {} expired pending delete users", expiredUsers.size());
        }
    }

    private void cleanupExpiredSchools(Instant cutoff) {
        List<School> expiredSchools = schools.findByPendingDeleteAtBefore(cutoff);

        for (School school : expiredSchools) {
            log.info("Auto-deleting school after 14 days pending: id={} name={}", school.getId(), school.getName());
            activityLog.log("SCHOOL_AUTO_DELETED", null, null,
                    "School auto-deleted after 14 days pending: " + school.getName() + " (" + school.getCode() + ")");
            // Use permanentDeleteSchool to properly cascade delete all related entities
            systemAdminService.permanentDeleteSchool(school.getId(), null);
        }

        if (!expiredSchools.isEmpty()) {
            log.info("Cleaned up {} expired pending delete schools", expiredSchools.size());
        }
    }
}
