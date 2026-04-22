package com.schoolmanagement.backend.service.notification;

import com.schoolmanagement.backend.domain.entity.classes.ClassRoom;
import com.schoolmanagement.backend.domain.entity.exam.ExamSchedule;
import com.schoolmanagement.backend.domain.entity.teacher.Teacher;
import com.schoolmanagement.backend.domain.entity.timetable.TimetableDetail;
import com.schoolmanagement.backend.domain.exam.ExamStatus;
import com.schoolmanagement.backend.repo.exam.ExamScheduleRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Component
public class NotificationCronJob {

    private final ExamScheduleRepository examScheduleRepository;
    private final NotificationService notificationService;

    public NotificationCronJob(ExamScheduleRepository examScheduleRepository,
            NotificationService notificationService) {
        this.examScheduleRepository = examScheduleRepository;
        this.notificationService = notificationService;
    }

    /**
     * Chạy lúc 08:00 sáng mỗi ngày: Nhắc lịch thi ngày mai.
     */
    @Transactional
    @Scheduled(cron = "0 00 18 * * ?", zone = "Asia/Ho_Chi_Minh")
    public void remindExamsForTomorrow() {
        LocalDate tomorrow = LocalDate.now().plusDays(1);
        log.info("Bắt đầu CronJob: Nhắc lịch thi cho ngày mai ({})", tomorrow);

        List<ExamSchedule> exams = examScheduleRepository.findByExamDateAndStatus(tomorrow, ExamStatus.UPCOMING);

        if (exams.isEmpty()) {
            log.info("Không có lịch thi nào vào ngày mai.");
            return;
        }

        for (ExamSchedule exam : exams) {
            try {
                notificationService.sendExamNotification(exam);
            } catch (Exception e) {
                log.error("Lỗi khi gửi thông báo lịch thi ID {}: {}", exam.getId(), e.getMessage());
            }
        }

        log.info("Hoàn thành CronJob nhắc lịch thi.");
    }

    /**
     * Chạy lúc 20:00 tối mỗi ngày: Nhắc thời khóa biểu ngày mai
     * cho học sinh, phụ huynh và giáo viên.
     */
    @Transactional
    @Scheduled(cron = "0 00 18 * * ?", zone = "Asia/Ho_Chi_Minh")
    public void remindScheduleForTomorrow() {
        LocalDate tomorrow = LocalDate.now().plusDays(1);
        log.info("Bắt đầu CronJob: Nhắc thời khóa biểu cho ngày mai ({}, {})",
                tomorrow, tomorrow.getDayOfWeek());

        List<TimetableDetail> allDetails = notificationService.getTomorrowDetails();

        if (allDetails.isEmpty()) {
            log.info("Không có tiết học nào vào ngày mai.");
            return;
        }

        log.info("Tìm thấy {} tiết học ngày mai.", allDetails.size());

        // --- Nhắc học sinh & phụ huynh theo từng lớp ---
        Map<ClassRoom, List<TimetableDetail>> byClass = allDetails.stream()
                .collect(Collectors.groupingBy(TimetableDetail::getClassRoom));

        for (Map.Entry<ClassRoom, List<TimetableDetail>> entry : byClass.entrySet()) {
            try {
                notificationService.sendScheduleNotificationForClass(entry.getKey(), entry.getValue());
            } catch (Exception e) {
                log.error("Lỗi khi gửi TKB cho lớp {}: {}", entry.getKey().getName(), e.getMessage());
            }
        }

        // --- Nhắc giáo viên về lịch dạy ---
        Map<Teacher, List<TimetableDetail>> byTeacher = allDetails.stream()
                .filter(d -> d.getTeacher() != null)
                .collect(Collectors.groupingBy(TimetableDetail::getTeacher));

        for (Map.Entry<Teacher, List<TimetableDetail>> entry : byTeacher.entrySet()) {
            try {
                notificationService.sendTeacherScheduleNotification(entry.getKey(), entry.getValue());
            } catch (Exception e) {
                log.error("Lỗi khi gửi lịch dạy cho GV {}: {}", entry.getKey().getFullName(), e.getMessage());
            }
        }

        log.info("Hoàn thành CronJob nhắc thời khóa biểu: {} lớp, {} giáo viên.",
                byClass.size(), byTeacher.size());
    }
}
