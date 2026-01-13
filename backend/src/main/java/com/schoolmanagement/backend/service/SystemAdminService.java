package com.schoolmanagement.backend.service;

import com.schoolmanagement.backend.domain.Role;
import com.schoolmanagement.backend.domain.entity.School;
import com.schoolmanagement.backend.domain.entity.User;
import com.schoolmanagement.backend.dto.SchoolDto;
import com.schoolmanagement.backend.dto.UserDto;
import com.schoolmanagement.backend.exception.ApiException;
import com.schoolmanagement.backend.repo.SchoolRepository;
import com.schoolmanagement.backend.repo.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;

@Service
public class SystemAdminService {

    private final SchoolRepository schools;
    private final UserRepository users;
    private final PasswordEncoder passwordEncoder;
    private final MailService mailService;

    public SystemAdminService(SchoolRepository schools, UserRepository users, PasswordEncoder passwordEncoder, MailService mailService) {
        this.schools = schools;
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.mailService = mailService;
    }

    public SchoolDto createSchool(String name, String code) {
        if (schools.existsByCodeIgnoreCase(code)) {
            throw new ApiException(HttpStatus.CONFLICT, "Mã trường đã tồn tại.");
        }
        School school = School.builder().name(name).code(code).build();
        school = schools.save(school);
        return new SchoolDto(school.getId(), school.getName(), school.getCode());
    }

    public List<SchoolDto> listSchools() {
        return schools.findAll().stream()
                .map(s -> new SchoolDto(s.getId(), s.getName(), s.getCode()))
                .toList();
    }

    public UserDto createSchoolAdmin(UUID schoolId, String email, String fullName) {
        School school = schools.findById(schoolId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Trường không tồn tại."));
        if (users.existsByEmailIgnoreCase(email)) {
            throw new ApiException(HttpStatus.CONFLICT, "Email đã tồn tại.");
        }

        String tempPassword = RandomUtil.generateTempPassword(12);

        User user = User.builder()
                .email(email)
                .fullName(fullName)
                .role(Role.SCHOOL_ADMIN)
                .school(school)
                .passwordHash(passwordEncoder.encode(tempPassword))
                .firstLogin(true)
                .enabled(true)
                .build();

        user = users.save(user);
        mailService.sendTempPasswordEmail(user.getEmail(), user.getFullName(), tempPassword);

        return new UserDto(user.getId(), user.getEmail(), user.getFullName(), user.getRole(), school.getId(), school.getCode());
    }
}
