package com.schoolmanagement.backend.service.admin;

import com.schoolmanagement.backend.service.report.ActivityLogService;

import com.schoolmanagement.backend.domain.entity.auth.User;
import com.schoolmanagement.backend.repo.auth.UserRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;

/**
 * Scheduled task to permanently delete users after 14 days of pending delete.
 */
@Slf4j
@Service
public class PendingDeleteCleanupTask {

    private final UserRepository users;
    private final ActivityLogService activityLog;

    public PendingDeleteCleanupTask(UserRepository users, ActivityLogService activityLog) {
        this.users = users;
        this.activityLog = activityLog;
    }

    /**
     * Run every hour to clean up expired pending delete users.
     */
    @Scheduled(fixedRate = 3600000) // 1 hour in milliseconds
    @Transactional
    public void cleanupExpiredPendingDelete() {
        Instant cutoff = Instant.now().minus(14, ChronoUnit.DAYS);
        List<User> expiredUsers = users.findByPendingDeleteAtBefore(cutoff);

        for (User user : expiredUsers) {
            log.info("Auto-deleting user after 14 days pending: id={} email={}", user.getId(), user.getEmail());
            activityLog.log("USER_AUTO_DELETED", null, user.getId(),
                    "User auto-deleted after 14 days pending: " + user.getEmail());
            users.delete(user);
        }

        if (!expiredUsers.isEmpty()) {
            log.info("Cleaned up {} expired pending delete users", expiredUsers.size());
        }
    }
}
