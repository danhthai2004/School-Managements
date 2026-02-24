package com.schoolmanagement.backend.service;

import com.schoolmanagement.backend.domain.Role;
import com.schoolmanagement.backend.domain.entity.School;
import com.schoolmanagement.backend.domain.entity.User;
import com.schoolmanagement.backend.dto.BulkImportResponse;
import com.schoolmanagement.backend.dto.SchoolStatsDto;
import com.schoolmanagement.backend.dto.UserDto;
import com.schoolmanagement.backend.exception.ApiException;
import com.schoolmanagement.backend.repo.ClassRoomRepository;
import com.schoolmanagement.backend.repo.StudentRepository;
import com.schoolmanagement.backend.repo.UserRepository;
import com.schoolmanagement.backend.util.TimeUtils;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Locale;

@Service
public class SchoolAdminService {

    private final UserRepository users;
    private final ClassRoomRepository classRooms;
    private final StudentRepository students;
    private final PasswordEncoder passwordEncoder;
    private final MailService mailService;

    private final com.schoolmanagement.backend.repo.TeacherRepository teachers;

    public SchoolAdminService(UserRepository users, ClassRoomRepository classRooms,
            StudentRepository students,
            PasswordEncoder passwordEncoder, MailService mailService,
            com.schoolmanagement.backend.repo.TeacherRepository teachers) {
        this.users = users;
        this.classRooms = classRooms;
        this.students = students;
        this.passwordEncoder = passwordEncoder;
        this.mailService = mailService;
        this.teachers = teachers;
    }

    // ==================== SCHOOL STATS ====================

    public SchoolStatsDto getSchoolStats(School school) {
        long totalClasses = classRooms.countBySchool(school);
        long totalTeachers = teachers.countBySchool(school);
        long totalStudents = students.countBySchool(school);

        String currentAcademicYear = TimeUtils.getCurrentAcademicYear();

        return new SchoolStatsDto(totalClasses, totalTeachers, totalStudents, currentAcademicYear);
    }

    // ==================== USER MANAGEMENT ====================

    @Transactional
    public UserDto createUserForSchool(School school, String email, String fullName, Role role) {
        if (role == Role.SYSTEM_ADMIN || role == Role.SCHOOL_ADMIN) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Role không hợp lệ cho trường.");
        }
        if (users.existsByEmailIgnoreCase(email)) {
            throw new ApiException(HttpStatus.CONFLICT, "Email đã tồn tại.");
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
                school.getCode());
    }

    public List<UserDto> listUsersInSchool(School school) {
        return users.findBySchoolId(school.getId()).stream()
                .filter(u -> u.getRole() != Role.SYSTEM_ADMIN)
                .map(u -> new UserDto(u.getId(), u.getEmail(), u.getFullName(), u.getRole(), school.getId(),
                        school.getCode()))
                .toList();
    }

    public List<UserDto> listTeachersInSchool(School school) {
        return users.findAll().stream()
                .filter(u -> u.getSchool() != null && u.getSchool().getId().equals(school.getId())
                        && u.getRole() == Role.TEACHER)
                .map(u -> new UserDto(u.getId(), u.getEmail(), u.getFullName(), u.getRole(), school.getId(),
                        school.getCode()))
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

}