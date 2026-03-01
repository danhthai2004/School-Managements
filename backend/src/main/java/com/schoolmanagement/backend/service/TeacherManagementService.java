package com.schoolmanagement.backend.service;

import com.schoolmanagement.backend.domain.Role;
import com.schoolmanagement.backend.domain.entity.ClassRoom;
import com.schoolmanagement.backend.domain.entity.School;
import com.schoolmanagement.backend.domain.entity.Teacher;
import com.schoolmanagement.backend.domain.entity.User;
import com.schoolmanagement.backend.dto.BulkAccountCreationResponse;
import com.schoolmanagement.backend.dto.TeacherDto;
import com.schoolmanagement.backend.dto.request.CreateTeacherRequest;
import com.schoolmanagement.backend.exception.ApiException;
import com.schoolmanagement.backend.repo.ClassRoomRepository;
import com.schoolmanagement.backend.repo.TeacherRepository;
import com.schoolmanagement.backend.repo.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
public class TeacherManagementService {

    private final TeacherRepository teachers;
    private final UserRepository users;
    private final ClassRoomRepository classRooms;
    private final PasswordEncoder passwordEncoder;
    private final MailService mailService;
    private final com.schoolmanagement.backend.repo.SubjectRepository subjects;
    private final com.schoolmanagement.backend.repo.AttendanceRepository attendances;
    private final com.schoolmanagement.backend.repo.TimetableDetailRepository timetableDetails;
    private final com.schoolmanagement.backend.repo.TeacherAssignmentRepository teacherAssignments;

    public TeacherManagementService(TeacherRepository teachers, UserRepository users,
            ClassRoomRepository classRooms, PasswordEncoder passwordEncoder,
            MailService mailService, com.schoolmanagement.backend.repo.SubjectRepository subjects,
            com.schoolmanagement.backend.repo.AttendanceRepository attendances,
            com.schoolmanagement.backend.repo.TimetableDetailRepository timetableDetails,
            com.schoolmanagement.backend.repo.TeacherAssignmentRepository teacherAssignments) {
        this.teachers = teachers;
        this.users = users;
        this.classRooms = classRooms;
        this.passwordEncoder = passwordEncoder;
        this.mailService = mailService;
        this.subjects = subjects;
        this.attendances = attendances;
        this.timetableDetails = timetableDetails;
        this.teacherAssignments = teacherAssignments;
    }

    // ==================== TEACHER MANAGEMENT ====================

    @Transactional
    public TeacherDto createTeacher(School school, CreateTeacherRequest req) {
        // Auto-generate teacher code if not provided
        String teacherCode = req.teacherCode();
        if (teacherCode == null || teacherCode.isBlank()) {
            teacherCode = generateNextTeacherCode(school);
        }

        // Check duplicate teacher code
        if (teachers.existsBySchoolAndTeacherCode(school, teacherCode)) {
            throw new ApiException(HttpStatus.CONFLICT, "Mã giáo viên đã tồn tại: " + teacherCode);
        }

        // Validate date of birth
        if (req.dateOfBirth() != null && !req.dateOfBirth().isBefore(java.time.LocalDate.now())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Ngày sinh phải nhỏ hơn ngày hiện tại");
        }

        // Validate email uniqueness if provided
        if (req.email() != null && !req.email().isBlank()) {
            if (teachers.existsByEmailIgnoreCase(req.email())) {
                throw new ApiException(HttpStatus.CONFLICT, "Email giáo viên đã tồn tại trong hệ thống");
            }
        }

        // Find Subject
        com.schoolmanagement.backend.domain.entity.Subject subject = null;
        if (req.subjectId() != null) {
            subject = subjects.findById(req.subjectId())
                    .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy môn học"));
        }

        // Create teacher
        Teacher teacher = Teacher.builder()
                .teacherCode(teacherCode)
                .fullName(req.fullName())
                .dateOfBirth(req.dateOfBirth())
                .gender(req.gender())
                .address(req.address())
                .email(req.email())
                .phone(req.phone())
                .specialization(req.specialization())
                .degree(req.degree())
                .primarySubject(subject)
                .school(school)
                .status("ACTIVE")
                .build();

        // Bug 3 fix: Check User email conflict BEFORE saving Teacher to prevent orphans
        if (req.createAccount() && req.email() != null && !req.email().isBlank()) {
            if (users.existsByEmailIgnoreCase(req.email())) {
                throw new ApiException(HttpStatus.CONFLICT, "Email đã được sử dụng cho một tài khoản khác");
            }
        }

        teacher = teachers.save(teacher);

        // Create account if requested
        if (req.createAccount() && req.email() != null && !req.email().isBlank()) {

            String tempPassword = RandomUtil.generateTempPassword(12);
            User user = User.builder()
                    .email(req.email())
                    .fullName(req.fullName())
                    .role(Role.TEACHER)
                    .school(school)
                    .passwordHash(passwordEncoder.encode(tempPassword))
                    .firstLogin(true)
                    .enabled(true)
                    .build();

            user = users.save(user);
            teacher.setUser(user);
            teachers.save(teacher);

            mailService.sendTempPasswordEmail(user.getEmail(), user.getFullName(), tempPassword);
        }

        return toTeacherDto(teacher);
    }

    @Transactional(readOnly = true)
    public List<TeacherDto> listTeachersProfile(School school) {
        List<Teacher> teacherList = teachers.findAllBySchoolOrderByTeacherCodeAsc(school);

        if (teacherList.isEmpty()) {
            return List.of();
        }

        // Batch load all homeroom classes (1 query instead of N)
        List<ClassRoom> homeroomClasses = classRooms.findAllBySchoolWithHomeroomTeacher(school);
        Map<UUID, ClassRoom> homeroomByUserId = homeroomClasses.stream()
                .filter(c -> c.getHomeroomTeacher() != null)
                .collect(Collectors.toMap(c -> c.getHomeroomTeacher().getId(), c -> c, (c1, c2) -> c1));

        // Convert to DTOs using pre-loaded data
        return teacherList.stream()
                .map(teacher -> toTeacherDtoOptimized(teacher,
                        teacher.getUser() != null ? homeroomByUserId.get(teacher.getUser().getId()) : null))
                .toList();
    }

    @Transactional
    public TeacherDto updateTeacher(School school, UUID teacherId, CreateTeacherRequest req) {
        Teacher teacher = teachers.findById(teacherId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy giáo viên"));

        if (!teacher.getSchool().getId().equals(school.getId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Giáo viên không thuộc trường này");
        }

        // Validate date of birth
        if (req.dateOfBirth() != null && !req.dateOfBirth().isBefore(java.time.LocalDate.now())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Ngày sinh phải nhỏ hơn ngày hiện tại");
        }

        // Validate email uniqueness on Teacher table if changed
        if (req.email() != null && !req.email().isBlank()) {
            if (!req.email().equalsIgnoreCase(teacher.getEmail()) && teachers.existsByEmailIgnoreCase(req.email())) {
                throw new ApiException(HttpStatus.CONFLICT, "Email giáo viên đã tồn tại trong hệ thống");
            }
        }

        // Bug 4 fix: Also validate email uniqueness on User table for linked accounts
        if (teacher.getUser() != null && req.email() != null && !req.email().isBlank()) {
            if (!req.email().equalsIgnoreCase(teacher.getUser().getEmail())
                    && users.existsByEmailIgnoreCase(req.email())) {
                throw new ApiException(HttpStatus.CONFLICT, "Email đã được sử dụng cho tài khoản khác");
            }
        }

        // Update fields
        teacher.setFullName(req.fullName());
        teacher.setDateOfBirth(req.dateOfBirth());
        teacher.setGender(req.gender());
        teacher.setAddress(req.address());
        teacher.setEmail(req.email());
        teacher.setPhone(req.phone());
        teacher.setSpecialization(req.specialization());
        teacher.setDegree(req.degree());

        if (req.subjectId() != null) {
            com.schoolmanagement.backend.domain.entity.Subject subject = subjects.findById(req.subjectId())
                    .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy môn học"));
            teacher.setPrimarySubject(subject);
        } else {
            teacher.setPrimarySubject(null);
        }

        teacher = teachers.save(teacher);

        // Bug 2 fix: Sync linked User account fullName and email
        if (teacher.getUser() != null) {
            User user = teacher.getUser();
            user.setFullName(req.fullName());
            if (req.email() != null && !req.email().isBlank()) {
                user.setEmail(req.email());
            }
            users.save(user);
        }

        return toTeacherDto(teacher);
    }

    @Transactional
    public void deleteTeacher(School school, UUID teacherId) {
        Teacher teacher = teachers.findById(teacherId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy giáo viên"));

        if (!teacher.getSchool().getId().equals(school.getId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Giáo viên không thuộc trường này");
        }

        // Check if teacher is homeroom teacher of any class
        if (teacher.getUser() != null) {
            var homeroomClass = classRooms.findByHomeroomTeacher(teacher.getUser());
            if (homeroomClass.isPresent()) {
                throw new ApiException(HttpStatus.CONFLICT,
                        "Không thể xóa giáo viên đang chủ nhiệm lớp " + homeroomClass.get().getName());
            }
        }

        // Bug 1 fix: Clean up FK references before deleting teacher
        // Nullify teacher in historical records (preserve attendance & timetable data)
        attendances.nullifyTeacherId(teacherId);
        timetableDetails.nullifyTeacherId(teacherId);
        // Delete teacher assignments (mapping data, not historical)
        teacherAssignments.deleteByTeacherId(teacherId);

        teachers.delete(teacher);
    }

    // ==================== TEACHER ACCOUNT MANAGEMENT ====================

    /**
     * Get list of teachers eligible for account creation (has email, no user linked)
     */
    @Transactional(readOnly = true)
    public List<TeacherDto> getTeachersEligibleForAccount(School school) {
        return teachers.findAllBySchoolOrderByFullNameAsc(school).stream()
                .filter(t -> t.getEmail() != null && !t.getEmail().isBlank())
                .filter(t -> t.getUser() == null)
                .filter(t -> "ACTIVE".equals(t.getStatus()))
                .map(this::toTeacherDto)
                .toList();
    }

    /**
     * Create accounts for multiple teachers (bulk)
     */
    @Transactional
    public BulkAccountCreationResponse createAccountsForTeachers(School school, List<UUID> teacherIds) {
        int created = 0;
        int skipped = 0;
        List<String> errors = new ArrayList<>();

        for (UUID teacherId : teacherIds) {
            try {
                Teacher teacher = teachers.findById(teacherId)
                        .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy giáo viên"));

                if (!teacher.getSchool().getId().equals(school.getId())) {
                    throw new ApiException(HttpStatus.FORBIDDEN, "Giáo viên không thuộc trường này");
                }
                if (teacher.getUser() != null) {
                    throw new ApiException(HttpStatus.CONFLICT, "Giáo viên đã có tài khoản");
                }
                if (teacher.getEmail() == null || teacher.getEmail().isBlank()) {
                    throw new ApiException(HttpStatus.BAD_REQUEST, "Giáo viên chưa có email");
                }
                if (users.existsByEmailIgnoreCase(teacher.getEmail())) {
                    throw new ApiException(HttpStatus.CONFLICT, "Email đã được sử dụng: " + teacher.getEmail());
                }

                String tempPassword = RandomUtil.generateTempPassword(12);
                User user = User.builder()
                        .email(teacher.getEmail())
                        .fullName(teacher.getFullName())
                        .role(Role.TEACHER)
                        .school(school)
                        .passwordHash(passwordEncoder.encode(tempPassword))
                        .firstLogin(true)
                        .enabled(true)
                        .build();

                user = users.save(user);
                teacher.setUser(user);
                teachers.save(teacher);

                mailService.sendTempPasswordEmail(user.getEmail(), user.getFullName(), tempPassword);
                created++;
            } catch (ApiException e) {
                skipped++;
                errors.add(teacherId + ": " + e.getMessage());
            }
        }

        return new BulkAccountCreationResponse(created, skipped, errors);
    }

    // ==================== BULK DELETE ====================

    @Transactional
    public com.schoolmanagement.backend.dto.BulkDeleteResponse deleteTeachers(
            School school, com.schoolmanagement.backend.dto.request.BulkDeleteRequest request) {
        int deleted = 0;
        int failed = 0;
        List<String> errors = new ArrayList<>();

        for (UUID teacherId : request.ids()) {
            try {
                deleteTeacher(school, teacherId);
                deleted++;
            } catch (ApiException e) {
                failed++;
                errors.add(teacherId + ": " + e.getMessage());
            }
        }

        return new com.schoolmanagement.backend.dto.BulkDeleteResponse(deleted, failed, errors);
    }

    public String generateNextTeacherCode(School school) {
        Optional<Teacher> latestTeacher = teachers.findTopBySchoolOrderByTeacherCodeDesc(school);
        if (latestTeacher.isEmpty()) {
            return "GV0001";
        }
        String lastCode = latestTeacher.get().getTeacherCode();
        try {
            if (lastCode.startsWith("GV")) {
                int lastNumber = Integer.parseInt(lastCode.substring(2));
                return String.format("GV%04d", lastNumber + 1);
            }
        } catch (NumberFormatException ignored) {
        }

        long count = teachers.count(); // fallback
        return String.format("GV%04d", count + 1);
    }

    private TeacherDto toTeacherDto(Teacher teacher) {
        // Find homeroom class for this teacher
        UUID homeroomClassId = null;
        String homeroomClassName = null;

        if (teacher.getUser() != null) {
            var homeroomClass = classRooms.findByHomeroomTeacher(teacher.getUser());
            if (homeroomClass.isPresent()) {
                homeroomClassId = homeroomClass.get().getId();
                homeroomClassName = homeroomClass.get().getName();
            }
        }

        return new TeacherDto(
                teacher.getId(),
                teacher.getTeacherCode(),
                teacher.getFullName(),
                teacher.getDateOfBirth(),
                teacher.getGender() != null ? teacher.getGender().name() : null,
                teacher.getAddress(),
                teacher.getEmail(),
                teacher.getPhone(),
                teacher.getSpecialization(),
                teacher.getDegree(),
                teacher.getStatus(),
                homeroomClassId,
                homeroomClassName,
                teacher.getPrimarySubject() != null ? teacher.getPrimarySubject().getId() : null,
                teacher.getPrimarySubject() != null ? teacher.getPrimarySubject().getName() : null,
                null,
                teacher.getMaxPeriodsPerWeek());
    }

    // Optimized version for batch operations - uses pre-loaded homeroom class
    private TeacherDto toTeacherDtoOptimized(Teacher teacher, ClassRoom homeroomClass) {
        UUID homeroomClassId = null;
        String homeroomClassName = null;

        if (homeroomClass != null) {
            homeroomClassId = homeroomClass.getId();
            homeroomClassName = homeroomClass.getName();
        }

        return new TeacherDto(
                teacher.getId(),
                teacher.getTeacherCode(),
                teacher.getFullName(),
                teacher.getDateOfBirth(),
                teacher.getGender() != null ? teacher.getGender().name() : null,
                teacher.getAddress(),
                teacher.getEmail(),
                teacher.getPhone(),
                teacher.getSpecialization(),
                teacher.getDegree(),
                teacher.getStatus(),
                homeroomClassId,
                homeroomClassName,
                teacher.getPrimarySubject() != null ? teacher.getPrimarySubject().getId() : null,
                teacher.getPrimarySubject() != null ? teacher.getPrimarySubject().getName() : null,
                null,
                teacher.getMaxPeriodsPerWeek());
    }
}
