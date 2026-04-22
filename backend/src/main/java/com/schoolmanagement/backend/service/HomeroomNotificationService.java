package com.schoolmanagement.backend.service;

import com.schoolmanagement.backend.domain.entity.classes.ClassRoom;
import com.schoolmanagement.backend.domain.entity.classes.ClassEnrollment;
import com.schoolmanagement.backend.domain.entity.student.Student;
import com.schoolmanagement.backend.domain.entity.student.Guardian;
import com.schoolmanagement.backend.domain.entity.notification.HomeroomNotification;
import com.schoolmanagement.backend.domain.entity.notification.HomeroomNotificationRecipient;
import com.schoolmanagement.backend.domain.entity.auth.User;
import com.schoolmanagement.backend.domain.notification.RecipientType;
import com.schoolmanagement.backend.dto.HomeroomNotificationDto;
import com.schoolmanagement.backend.dto.request.CreateHomeroomNotificationRequest;
import com.schoolmanagement.backend.repo.classes.ClassRoomRepository;
import com.schoolmanagement.backend.repo.classes.ClassEnrollmentRepository;
import com.schoolmanagement.backend.repo.student.GuardianRepository;
import com.schoolmanagement.backend.repo.notification.HomeroomNotificationRepository;
import com.schoolmanagement.backend.repo.notification.HomeroomNotificationRecipientRepository;
import com.schoolmanagement.backend.repo.auth.UserRepository;
import com.schoolmanagement.backend.service.admin.SemesterService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class HomeroomNotificationService {

    private final UserRepository userRepository;
    private final ClassRoomRepository classRoomRepository;
    private final SemesterService semesterService;
    private final ClassEnrollmentRepository classEnrollmentRepository;
    private final GuardianRepository guardianRepository;
    private final HomeroomNotificationRepository notificationRepository;
    private final HomeroomNotificationRecipientRepository recipientRepository;

    /**
     * Create a notification for the homeroom class.
     */
    @Transactional
    public HomeroomNotificationDto create(CreateHomeroomNotificationRequest req, String teacherEmail) {
        User teacher = findTeacherByEmail(teacherEmail);
        ClassRoom homeroom = getHomeroomClass(teacher);

        HomeroomNotification notification = HomeroomNotification.builder()
                .classRoom(homeroom)
                .createdBy(teacher)
                .notificationType(req.notificationType())
                .recipientType(req.recipientType())
                .title(req.title())
                .content(req.content())
                .scheduledDate(req.scheduledDate())
                .scheduledTime(req.scheduledTime())
                .build();

        notification = notificationRepository.save(notification);

        // Resolve and create recipient records
        List<HomeroomNotificationRecipient> recipients = resolveRecipients(
                notification, homeroom, req.recipientType(), req.specificRecipientIds());
        recipientRepository.saveAll(recipients);

        return toDto(notification, recipients);
    }

    /**
     * List all notifications created by this teacher.
     */
    @Transactional(readOnly = true)
    public List<HomeroomNotificationDto> listByTeacher(String teacherEmail) {
        User teacher = findTeacherByEmail(teacherEmail);
        List<HomeroomNotification> notifications = notificationRepository
                .findAllByCreatedByOrderByCreatedAtDesc(teacher);

        return notifications.stream()
                .map(n -> {
                    List<HomeroomNotificationRecipient> recipients = recipientRepository.findAllByNotification(n);
                    return toDto(n, recipients);
                })
                .toList();
    }

    /**
     * Delete a notification owned by this teacher.
     */
    @Transactional
    public void delete(UUID id, String teacherEmail) {
        User teacher = findTeacherByEmail(teacherEmail);
        HomeroomNotification notification = notificationRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Thông báo không tồn tại."));

        if (!notification.getCreatedBy().getId().equals(teacher.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Bạn không có quyền xóa thông báo này.");
        }

        recipientRepository.deleteAllByNotification(notification);
        notificationRepository.delete(notification);
    }

    // ========================= PRIVATE HELPERS =========================

    private List<HomeroomNotificationRecipient> resolveRecipients(
            HomeroomNotification notification,
            ClassRoom homeroom,
            RecipientType recipientType,
            List<UUID> specificStudentIds) {

        com.schoolmanagement.backend.domain.entity.admin.AcademicYear academicYear = homeroom.getAcademicYear();
        List<ClassEnrollment> enrollments = classEnrollmentRepository
                .findAllByClassRoomAndAcademicYear(homeroom, academicYear);

        List<HomeroomNotificationRecipient> recipients = new ArrayList<>();

        switch (recipientType) {
            case ALL -> {
                // Add all students who have user accounts
                addStudentRecipients(notification, enrollments, recipients);
                // Add all parents (guardians with user accounts)
                addParentRecipients(notification, enrollments, recipients);
            }
            case STUDENTS_ONLY -> {
                addStudentRecipients(notification, enrollments, recipients);
            }
            case PARENTS_ONLY -> {
                addParentRecipients(notification, enrollments, recipients);
            }
            case SPECIFIC -> {
                if (specificStudentIds != null && !specificStudentIds.isEmpty()) {
                    Set<UUID> selectedIds = new HashSet<>(specificStudentIds);
                    List<ClassEnrollment> filtered = enrollments.stream()
                            .filter(e -> selectedIds.contains(e.getStudent().getId()))
                            .toList();
                    addStudentRecipients(notification, filtered, recipients);
                    addParentRecipients(notification, filtered, recipients);
                }
            }
        }

        return recipients;
    }

    private void addStudentRecipients(HomeroomNotification notification,
            List<ClassEnrollment> enrollments,
            List<HomeroomNotificationRecipient> recipients) {
        for (ClassEnrollment enrollment : enrollments) {
            Student student = enrollment.getStudent();
            if (student.getUser() != null) {
                recipients.add(HomeroomNotificationRecipient.builder()
                        .notification(notification)
                        .user(student.getUser())
                        .recipientName(student.getFullName())
                        .recipientRole("STUDENT")
                        .build());
            }
        }
    }

    private void addParentRecipients(HomeroomNotification notification,
            List<ClassEnrollment> enrollments,
            List<HomeroomNotificationRecipient> recipients) {
        Set<UUID> addedUserIds = recipients.stream()
                .map(r -> r.getUser().getId())
                .collect(Collectors.toSet());

        for (ClassEnrollment enrollment : enrollments) {
            Student student = enrollment.getStudent();
            List<Guardian> guardians = guardianRepository.findAllByStudent(student);
            for (Guardian guardian : guardians) {
                if (guardian.getUser() != null && !addedUserIds.contains(guardian.getUser().getId())) {
                    recipients.add(HomeroomNotificationRecipient.builder()
                            .notification(notification)
                            .user(guardian.getUser())
                            .recipientName(guardian.getFullName())
                            .recipientRole("PARENT")
                            .build());
                    addedUserIds.add(guardian.getUser().getId());
                }
            }
        }
    }

    private HomeroomNotificationDto toDto(HomeroomNotification n,
            List<HomeroomNotificationRecipient> recipients) {
        int readCount = (int) recipients.stream().filter(HomeroomNotificationRecipient::isRead).count();
        List<HomeroomNotificationDto.RecipientInfo> recipientInfos = recipients.stream()
                .map(r -> new HomeroomNotificationDto.RecipientInfo(
                        r.getUser().getId(),
                        r.getRecipientName(),
                        r.getRecipientRole(),
                        r.isRead()))
                .toList();

        return new HomeroomNotificationDto(
                n.getId(),
                n.getClassRoom().getName(),
                n.getClassRoom().getId(),
                n.getNotificationType(),
                n.getRecipientType(),
                n.getTitle(),
                n.getContent(),
                n.getScheduledDate(),
                n.getScheduledTime(),
                n.getCreatedBy().getFullName(),
                n.getCreatedAt(),
                recipients.size(),
                readCount,
                recipientInfos);
    }

    private User findTeacherByEmail(String email) {
        return userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Teacher not found: " + email));
    }

    private ClassRoom getHomeroomClass(User teacher) {
        return findActiveHomeroom(teacher)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN,
                        "Chỉ giáo viên chủ nhiệm mới có thể gửi thông báo."));
    }

    private Optional<ClassRoom> findActiveHomeroom(User teacher) {
        if (teacher == null)
            return Optional.empty();

        if (teacher.getSchool() != null) {
            com.schoolmanagement.backend.domain.entity.admin.AcademicYear currentAcademicYear = semesterService
                    .getActiveAcademicYearSafe(teacher.getSchool());
            if (currentAcademicYear != null) {
                Optional<ClassRoom> found = classRoomRepository.findByHomeroomTeacher_IdAndAcademicYear(teacher.getId(),
                        currentAcademicYear);
                if (found.isPresent())
                    return found;
            }
        }
        return classRoomRepository.findTopByHomeroomTeacher_IdOrderByAcademicYear_StartDateDesc(teacher.getId());
    }

}
