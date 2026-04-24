package com.schoolmanagement.backend.service.report;

import com.schoolmanagement.backend.domain.entity.report.ActivityLog;
import com.schoolmanagement.backend.domain.entity.auth.User;
import com.schoolmanagement.backend.dto.report.ActivityLogDto;
import com.schoolmanagement.backend.repo.report.ActivityLogRepository;
import com.schoolmanagement.backend.repo.auth.UserRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@Transactional
public class ActivityLogService {

    private final ActivityLogRepository logs;
    private final UserRepository users;

    public ActivityLogService(ActivityLogRepository logs, UserRepository users) {
        this.logs = logs;
        this.users = users;
    }

    /**
     * Log an admin/system action.
     */
    public void log(String action, User performedBy, UUID targetUserId, String details) {
        // Re-fetch user to ensure it's managed in current persistence context
        User managedUser = null;
        if (performedBy != null && performedBy.getId() != null) {
            managedUser = users.getReferenceById(performedBy.getId());
        }

        ActivityLog entry = ActivityLog.builder()
                .action(action)
                .performedBy(managedUser)
                .targetUserId(targetUserId)
                .details(details)
                .build();
        logs.save(entry);
    }

    /**
     * Get paginated activity logs.
     */
    @Transactional(readOnly = true)
    public Page<ActivityLogDto> list(int page, int size) {
        return logs.findAllByOrderByCreatedAtDesc(PageRequest.of(page, size))
                .map(this::toDto);
    }

    private ActivityLogDto toDto(ActivityLog log) {
        return new ActivityLogDto(
                log.getId(),
                log.getAction(),
                log.getPerformedBy() != null ? log.getPerformedBy().getEmail() : null,
                log.getTargetUserId(),
                log.getDetails(),
                log.getCreatedAt());
    }
}
