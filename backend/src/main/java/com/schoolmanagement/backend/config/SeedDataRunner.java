package com.schoolmanagement.backend.config;

import com.schoolmanagement.backend.domain.Role;
import com.schoolmanagement.backend.domain.entity.User;
import com.schoolmanagement.backend.repo.UserRepository;
import com.schoolmanagement.backend.service.CurriculumSeederService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class SeedDataRunner implements CommandLineRunner {

    private final UserRepository users;
    private final PasswordEncoder passwordEncoder;
    private final CurriculumSeederService curriculumSeeder;

    @Value("${seed.system-admin.email:kazejustworking@gmail.com}")
    private String systemAdminEmail;

    @Value("${seed.system-admin.password:issSP26capstone!}")
    private String systemAdminPassword;

    public SeedDataRunner(UserRepository users, PasswordEncoder passwordEncoder,
            CurriculumSeederService curriculumSeeder) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
        this.curriculumSeeder = curriculumSeeder;
    }

    @Override
    public void run(String... args) {
        // Seed subjects first
        curriculumSeeder.seedSubjects();

        var email = systemAdminEmail == null ? "" : systemAdminEmail.trim();
        if (email.isBlank()) {
            log.warn("SYSTEM_ADMIN seed email is blank; skipping seed.");
            return;
        }

        if (users.existsByEmailIgnoreCase(email)) {
            log.info("SYSTEM_ADMIN already exists: {}", email);
            return;
        }

        String pass = systemAdminPassword;
        if (pass == null || pass.isBlank()) {
            pass = "issSP26capstone!";
        }

        User admin = User.builder()
                .email(email)
                .fullName("System Admin")
                .role(Role.SYSTEM_ADMIN)
                .passwordHash(passwordEncoder.encode(pass))
                .firstLogin(false)
                .enabled(true)
                .school(null)
                .build();

        users.save(admin);
        log.info("Seeded SYSTEM_ADMIN: {} (password from env seed.system-admin.password)", email);
    }
}
