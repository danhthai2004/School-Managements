package com.schoolmanagement.backend.service;

import com.schoolmanagement.backend.domain.Role;
import com.schoolmanagement.backend.domain.entity.School;
import com.schoolmanagement.backend.domain.entity.Teacher;
import com.schoolmanagement.backend.domain.entity.User;
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
import com.schoolmanagement.backend.util.RandomUtil;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import lombok.extern.slf4j.Slf4j;

@Service
@Slf4j
public class TeacherManagementService {

    private final TeacherRepository teachers;
    private final UserRepository users;
    private final ClassRoomRepository classRooms;
    private final PasswordEncoder passwordEncoder;
    private final MailService mailService;
    private final com.schoolmanagement.backend.repo.SubjectRepository subjects;
    private final com.schoolmanagement.backend.repo.StudentRepository students;
    private final com.schoolmanagement.backend.repo.GuardianRepository guardians;

    @org.springframework.beans.factory.annotation.Autowired
    @org.springframework.context.annotation.Lazy
    private TeacherManagementService self;

    @org.springframework.beans.factory.annotation.Autowired
    private BulkDeleteHelperService bulkDeleteHelper;

    public TeacherManagementService(TeacherRepository teachers, UserRepository users,
            ClassRoomRepository classRooms, PasswordEncoder passwordEncoder,
            MailService mailService, com.schoolmanagement.backend.repo.SubjectRepository subjects,
            com.schoolmanagement.backend.repo.StudentRepository students,
            com.schoolmanagement.backend.repo.GuardianRepository guardians) {
        this.teachers = teachers;
        this.users = users;
        this.classRooms = classRooms;
        this.passwordEncoder = passwordEncoder;
        this.mailService = mailService;
        this.subjects = subjects;
        this.students = students;
        this.guardians = guardians;
    }

    // ==================== TEACHER ACCOUNT MANAGEMENT ====================

    @Transactional(readOnly = true)
    public List<TeacherDto> getTeachersEligibleForAccount(School school) {
        return teachers.findAllBySchoolOrderByTeacherCodeAsc(school).stream()
                .filter(t -> "ACTIVE".equals(t.getStatus()) && t.getEmail() != null && !t.getEmail().isBlank()
                        && t.getUser() == null)
                .map(this::toTeacherDto)
                .toList();
    }

    @Transactional(propagation = org.springframework.transaction.annotation.Propagation.REQUIRES_NEW)
    public com.schoolmanagement.backend.dto.UserDto createAccountForTeacher(School school, UUID teacherId) {
        Teacher teacher = teachers.findById(teacherId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy giáo viên"));

        if (!teacher.getSchool().getId().equals(school.getId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Giáo viên không thuộc trường này");
        }

        if (!"ACTIVE".equals(teacher.getStatus())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Chỉ có thể tạo tài khoản cho giáo viên đang hoạt động");
        }

        if (teacher.getEmail() == null || teacher.getEmail().isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Giáo viên chưa có email");
        }

        if (teacher.getUser() != null) {
            throw new ApiException(HttpStatus.CONFLICT, "Giáo viên đã có tài khoản");
        }

        if (users.existsByEmailIgnoreCase(teacher.getEmail())) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "Email đã được sử dụng cho tài khoản khác: " + teacher.getEmail());
        }

        String tempPassword = RandomUtil.generateTempPassword(12);

        User user = User.builder()
                .email(teacher.getEmail().trim().toLowerCase())
                .fullName(teacher.getFullName())
                .role(Role.TEACHER)
                .school(school)
                .passwordHash(passwordEncoder.encode(tempPassword))
                .firstLogin(true)
                .enabled(true)
                .build();

        user = users.save(user); // Save first to get ID
        teacher.setUser(user);
        teachers.save(teacher);

        mailService.sendTempPasswordEmail(user.getEmail(), user.getFullName(), tempPassword);

        return new com.schoolmanagement.backend.dto.UserDto(user.getId(), user.getEmail(), user.getFullName(),
                user.getRole(), school.getId(),
                school.getCode(), user.isEnabled());
    }

    // @Transactional - Removed
    public com.schoolmanagement.backend.dto.BulkAccountCreationResponse createAccountsForTeachers(School school,
            List<UUID> teacherIds) {
        int created = 0;
        int skipped = 0;
        java.util.List<String> errors = new java.util.ArrayList<>();

        for (UUID teacherId : teacherIds) {
            try {
                self.createAccountForTeacher(school, teacherId);
                created++;
            } catch (ApiException e) {
                skipped++;
                errors.add(teacherId + ": " + e.getMessage());
            }
        }

        return new com.schoolmanagement.backend.dto.BulkAccountCreationResponse(created, skipped, errors);
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
            String email = req.email().trim().toLowerCase();
            if (teachers.existsByEmailIgnoreCase(email)) {
                throw new ApiException(HttpStatus.CONFLICT, "Email giáo viên đã tồn tại trong hệ thống");
            }
            if (students.existsByEmail(email)) {
                throw new ApiException(HttpStatus.CONFLICT, "Email giáo viên trùng với email của một Học sinh");
            }
            if (!guardians.findByEmailIgnoreCase(email).isEmpty()) {
                throw new ApiException(HttpStatus.CONFLICT, "Email giáo viên trùng với email của một Phụ huynh");
            }
            Optional<User> u = users.findByEmailIgnoreCase(email);
            if (u.isPresent() && u.get().getRole() != Role.TEACHER) {
                throw new ApiException(HttpStatus.CONFLICT, "Email đã được sử dụng bởi tài khoản " + u.get().getRole());
            }
        }

        // Find Subjects
        java.util.Set<com.schoolmanagement.backend.domain.entity.Subject> subjectEntities = new java.util.HashSet<>();
        if (req.subjectIds() != null && !req.subjectIds().isEmpty()) {
            List<com.schoolmanagement.backend.domain.entity.Subject> foundSubjects = subjects
                    .findAllById(req.subjectIds());
            if (foundSubjects.size() != req.subjectIds().size()) {
                // warning or error? Let's just use what we found or strict check.
                // Strict check is better.
                throw new ApiException(HttpStatus.NOT_FOUND, "Một số môn học không tìm thấy");
            }
            subjectEntities.addAll(foundSubjects);
        }

        // Create teacher
        Teacher teacher = Teacher.builder()
                .teacherCode(teacherCode)
                .fullName(req.fullName())
                .dateOfBirth(req.dateOfBirth())
                .gender(req.gender())
                .address(req.address())
                .email(req.email() != null ? req.email().trim().toLowerCase() : null)
                .phone(req.phone())
                .phone(req.phone())
                .degree(req.degree())
                .subjects(subjectEntities)
                .school(school)
                .status("ACTIVE")
                .build();

        teacher = teachers.save(teacher);

        // Create account if requested
        if (req.createAccount() && req.email() != null && !req.email().isBlank()) {
            // Check if email already used for an account
            if (users.existsByEmailIgnoreCase(req.email())) {
                throw new ApiException(HttpStatus.CONFLICT, "Email đã được sử dụng cho một tài khoản khác");
            }

            String tempPassword = RandomUtil.generateTempPassword(12);
            User user = User.builder()
                    .email(req.email().trim().toLowerCase())
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
        return teachers.findAllBySchoolOrderByTeacherCodeAsc(school).stream()
                .map(this::toTeacherDto)
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

        // Validate email uniqueness if changed
        if (req.email() != null && !req.email().isBlank()) {
            String email = req.email().trim().toLowerCase();
            if (!email.equalsIgnoreCase(teacher.getEmail())) {
                if (teachers.existsByEmailIgnoreCase(email)) {
                    throw new ApiException(HttpStatus.CONFLICT, "Email giáo viên đã tồn tại trong hệ thống");
                }
                if (students.existsByEmail(email)) {
                    throw new ApiException(HttpStatus.CONFLICT, "Email giáo viên trùng với email của một Học sinh");
                }
                if (!guardians.findByEmailIgnoreCase(email).isEmpty()) {
                    throw new ApiException(HttpStatus.CONFLICT, "Email giáo viên trùng với email của một Phụ huynh");
                }
                Optional<User> u = users.findByEmailIgnoreCase(email);
                if (u.isPresent() && u.get().getRole() != Role.TEACHER) {
                    throw new ApiException(HttpStatus.CONFLICT,
                            "Email đã được sử dụng bởi tài khoản " + u.get().getRole());
                }
            }
        }

        // Update fields
        teacher.setFullName(req.fullName());
        teacher.setDateOfBirth(req.dateOfBirth());
        teacher.setGender(req.gender());
        teacher.setAddress(req.address());
        teacher.setEmail(req.email() != null ? req.email().trim().toLowerCase() : null);
        teacher.setPhone(req.phone());
        teacher.setDegree(req.degree());

        if (req.subjectIds() != null) {
            List<com.schoolmanagement.backend.domain.entity.Subject> foundSubjects = subjects
                    .findAllById(req.subjectIds());
            teacher.setSubjects(new java.util.HashSet<>(foundSubjects));
        } else {
            teacher.getSubjects().clear();
        }

        teacher = teachers.save(teacher);
        return toTeacherDto(teacher);
    }

    // @Transactional - REMOVED to allow partial success
    public com.schoolmanagement.backend.dto.BulkDeleteResponse deleteTeachers(School school,
            com.schoolmanagement.backend.dto.request.BulkDeleteRequest request) {
        int deleted = 0;
        int failed = 0;
        List<String> errors = new java.util.ArrayList<>();

        for (UUID id : request.ids()) {
            Teacher teacher = null;
            try {
                // Ensure teacher belongs to school
                teacher = teachers.findById(id)
                        .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy giáo viên"));
                if (!teacher.getSchool().getId().equals(school.getId())) {
                    throw new ApiException(HttpStatus.FORBIDDEN, "Giáo viên không thuộc trường này");
                }

                // Call helper for isolated transaction
                bulkDeleteHelper.deleteSingleTeacher(id);
                deleted++;
            } catch (ApiException e) {
                failed++;
                errors.add(e.getMessage());
            } catch (org.springframework.dao.DataIntegrityViolationException e) {
                failed++;
                String teacherName = (teacher != null) ? teacher.getFullName() : "không xác định";
                errors.add("Không thể xóa giáo viên (" + teacherName + ") do dữ liệu liên quan.");
                log.error("Data integrity violation deleting teacher {}", id, e);
            } catch (Exception e) {
                failed++;
                errors.add("Lỗi hệ thống: " + e.getMessage());
                log.error("Error deleting teacher {}", id, e);
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

        // Map subjects
        List<com.schoolmanagement.backend.dto.SubjectDto> subjectDtos = teacher.getSubjects().stream()
                .map(s -> new com.schoolmanagement.backend.dto.SubjectDto(
                        s.getId(), s.getName(), s.getCode(),
                        s.getType(),
                        s.getStream(),
                        s.getTotalLessons(), s.isActive(), s.getDescription()))
                .collect(java.util.stream.Collectors.toList());

        String subjectNames = teacher.getSubjects().stream()
                .map(com.schoolmanagement.backend.domain.entity.Subject::getName)
                .collect(java.util.stream.Collectors.joining(", "));

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
                subjectDtos,
                subjectNames,
                teacher.getUser() != null,
                null);
    }

    @Transactional
    public void deleteTeacher(School school, UUID teacherId) {
        Teacher teacher = teachers.findById(teacherId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy giáo viên"));
        if (!teacher.getSchool().getId().equals(school.getId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Giáo viên không thuộc trường này");
        }
        try {
            bulkDeleteHelper.deleteSingleTeacher(teacherId);
        } catch (org.springframework.dao.DataIntegrityViolationException e) {
            throw new ApiException(HttpStatus.CONFLICT, "Không thể xóa giáo viên do dữ liệu liên quan.");
        }
    }
}
