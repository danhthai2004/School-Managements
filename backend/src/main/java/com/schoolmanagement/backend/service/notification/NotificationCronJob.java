package com.schoolmanagement.backend.service.notification;

import com.schoolmanagement.backend.domain.entity.exam.ExamSchedule;
import com.schoolmanagement.backend.domain.exam.ExamStatus;
import com.schoolmanagement.backend.dto.notification.CreateNotificationRequest;
import com.schoolmanagement.backend.domain.notification.TargetGroup;
import com.schoolmanagement.backend.domain.notification.NotificationType;
import com.schoolmanagement.backend.repo.exam.ExamScheduleRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDate;
import java.util.List;

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
     * Chạy lúc 08:00 sáng mỗi ngày: Lấy danh sách lịch thi ngày mai và nhắc nhở.
     */
    @Scheduled(cron = "0 0 8 * * ?")
    public void remindExamsForTomorrow() {
        LocalDate tomorrow = LocalDate.now().plusDays(1);
        log.info("⏰ Bắt đầu CronJob: Nhắc lịch thi cho ngày mai ({})", tomorrow);

        List<ExamSchedule> exams = examScheduleRepository.findByExamDateAndStatus(tomorrow, ExamStatus.UPCOMING);
        
        if (exams.isEmpty()) {
            log.info("Không có lịch thi nào vào ngày mai.");
            return;
        }

        for (ExamSchedule exam : exams) {
            String title = "Nhắc nhở lịch thi ngày mai 📝";
            String content = String.format("Môn %s sẽ thi vào lúc %s. Các em học sinh chuẩn bị tốt nhé!", 
                                           exam.getSubject().getName(), 
                                           exam.getStartTime().toString());
            
            CreateNotificationRequest request = new CreateNotificationRequest(
                    title,
                    content,
                    NotificationType.EXAM,
                    TargetGroup.CLASS,
                    exam.getClassRoom().getId().toString(),
                    "/student/exams" // App Deep Link
            );

            // Using null for createdBy to represent SYSTEM notification
            try {
                notificationService.createNotification(request, null);
                log.info("Đã tạo thông báo nhắc lịch thi môn {} cho lớp {}", exam.getSubject().getName(), exam.getClassRoom().getName());
            } catch (Exception e) {
                log.error("Lỗi khi tạo thông báo cho lớp {}: {}", exam.getClassRoom().getName(), e.getMessage());
            }
        }

        log.info("✅ Hoàn thành CronJob nhắc lịch thi.");
    }

    /**
     * Chạy lúc 20:00 tối mỗi ngày: Nhắc thời khóa biểu ngày mai.
     * (Placeholder: Thiết kế sẽ được hoàn thiện khi map với logic DayOfWeek)
     */
    @Scheduled(cron = "0 0 20 * * ?")
    public void remindScheduleForTomorrow() {
        LocalDate tomorrow = LocalDate.now().plusDays(1);
        log.info("⏰ Bắt đầu CronJob: Nhắc thời khóa biểu cho ngày mai ({})", tomorrow);
        
        // TODO: Map logic DayOfWeek để lấy TimetableDetails và gửi nhắc nhở cho từng ClassRoom.
        // Tương tự với ExamSchedule, gom nhóm danh sách TimetableDetail theo ClassRoom và gọi notificationService.createNotification()
        
        log.info("✅ Hoàn thành CronJob nhắc thời khóa biểu.");
    }
}
