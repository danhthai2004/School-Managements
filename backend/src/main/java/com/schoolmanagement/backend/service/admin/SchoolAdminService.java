package com.schoolmanagement.backend.service.admin;

import com.schoolmanagement.backend.service.notification.MailService;

import com.schoolmanagement.backend.domain.auth.Role;
import com.schoolmanagement.backend.domain.entity.admin.School;
import com.schoolmanagement.backend.domain.entity.auth.User;
import com.schoolmanagement.backend.dto.admin.BulkImportResponse;
import com.schoolmanagement.backend.dto.admin.SchoolStatsDto;
import com.schoolmanagement.backend.dto.auth.UserDto;
import com.schoolmanagement.backend.exception.ApiException;
import com.schoolmanagement.backend.repo.classes.ClassRoomRepository;
import com.schoolmanagement.backend.repo.student.StudentRepository;
import com.schoolmanagement.backend.repo.auth.UserRepository;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import com.schoolmanagement.backend.util.RandomUtil;

import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Locale;
import java.util.UUID;

@Service
public class SchoolAdminService {

    private final UserRepository users;
    private final ClassRoomRepository classRooms;
    private final StudentRepository students;
    private final PasswordEncoder passwordEncoder;
    private final MailService mailService;
    private final SemesterService semesterService;

    private final com.schoolmanagement.backend.repo.teacher.TeacherRepository teachers;
    private final com.schoolmanagement.backend.repo.student.GuardianRepository guardians;
    private final com.schoolmanagement.backend.repo.auth.AuthChallengeRepository authChallenges;

    public SchoolAdminService(UserRepository users, ClassRoomRepository classRooms,
            StudentRepository students,
            PasswordEncoder passwordEncoder, MailService mailService,
            SemesterService semesterService,
            com.schoolmanagement.backend.repo.teacher.TeacherRepository teachers,
            com.schoolmanagement.backend.repo.student.GuardianRepository guardians,
            com.schoolmanagement.backend.repo.auth.AuthChallengeRepository authChallenges) {
        this.users = users;
        this.classRooms = classRooms;
        this.students = students;
        this.passwordEncoder = passwordEncoder;
        this.mailService = mailService;
        this.semesterService = semesterService;
        this.teachers = teachers;
        this.guardians = guardians;
        this.authChallenges = authChallenges;
    }

    // ==================== SCHOOL STATS ====================

    public SchoolStatsDto getSchoolStats(School school) {
        long totalClasses = classRooms.countBySchool(school);
        long totalTeachers = teachers.countBySchool(school);
        long totalStudents = students.countBySchool(school);

        // Lấy năm học đang ACTIVE từ DB, fallback tính theo ngày hiện tại
        String currentAcademicYear = semesterService.getActiveAcademicYearName(school);
        if (currentAcademicYear == null || currentAcademicYear.isBlank()) {
            int year = java.time.LocalDate.now().getYear();
            int month = java.time.LocalDate.now().getMonthValue();
            if (month >= 9) {
                currentAcademicYear = year + "-" + (year + 1);
            } else {
                currentAcademicYear = (year - 1) + "-" + year;
            }
        }

        return new SchoolStatsDto(totalClasses, totalTeachers, totalStudents, currentAcademicYear);
    }

    // ==================== USER MANAGEMENT ====================

    @Transactional
    public UserDto createUserForSchool(School school, String rawEmail, String fullName, Role role) {
        String email = rawEmail != null ? rawEmail.trim().toLowerCase() : null;
        if (email == null || email.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Email không được để trống.");
        }
        if (role == Role.SYSTEM_ADMIN || role == Role.SCHOOL_ADMIN) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Role không hợp lệ cho trường.");
        }
        if (users.existsByEmailIgnoreCase(email)) {
            throw new ApiException(HttpStatus.CONFLICT, "Email đã tồn tại.");
        }
        // Check collision with Entities
        if (students.existsByEmail(email)) {
            throw new ApiException(HttpStatus.CONFLICT, "Email này đang thuộc về một Học sinh.");
        }
        if (teachers.existsByEmailIgnoreCase(email)) {
            throw new ApiException(HttpStatus.CONFLICT, "Email này đang thuộc về một Giáo viên.");
        }
        if (!guardians.findByEmailIgnoreCase(email).isEmpty()) {
            throw new ApiException(HttpStatus.CONFLICT, "Email này đang thuộc về một Phụ huynh.");
        }

        String tempPassword = RandomUtil.generateTempPassword(12);

        User user = User.builder()
                .email(email)
                .fullName(fullName)
                .role(role)
                .school(school)
                .passwordHash(passwordEncoder.encode(tempPassword))
                .firstLogin(true)
                .enabled(true)
                .build();

        user = users.save(user);
        mailService.sendTempPasswordEmail(user.getEmail(), user.getFullName(), tempPassword);

        return new UserDto(user.getId(), user.getEmail(), user.getFullName(), user.getRole(), school.getId(),
                school.getCode(), user.isEnabled());
    }

    @Transactional(readOnly = true)
    public List<UserDto> listUsersInSchool(School school) {
        return users.findBySchoolId(school.getId()).stream()
                .filter(u -> u.getRole() != Role.SYSTEM_ADMIN)
                .map(u -> new UserDto(u.getId(), u.getEmail(), u.getFullName(), u.getRole(), school.getId(),
                        school.getCode(), u.isEnabled()))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<UserDto> listTeachersInSchool(School school) {
        return users.findAll().stream()
                .filter(u -> u.getSchool() != null && u.getSchool().getId().equals(school.getId())
                        && u.getRole() == Role.TEACHER)
                .map(u -> new UserDto(u.getId(), u.getEmail(), u.getFullName(), u.getRole(), school.getId(),
                        school.getCode(), u.isEnabled()))
                .toList();
    }

    public BulkImportResponse importCsv(School school, MultipartFile file, Role defaultRole) {
        if (file == null || file.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "File CSV rỗng.");
        }

        int created = 0;
        int skipped = 0;
        int emailed = 0;

        try (var reader = new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8);
                CSVParser parser = CSVFormat.DEFAULT
                        .builder()
                        .setHeader()
                        .setSkipHeaderRecord(true)
                        .setIgnoreEmptyLines(true)
                        .setTrim(true)
                        .build()
                        .parse(reader)) {

            for (CSVRecord record : parser) {
                String email = record.get("email");
                String fullName = record.isMapped("fullName") ? record.get("fullName") : "";
                String roleRaw = record.isMapped("role") ? record.get("role") : "";

                if (email == null || email.isBlank()) {
                    skipped++;
                    continue;
                }
                if (fullName == null || fullName.isBlank()) {
                    fullName = email;
                }

                if (users.existsByEmailIgnoreCase(email)) {
                    skipped++;
                    continue;
                }
                // Check collision with Entities
                if (students.existsByEmail(email) || teachers.existsByEmailIgnoreCase(email)
                        || !guardians.findByEmailIgnoreCase(email).isEmpty()) {
                    skipped++;
                    continue;
                }

                Role role = defaultRole;
                if (roleRaw != null && !roleRaw.isBlank()) {
                    try {
                        role = Role.valueOf(roleRaw.trim().toUpperCase(Locale.ROOT));
                    } catch (IllegalArgumentException ignored) {
                        // keep defaultRole
                    }
                }

                if (role == Role.SYSTEM_ADMIN || role == Role.SCHOOL_ADMIN) {
                    skipped++;
                    continue;
                }

                String tempPassword = RandomUtil.generateTempPassword(12);
                User user = User.builder()
                        .email(email)
                        .fullName(fullName)
                        .role(role)
                        .school(school)
                        .passwordHash(passwordEncoder.encode(tempPassword))
                        .firstLogin(true)
                        .enabled(true)
                        .build();

                users.save(user);
                created++;
                mailService.sendTempPasswordEmail(email, fullName, tempPassword);
                emailed++;
            }
        } catch (ApiException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "Không đọc được file CSV. Hãy kiểm tra header (email, fullName, role).");
        }

        return new BulkImportResponse(created, skipped, emailed);
    }

    // ==================== ACCOUNT MANAGEMENT ====================

    @Transactional
    public void resetPassword(School school, UUID userId) {
        User user = users.findById(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy người dùng."));

        if (!user.getSchool().getId().equals(school.getId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Người dùng không thuộc trường này.");
        }

        if (user.getRole() == Role.SYSTEM_ADMIN) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Không thể reset mật khẩu của System Admin.");
        }

        String tempPassword = RandomUtil.generateTempPassword(12);
        user.setPasswordHash(passwordEncoder.encode(tempPassword));
        user.setFirstLogin(true); // Force change password on next login
        users.save(user);

        mailService.sendTempPasswordEmail(user.getEmail(), user.getFullName(), tempPassword);
    }

    @Transactional
    public void toggleUserStatus(School school, UUID userId, boolean enabled) {
        User user = users.findById(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy người dùng."));

        if (!user.getSchool().getId().equals(school.getId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Người dùng không thuộc trường này.");
        }

        if (user.getRole() == Role.SYSTEM_ADMIN || user.getRole() == Role.SCHOOL_ADMIN) {
            // Self-lock check should be in controller or allowed?
            //
            // Prevent locking school admin via this generic endpoint for safety, unless
            // it's another admin?
            // For now, let's allow locking other admins but maybe block self-locking in UI
        }

        user.setEnabled(enabled);
        users.save(user);
    }

    @Transactional
    public void deleteUser(School school, UUID userId) {
        User user = users.findById(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy người dùng."));

        if (user.getSchool() != null && !user.getSchool().getId().equals(school.getId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Người dùng không thuộc trường này.");
        }

        if (user.getRole() == Role.SYSTEM_ADMIN || user.getRole() == Role.SCHOOL_ADMIN) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Không thể xóa tài khoản quản trị viên.");
        }

        // Unlink associated entity (Check ALL roles to handle dirty/shared data)
        students.findByUser(user).ifPresent(s -> {
            s.setUser(null);
            students.save(s);
        });

        teachers.findByUser(user).ifPresent(t -> {
            t.setUser(null);
            teachers.save(t);
        });

        guardians.findByUser(user).ifPresent(g -> {
            g.setUser(null);
            guardians.save(g);
        });

        authChallenges.deleteByUser(user);
        users.delete(user);
    }

    // ==================== NEW/PENDING FEATURES ====================

    public List<com.schoolmanagement.backend.dto.auth.UserListDto> listUsersWithStatus(School school) {
        throw new org.springframework.web.server.ResponseStatusException(HttpStatus.NOT_IMPLEMENTED, "Not implemented yet");
    }

    public List<com.schoolmanagement.backend.dto.auth.UserListDto> listPendingDeleteUsersInSchool(School school) {
        throw new org.springframework.web.server.ResponseStatusException(HttpStatus.NOT_IMPLEMENTED, "Not implemented yet");
    }

    public void enableUser(School school, UUID userId, User admin) {
        throw new org.springframework.web.server.ResponseStatusException(HttpStatus.NOT_IMPLEMENTED, "Not implemented yet");
    }

    public void disableUser(School school, UUID userId, User admin) {
        throw new org.springframework.web.server.ResponseStatusException(HttpStatus.NOT_IMPLEMENTED, "Not implemented yet");
    }

    public void markPendingDelete(School school, UUID userId, User admin) {
        throw new org.springframework.web.server.ResponseStatusException(HttpStatus.NOT_IMPLEMENTED, "Not implemented yet");
    }

    public void restoreUser(School school, UUID userId, User admin) {
        throw new org.springframework.web.server.ResponseStatusException(HttpStatus.NOT_IMPLEMENTED, "Not implemented yet");
    }

    public void permanentDeleteUser(School school, UUID userId, User admin) {
        throw new org.springframework.web.server.ResponseStatusException(HttpStatus.NOT_IMPLEMENTED, "Not implemented yet");
    }

}
