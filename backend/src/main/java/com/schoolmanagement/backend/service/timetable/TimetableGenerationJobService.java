package com.schoolmanagement.backend.service.timetable;

import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Wraps AutoScheduleService to run generation asynchronously.
 * Stores job status in memory (node-local, sufficient for single-node Render
 * deploy).
 */
@Service
@Slf4j
public class TimetableGenerationJobService {

    public enum JobStatus {
        RUNNING, DONE, ERROR
    }

    private record JobState(JobStatus status, String message, LocalDateTime createdAt) {
    }

    private final Map<String, JobState> jobs = new ConcurrentHashMap<>();
    private final AutoScheduleService autoScheduleService;

    public TimetableGenerationJobService(AutoScheduleService autoScheduleService) {
        this.autoScheduleService = autoScheduleService;
    }

    /** Start generation in background, returns a jobId immediately. */
    public String startGeneration(UUID timetableId) {
        String jobId = UUID.randomUUID().toString();
        jobs.put(jobId, new JobState(JobStatus.RUNNING, "Đang sinh TKB...", LocalDateTime.now()));
        runAsync(jobId, timetableId);
        return jobId;
    }

    /** Cleanup jobs older than 1 hour every hour */
    @Scheduled(fixedRate = 3600000)
    public void cleanupOldJobs() {
        log.info("Cleaning up old timetable generation jobs...");
        LocalDateTime limit = LocalDateTime.now().minusHours(1);
        jobs.entrySet().removeIf(entry -> entry.getValue().createdAt().isBefore(limit));
    }

    @Async
    protected void runAsync(String jobId, UUID timetableId) {
        try {
            log.info("Async generation started: jobId={} timetableId={}", jobId, timetableId);
            autoScheduleService.generateTimetable(timetableId);
            jobs.put(jobId, new JobState(JobStatus.DONE, "Sinh TKB thành công.", LocalDateTime.now()));
            log.info("Async generation DONE: jobId={}", jobId);
        } catch (Exception e) {
            log.error("Async generation ERROR: jobId={}", jobId, e);
            jobs.put(jobId, new JobState(JobStatus.ERROR, "Lỗi sinh TKB: " + e.getMessage(), LocalDateTime.now()));
        }
    }

    /** Poll the status of an existing job. */
    public JobState getStatus(String jobId) {
        return jobs.getOrDefault(jobId, new JobState(JobStatus.ERROR, "Không tìm thấy job.", LocalDateTime.now()));
    }

    /** Expose status values nicely as string. */
    public String getStatusString(String jobId) {
        var state = getStatus(jobId);
        return state.status().name();
    }

    public String getStatusMessage(String jobId) {
        return getStatus(jobId).message();
    }

    public boolean isDone(String jobId) {
        var s = jobs.get(jobId);
        return s != null && s.status() != JobStatus.RUNNING;
    }
}
