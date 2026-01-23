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

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class TeacherManagementService {

    private final TeacherRepository teachers;
    private final UserRepository users;
    private final ClassRoomRepository classRooms;
    private final PasswordEncoder passwordEncoder;
    private final MailService mailService;

    public TeacherManagementService(TeacherRepository teachers, UserRepository users,
            ClassRoomRepository classRooms, PasswordEncoder passwordEncoder,
            MailService mailService) {
        this.teachers = teachers;
        this.users = users;
        this.classRooms = classRooms;
        this.passwordEncoder = passwordEncoder;
        this.mailService = mailService;
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
                .school(school)
                .status("ACTIVE")
                .build();

        teacher = teachers.save(teacher);

        // Create account if requested
        if (req.createAccount() && req.email() != null && !req.email().isBlank()) {
            // Check if email already used for an account
            if (users.existsByEmailIgnoreCase(req.email())) {
                // If user exists, we might want to link it (if role is TEACHER), or error.
                // For simplicity, error if email conflict.
                throw new ApiException(HttpStatus.CONFLICT, "Email đã được sử dụng cho một tài khoản khác");
            }

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
            if (!req.email().equalsIgnoreCase(teacher.getEmail()) && teachers.existsByEmailIgnoreCase(req.email())) {
                throw new ApiException(HttpStatus.CONFLICT, "Email giáo viên đã tồn tại trong hệ thống");
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

        teacher = teachers.save(teacher);
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

        teachers.delete(teacher);
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
                null);
    }
}
