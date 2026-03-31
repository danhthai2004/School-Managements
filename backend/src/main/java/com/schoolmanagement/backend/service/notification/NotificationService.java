package com.schoolmanagement.backend.service.notification;

import com.schoolmanagement.backend.domain.auth.Role;
import com.schoolmanagement.backend.domain.entity.auth.User;
import com.schoolmanagement.backend.domain.entity.classes.ClassEnrollment;
import com.schoolmanagement.backend.domain.entity.classes.ClassRoom;
import com.schoolmanagement.backend.domain.entity.notification.DeviceToken;
import com.schoolmanagement.backend.domain.entity.notification.Notification;
import com.schoolmanagement.backend.domain.entity.notification.NotificationRecipient;
import com.schoolmanagement.backend.domain.entity.teacher.Teacher;
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
import com.schoolmanagement.backend.service.report.ActivityLogService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

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
        this.activityLog = activityLog;
        this.firebaseMessagingService = firebaseMessagingService;
    }

    // ─────────────────────────────────────────────────────────
    //  USER APIs
    // ─────────────────────────────────────────────────────────

    /**
     * Lấy danh sách thông báo của user (có phân trang) kèm unreadCount.
     */
    public NotificationPageResponse getUserNotifications(UUID userId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        Page<NotificationRecipient> recipientPage = recipientRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable);
        long unreadCount = recipientRepository.countUnreadByUserId(userId);

        List<NotificationDto> dtos = recipientPage.getContent().stream()
                .map(nr -> toDto(nr.getNotification(), nr.isRead()))
                .toList();

        return new NotificationPageResponse(
                dtos,
                unreadCount,
                recipientPage.getTotalPages(),
                recipientPage.getTotalElements(),
                recipientPage.getNumber()
        );
    }

    /**
     * Đánh dấu 1 thông báo đã đọc.
     */
    @Transactional
    public void markAsRead(UUID recipientId, UUID userId) {
        NotificationRecipient nr = recipientRepository.findByIdAndUserId(recipientId, userId)
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
    //  ADMIN APIs
    // ─────────────────────────────────────────────────────────

    /**
     * Tạo thông báo thủ công và phân phát tới nhóm đối tượng.
     */
    @Transactional
    public NotificationDto createNotification(CreateNotificationRequest request, User createdBy) {
        // Validate: CLASS phải có referenceId
        if (request.targetGroup() == TargetGroup.CLASS && (request.referenceId() == null || request.referenceId().isBlank())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Cần chỉ định lớp (referenceId) khi gửi cho CLASS.");
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

        notification = notificationRepository.save(notification);

        // Phân phát thông báo tới các recipients
        List<User> targetUsers = resolveTargetUsers(request.targetGroup(), request.referenceId());
        batchCreateRecipients(notification, targetUsers);

        activityLog.log("NOTIFICATION_CREATED", createdBy, null,
                "Notification: " + notification.getTitle() + ", Target: " + request.targetGroup());

        return toDto(notification, false);
    }

    /**
     * Xem lịch sử thông báo đã phát (Admin).
     */
    public Page<NotificationDto> getAdminNotificationHistory(int page, int size) {
        Pageable pageable = PageRequest.of(page, size);
        return notificationRepository.findAllByOrderByCreatedAtDesc(pageable)
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
    //  TEACHER APIs
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
                .type(request.type() != null ? request.type() : NotificationType.MANUAL)
                .targetGroup(TargetGroup.CLASS)
                .referenceId(request.referenceId())
                .actionUrl(request.actionUrl())
                .createdBy(teacherUser)
                .build();

        notification = notificationRepository.save(notification);

        List<User> targetUsers = resolveClassUsers(request.referenceId());
        batchCreateRecipients(notification, targetUsers);

        activityLog.log("NOTIFICATION_CREATED", teacherUser, null,
                "Teacher notification: " + notification.getTitle() + ", Class: " + classRoom.getName());

        return toDto(notification, false);
    }

    /**
     * Lấy lịch sử thông báo do teacher đã gửi.
     */
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
    //  PRIVATE HELPERS
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
        };
    }

    /**
     * Lấy danh sách User thuộc một ClassRoom cụ thể (Student + Guardian của Student).
     */
    private List<User> resolveClassUsers(String classRoomIdStr) {
        UUID classRoomId = UUID.fromString(classRoomIdStr);
        ClassRoom classRoom = classRoomRepository.findById(classRoomId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Lớp học không tồn tại."));

        List<ClassEnrollment> enrollments = classEnrollmentRepository.findAllByClassRoom(classRoom);
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
        if (users == null || users.isEmpty()) return;

        java.util.Map<UUID, User> uniqueUsers = new java.util.HashMap<>();
        for (User u : users) {
            if (u != null && u.getId() != null) {
                uniqueUsers.putIfAbsent(u.getId(), u);
            }
        }

        List<NotificationRecipient> recipients = uniqueUsers.values().stream()
                .map(user -> NotificationRecipient.builder()
                        .notification(notification)
                        .user(user)
                        .build())
                .toList();

        recipientRepository.saveAll(recipients);

        // Fetch FCM tokens and push
        List<String> fcmTokens = deviceTokenRepository.findFcmTokensByUsers(users);
        if (!fcmTokens.isEmpty()) {
            firebaseMessagingService.sendMulticast(
                    notification.getTitle(),
                    notification.getContent(),
                    notification.getActionUrl(),
                    fcmTokens
            );
        }
    }

    /**
     * Chuyển Entity → DTO.
     */
    private NotificationDto toDto(Notification n, boolean isRead) {
        String createdByName = null;
        if (n.getCreatedBy() != null) {
            createdByName = n.getCreatedBy().getEmail();
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
                isRead
        );
    }
}
