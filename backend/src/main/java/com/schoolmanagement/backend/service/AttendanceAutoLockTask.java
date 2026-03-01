package com.schoolmanagement.backend.service;

import com.schoolmanagement.backend.domain.entity.ClassRoom;
import com.schoolmanagement.backend.domain.entity.DailyClassStatus;
import com.schoolmanagement.backend.repo.ClassRoomRepository;
import com.schoolmanagement.backend.repo.DailyClassStatusRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;

/**
 * Scheduled task to automatically lock attendance for past days.
 * Runs daily at 00:05 to create DailyClassStatus records for the previous day.
 * This is primarily for historical record-keeping; the main lock logic
 * is date-based comparison in AttendanceService.saveAttendance().
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AttendanceAutoLockTask {

    private static final ZoneId VIETNAM_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private final ClassRoomRepository classRoomRepository;
    private final DailyClassStatusRepository dailyClassStatusRepository;

    /**
     * Run every day at 00:05 (Vietnam time) to finalize yesterday's attendance for
     * all classes.
     */
    @Scheduled(cron = "0 5 0 * * *", zone = "Asia/Ho_Chi_Minh")
    @Transactional
    public void autoLockYesterdayAttendance() {
        LocalDate yesterday = LocalDate.now(VIETNAM_ZONE).minusDays(1);
        log.info("Auto-locking attendance for date: {}", yesterday);

        List<ClassRoom> allClasses = classRoomRepository.findAll();
        int lockedCount = 0;

        for (ClassRoom classRoom : allClasses) {
            // Only create if not already exists
            if (dailyClassStatusRepository.findByClassRoomAndDate(classRoom, yesterday).isEmpty()) {
                DailyClassStatus status = DailyClassStatus.builder()
                        .classRoom(classRoom)
                        .date(yesterday)
                        .isFinalized(true)
                        .finalizedBy(null) // System auto-lock
                        .finalizedAt(LocalDateTime.now(VIETNAM_ZONE))
                        .build();
                dailyClassStatusRepository.save(status);
                lockedCount++;
            }
        }

        if (lockedCount > 0) {
            log.info("Auto-locked attendance for {} classes on {}", lockedCount, yesterday);
        }
    }
}
