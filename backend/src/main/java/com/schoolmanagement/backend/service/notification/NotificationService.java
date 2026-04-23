package com.schoolmanagement.backend.service.notification;

import com.schoolmanagement.backend.domain.auth.Role;
import com.schoolmanagement.backend.domain.entity.auth.User;
import com.schoolmanagement.backend.domain.entity.classes.ClassEnrollment;
import com.schoolmanagement.backend.domain.entity.classes.ClassRoom;
import com.schoolmanagement.backend.domain.entity.exam.ExamSchedule;
import com.schoolmanagement.backend.domain.entity.notification.DeviceToken;
import com.schoolmanagement.backend.domain.entity.notification.Notification;
import com.schoolmanagement.backend.domain.entity.notification.NotificationRecipient;
import com.schoolmanagement.backend.domain.entity.teacher.Teacher;
import com.schoolmanagement.backend.domain.entity.timetable.Timetable;
import com.schoolmanagement.backend.domain.entity.timetable.TimetableDetail;
import com.schoolmanagement.backend.domain.timetable.TimetableStatus;
import com.schoolmanagement.backend.domain.entity.teacher.TeacherAssignment;
import com.schoolmanagement.backend.domain.notification.NotificationStatus;
import com.schoolmanagement.backend.domain.notification.NotificationType;
import com.schoolmanagement.backend.domain.notification.TargetGroup;
import com.schoolmanagement.backend.dto.notification.CreateNotificationRequest;
import com.schoolmanagement.backend.dto.notification.DeviceTokenRequest;
import com.schoolmanagement.backend.dto.notification.NotificationDto;
import com.schoolmanagement.backend.dto.notification.NotificationPageResponse;
import com.schoolmanagement.backend.exception.ApiException;
import com.schoolmanagement.backend.repo.auth.UserRepository;
import com.schoolmanagement.backend.repo.classes.ClassEnrollmentRepository;
import com.schoolmanagement.backend.repo.classes.ClassRoomRepository;
import com.schoolmanagement.backend.repo.notification.DeviceTokenRepository;
import com.schoolmanagement.backend.repo.notification.NotificationRecipientRepository;
import com.schoolmanagement.backend.repo.notification.NotificationRepository;
import com.schoolmanagement.backend.repo.teacher.TeacherAssignmentRepository;
import com.schoolmanagement.backend.repo.teacher.TeacherRepository;
import com.schoolmanagement.backend.repo.timetable.TimetableDetailRepository;
import com.schoolmanagement.backend.repo.timetable.TimetableRepository;
import com.schoolmanagement.backend.service.report.ActivityLogService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;
import java.util.UUID;

@Slf4j
@Service
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final NotificationRecipientRepository recipientRepository;
    private final DeviceTokenRepository deviceTokenRepository;
    private final UserRepository userRepository;
    private final ClassRoomRepository classRoomRepository;
    private final ClassEnrollmentRepository classEnrollmentRepository;
    private final TeacherRepository teacherRepository;
    private final TeacherAssignmentRepository teacherAssignmentRepository;
    private final TimetableRepository timetableRepository;
    private final TimetableDetailRepository timetableDetailRepository;
    private final ActivityLogService activityLog;
    private final FirebaseMessagingService firebaseMessagingService;

    public NotificationService(NotificationRepository notificationRepository,
            NotificationRecipientRepository recipientRepository,
            DeviceTokenRepository deviceTokenRepository,
            UserRepository userRepository,
            ClassRoomRepository classRoomRepository,
            ClassEnrollmentRepository classEnrollmentRepository,
            TeacherRepository teacherRepository,
            TeacherAssignmentRepository teacherAssignmentRepository,
            TimetableRepository timetableRepository,
            TimetableDetailRepository timetableDetailRepository,
            ActivityLogService activityLog,
            FirebaseMessagingService firebaseMessagingService) {
        this.notificationRepository = notificationRepository;
        this.recipientRepository = recipientRepository;
        this.deviceTokenRepository = deviceTokenRepository;
        this.userRepository = userRepository;
        this.classRoomRepository = classRoomRepository;
        this.classEnrollmentRepository = classEnrollmentRepository;
        this.teacherRepository = teacherRepository;
        this.teacherAssignmentRepository = teacherAssignmentRepository;
        this.timetableRepository = timetableRepository;
        this.timetableDetailRepository = timetableDetailRepository;
        this.activityLog = activityLog;
        this.firebaseMessagingService = firebaseMessagingService;
    }

    // ─────────────────────────────────────────────────────────
    // USER APIs
    // ─────────────────────────────────────────────────────────

    /**
     * Lấy danh sách thông báo của user (có phân trang) kèm unreadCount.
     */
    @Transactional(readOnly = true)
    public NotificationPageResponse getUserNotifications(UUID userId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<NotificationRecipient> recipientPage = recipientRepository.findByUserIdOrderByCreatedAtDesc(userId,
                pageable);
        long unreadCount = recipientRepository.countUnreadByUserId(userId);

        List<NotificationDto> dtos = recipientPage.getContent().stream()
                .map(nr -> toDto(nr.getNotification(), nr.isRead()))
                .toList();

        return new NotificationPageResponse(
                dtos,
                unreadCount,
                recipientPage.getTotalPages(),
                recipientPage.getTotalElements(),
                recipientPage.getNumber());
    }

    /**
     * Đánh dấu 1 thông báo đã đọc.
     */
    @Transactional
    public void markAsRead(UUID notificationId, UUID userId) {
        NotificationRecipient nr = recipientRepository.findByNotificationIdAndUserId(notificationId, userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Thông báo không tồn tại."));
        nr.setRead(true);
        recipientRepository.save(nr);
    }

    /**
     * Đánh dấu tất cả thông báo đã đọc cho user.
     */
    @Transactional
    public void markAllAsRead(UUID userId) {
        recipientRepository.markAllAsReadByUserId(userId);
    }

    /**
     * Lưu hoặc cập nhật FCM token.
     */
    @Transactional
    public void saveDeviceToken(UUID userId, DeviceTokenRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "User không tồn tại."));

        DeviceToken token = deviceTokenRepository.findById(request.fcmToken())
                .orElse(new DeviceToken());
        token.setFcmToken(request.fcmToken());
        token.setUser(user);
        token.setDeviceType(request.deviceType());
        deviceTokenRepository.save(token);
    }

    /**
     * Xóa FCM token khi user logout.
     */
    @Transactional
    public void removeDeviceToken(String fcmToken) {
        deviceTokenRepository.deleteById(fcmToken);
    }

    // ─────────────────────────────────────────────────────────
    // ADMIN APIs
    // ─────────────────────────────────────────────────────────

    /**
     * Tạo thông báo thủ công và phân phát tới nhóm đối tượng.
     */
    @Transactional
    public NotificationDto createNotification(CreateNotificationRequest request, User createdBy) {
        // Validate: CLASS/GRADE phải có referenceId
        if ((request.targetGroup() == TargetGroup.CLASS || request.targetGroup() == TargetGroup.GRADE)
                && (request.referenceId() == null || request.referenceId().isBlank())) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "Cần chỉ định lớp/khối (referenceId) khi gửi cho CLASS/GRADE.");
        }

        Notification notification = Notification.builder()
                .title(request.title())
                .content(request.content())
                .type(request.type())
                .targetGroup(request.targetGroup())
                .referenceId(request.referenceId())
                .actionUrl(request.actionUrl())
                .createdBy(createdBy)
                .build();

        // saveAndFlush ensures the notification row is in the DB before the native FK-referencing INSERT runs
        notification = notificationRepository.saveAndFlush(notification);

        // Phân phát thông báo tới các recipients
        List<User> targetUsers = resolveTargetUsers(request.targetGroup(), request.referenceId());
        batchCreateRecipients(notification, targetUsers);

        activityLog.log("NOTIFICATION_CREATED", createdBy, null,
                "Notification: " + notification.getTitle() + ", Target: " + request.targetGroup());

        return toDto(notification, false);
    }

    /**
     * Gửi thông báo cho lịch thi (hỗ trợ tự động phân giải lớp/khối/môn).
     */
    @Transactional
    public void sendExamNotification(ExamSchedule exam) {
        List<User> targetUsers = resolveExamTargetUsers(exam);
        if (targetUsers.isEmpty()) {
            log.info("🔔 Không tìm thấy học sinh liên quan cho lịch thi môn: {}", exam.getSubject().getName());
            return;
        }

        String title = "Nhắc nhở lịch thi ngày mai";
        String content = String.format("Môn **%s** sẽ thi vào lúc **%s**. Các em học sinh chuẩn bị tốt nhé!",
                exam.getSubject().getName(),
                exam.getStartTime().toString());

        // Thông báo tự động: createdBy = null → hiển thị "Hệ thống"
        Notification notification = Notification.builder()
                .title(title)
                .content(content)
                .type(NotificationType.EXAM)
                .targetGroup(exam.getClassRoom() != null ? TargetGroup.CLASS : TargetGroup.GRADE)
                .referenceId(exam.getClassRoom() != null ? exam.getClassRoom().getId().toString()
                        : String.valueOf(exam.getGrade()))
                .build();

        notification = notificationRepository.saveAndFlush(notification);
        batchCreateRecipients(notification, targetUsers);
        log.info("Đã gửi thông báo lịch thi tới {} tài khoản.", targetUsers.size());
    }

    /**
     * Gửi thông báo thời khóa biểu ngày mai cho học sinh & phụ huynh theo từng lớp.
     */
    @Transactional
    public void sendScheduleNotificationForClass(ClassRoom classRoom, List<TimetableDetail> details) {
        List<User> targetUsers = resolveClassUsers(classRoom.getId().toString());
        if (targetUsers.isEmpty())
            return;

        String subjectList = details.stream()
                .sorted(Comparator.comparing(TimetableDetail::getSlotIndex))
                .map(d -> "**Tiết " + d.getSlotIndex() + ":** " + d.getSubject().getName())
                .collect(Collectors.joining("\n"));

        String title = "Lịch học ngày mai - Lớp " + classRoom.getName();
        String content = String.format("Ngày mai lớp **%s** có **%d tiết**:\n%s\nCác em chuẩn bị bài nhé!",
                classRoom.getName(), details.size(), subjectList);

        Notification notification = Notification.builder()
                .title(title)
                .content(content)
                .type(NotificationType.SCHEDULE)
                .targetGroup(TargetGroup.CLASS)
                .referenceId(classRoom.getId().toString())
                .build();

        notification = notificationRepository.saveAndFlush(notification);
        batchCreateRecipients(notification, targetUsers);
        log.info("Đã gửi thông báo TKB lớp {} tới {} tài khoản.", classRoom.getName(), targetUsers.size());
    }

    /**
     * Gửi thông báo lịch dạy ngày mai cho giáo viên.
     */
    @Transactional
    public void sendTeacherScheduleNotification(Teacher teacher, List<TimetableDetail> details) {
        if (teacher.getUser() == null)
            return;

        List<User> targetUsers = List.of(teacher.getUser());

        String classesList = details.stream()
                .sorted(Comparator.comparing(TimetableDetail::getSlotIndex))
                .map(d -> "**Tiết " + d.getSlotIndex() + ":** Lớp " + d.getClassRoom().getName() + " ("
                        + d.getSubject().getName() + ")")
                .collect(Collectors.joining("\n"));

        String title = "Lịch dạy ngày mai";
        String content = String.format("Ngày mai thầy/cô có **%d tiết dạy**:\n%s",
                details.size(), classesList);

        Notification notification = Notification.builder()
                .title(title)
                .content(content)
                .type(NotificationType.SCHEDULE)
                .targetGroup(TargetGroup.TEACHER)
                .referenceId(teacher.getId().toString())
                .build();

        notification = notificationRepository.saveAndFlush(notification);
        batchCreateRecipients(notification, targetUsers);
        log.info("Đã gửi thông báo lịch dạy cho GV {}.", teacher.getFullName());
    }

    /**
     * Lấy danh sách TimetableDetail theo ngày mai từ TKB OFFICIAL.
     */
    public List<TimetableDetail> getTomorrowDetails() {
        DayOfWeek tomorrowDow = LocalDate.now().plusDays(1).getDayOfWeek();

        // Lấy tất cả TKB có status OFFICIAL
        List<Timetable> officialTimetables = timetableRepository.findAll().stream()
                .filter(t -> t.getStatus() == TimetableStatus.OFFICIAL)
                .toList();

        List<TimetableDetail> allDetails = new ArrayList<>();
        for (Timetable tt : officialTimetables) {
            allDetails.addAll(timetableDetailRepository.findAllByTimetableAndDayOfWeek(tt, tomorrowDow));
        }
        return allDetails;
    }

    /**
     * Xem lịch sử thông báo đã phát (Admin).
     */
    @Transactional(readOnly = true)
    public Page<NotificationDto> getAdminNotificationHistory(
            NotificationType type,
            TargetGroup targetGroup,
            NotificationStatus status,
            String search,
            int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        return notificationRepository.findAllWithFilters(type, targetGroup, status, search, pageable)
                .map(n -> toDto(n, false));
    }

    /**
     * Thu hồi thông báo (Soft delete -> RECALLED).
     */
    @Transactional
    public void recallNotification(UUID notificationId, User admin) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Thông báo không tồn tại."));

        if (notification.getStatus() == NotificationStatus.RECALLED) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Thông báo đã được thu hồi trước đó.");
        }

        notification.setStatus(NotificationStatus.RECALLED);
        notificationRepository.save(notification);

        activityLog.log("NOTIFICATION_RECALLED", admin, null,
                "Recalled notification: " + notification.getTitle());
    }

    // ─────────────────────────────────────────────────────────
    // TEACHER APIs
    // ─────────────────────────────────────────────────────────

    /**
     * Teacher gửi thông báo cho lớp dạy hoặc chủ nhiệm.
     * Validate: teacher phải có TeacherAssignment hoặc là homeroom teacher của lớp.
     */
    @Transactional
    public NotificationDto createTeacherNotification(CreateNotificationRequest request, User teacherUser) {
        if (request.referenceId() == null || request.referenceId().isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Cần chỉ định lớp (referenceId) để gửi thông báo.");
        }

        UUID classRoomId = UUID.fromString(request.referenceId());
        ClassRoom classRoom = classRoomRepository.findById(classRoomId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Lớp học không tồn tại."));

        // Validate teacher có quyền gửi cho lớp này
        validateTeacherClassAccess(teacherUser, classRoom);

        Notification notification = Notification.builder()
                .title(request.title())
                .content(request.content())
                .type(request.type() != null ? request.type() : NotificationType.OTHER)
                .targetGroup(TargetGroup.CLASS)
                .referenceId(request.referenceId())
                .actionUrl(request.actionUrl())
                .createdBy(teacherUser)
                .build();

        notification = notificationRepository.saveAndFlush(notification);

        List<User> targetUsers = resolveClassUsers(request.referenceId());
        batchCreateRecipients(notification, targetUsers);

        activityLog.log("NOTIFICATION_CREATED", teacherUser, null,
                "Teacher notification: " + notification.getTitle() + ", Class: " + classRoom.getName());

        return toDto(notification, false);
    }

    /**
     * Lấy lịch sử thông báo do teacher đã gửi.
     */
    @Transactional(readOnly = true)
    public Page<NotificationDto> getTeacherNotificationHistory(User teacher, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        return notificationRepository.findByCreatedByOrderByCreatedAtDesc(teacher, pageable)
                .map(n -> toDto(n, false));
    }

    /**
     * Validate teacher có dạy lớp này hoặc là giáo viên chủ nhiệm.
     */
    private void validateTeacherClassAccess(User teacherUser, ClassRoom classRoom) {
        // Check 1: Is homeroom teacher?
        if (classRoom.getHomeroomTeacher() != null
                && classRoom.getHomeroomTeacher().getId().equals(teacherUser.getId())) {
            return; // OK — homeroom teacher
        }

        // Check 2: Has teacher assignment for this class?
        Teacher teacher = teacherRepository.findByUser(teacherUser).orElse(null);
        if (teacher != null) {
            List<TeacherAssignment> assignments = teacherAssignmentRepository.findAllByTeacher(teacher);
            boolean hasAssignment = assignments.stream()
                    .anyMatch(a -> a.getClassRoom().getId().equals(classRoom.getId()));
            if (hasAssignment) {
                return; // OK — assigned teacher
            }
        }

        throw new ApiException(HttpStatus.FORBIDDEN, "Bạn không có quyền gửi thông báo cho lớp này.");
    }

    // ─────────────────────────────────────────────────────────
    // PRIVATE HELPERS
    // ─────────────────────────────────────────────────────────

    /**
     * Phân giải danh sách User theo nhóm đối tượng.
     */
    private List<User> resolveTargetUsers(TargetGroup targetGroup, String referenceId) {
        return switch (targetGroup) {
            case ALL -> userRepository.findAll();
            case TEACHER -> userRepository.findByRole(Role.TEACHER);
            case STUDENT -> userRepository.findByRole(Role.STUDENT);
            case GUARDIAN -> userRepository.findByRole(Role.GUARDIAN);
            case CLASS -> resolveClassUsers(referenceId);
            case GRADE -> resolveGradeUsers(referenceId);
        };
    }

    /**
     * Phân giải người nhận dựa trên thực thể ExamSchedule.
     * Tự động lọc theo Lớp hoặc (Khối + Môn học).
     */
    public List<User> resolveExamTargetUsers(ExamSchedule exam) {
        if (exam.getClassRoom() != null) {
            return resolveClassUsers(exam.getClassRoom().getId().toString());
        }

        if (exam.getGrade() != null) {
            return resolveGradeBySubjectUsers(exam.getGrade(), exam.getSubject().getId());
        }

        return new ArrayList<>();
    }

    /**
     * Lấy danh sách User thuộc một Khối cụ thể.
     */
    private List<User> resolveGradeUsers(String gradeStr) {
        int gradeNum = Integer.parseInt(gradeStr);
        List<ClassRoom> rooms = classRoomRepository.findAll().stream()
                .filter(r -> r.getGrade() == gradeNum)
                .toList();

        List<User> users = new ArrayList<>();
        for (ClassRoom r : rooms) {
            users.addAll(resolveClassUsers(r.getId().toString()));
        }
        return users;
    }

    /**
     * Lấy danh sách học sinh thuộc Khối G và có học môn S (thông qua Combination).
     */
    private List<User> resolveGradeBySubjectUsers(int grade, UUID subjectId) {
        List<ClassRoom> matchingRooms = classRoomRepository.findAll().stream()
                .filter(r -> r.getGrade() == grade)
                .filter(r -> r.getCombination() != null &&
                        r.getCombination().getSubjects().stream().anyMatch(s -> s.getId().equals(subjectId)))
                .toList();

        List<User> users = new ArrayList<>();
        for (ClassRoom r : matchingRooms) {
            log.debug("Found matching class for subject notification: {}", r.getName());
            users.addAll(resolveClassUsers(r.getId().toString()));
        }
        return users;
    }

    /**
     * Lấy danh sách User thuộc một ClassRoom cụ thể (Student + Guardian của
     * Student).
     */
    private List<User> resolveClassUsers(String classRoomIdStr) {
        UUID classRoomId = UUID.fromString(classRoomIdStr);
        // Validating class exists
        classRoomRepository.findById(classRoomId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Lớp học không tồn tại."));

        List<ClassEnrollment> enrollments = classEnrollmentRepository.findByClassRoomIdWithUsers(classRoomId);
        List<User> users = new ArrayList<>();

        for (ClassEnrollment enrollment : enrollments) {
            // Thêm tài khoản User của Student
            if (enrollment.getStudent().getUser() != null) {
                users.add(enrollment.getStudent().getUser());
            }
            // Thêm tài khoản User của Guardian (Phụ huynh)
            if (enrollment.getStudent().getGuardian() != null
                    && enrollment.getStudent().getGuardian().getUser() != null) {
                users.add(enrollment.getStudent().getGuardian().getUser());
            }
        }

        return users;
    }

    /**
     * Batch insert NotificationRecipient cho danh sách User và gửi FCM Push.
     */
    private void batchCreateRecipients(Notification notification, List<User> users) {
        if (users == null || users.isEmpty())
            return;

        List<UUID> userIds = users.stream()
                .filter(u -> u != null && u.getId() != null)
                .map(User::getId)
                .distinct()
                .toList();

        if (userIds.isEmpty()) return;

        // ON CONFLICT DO NOTHING handles any stale unique constraints in the DB
        recipientRepository.batchInsertByUserIds(notification.getId(), userIds);

        // Fetch FCM tokens and push
        List<String> fcmTokens = deviceTokenRepository.findFcmTokensByUsers(users);
        if (!fcmTokens.isEmpty()) {
            firebaseMessagingService.sendMulticast(
                    notification.getTitle(),
                    notification.getContent(),
                    notification.getActionUrl(),
                    fcmTokens);
        }
    }

    /**
     * Chuyển Entity → DTO.
     */
    private NotificationDto toDto(Notification n, boolean isRead) {
        String createdByName = "Hệ thống";
        if (n.getType() == NotificationType.OTHER && n.getCreatedBy() != null) {
            createdByName = n.getCreatedBy().getFullName();
        }

        return new NotificationDto(
                n.getId(),
                n.getTitle(),
                n.getContent(),
                n.getType(),
                n.getTargetGroup(),
                n.getReferenceId(),
                n.getActionUrl(),
                n.getStatus(),
                createdByName,
                n.getCreatedAt(),
                isRead);
    }
}
