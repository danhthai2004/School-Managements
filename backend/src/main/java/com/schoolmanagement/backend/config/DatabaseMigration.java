package com.schoolmanagement.backend.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * One-time database migrations for schema changes that Hibernate ddl-auto=update
 * cannot handle (e.g., adding columns back that were incorrectly dropped).
 */
@Slf4j
@Component
@Order(1)
public class DatabaseMigration implements CommandLineRunner {

    private final JdbcTemplate jdbc;

    public DatabaseMigration(JdbcTemplate jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public void run(String... args) {
        log.info("=== DatabaseMigration starting ===");
        restoreClassroomIdInTeacherAssignments();
        log.info("=== DatabaseMigration complete ===");
    }

    /**
     * The classroom_id column was incorrectly dropped from teacher_assignments.
     * TeacherAssignment still needs this column for class-level subject assignments.
     * This migration restores the column if it is missing.
     */
    private void restoreClassroomIdInTeacherAssignments() {
        try {
            log.info("Checking 'classroom_id' column in teacher_assignments...");
            var columns = jdbc.queryForList(
                    "SELECT column_name FROM information_schema.columns " +
                            "WHERE table_name = 'teacher_assignments' AND column_name = 'classroom_id'");
            log.info("Column check result: {} rows found", columns.size());
            if (columns.isEmpty()) {
                log.info("'classroom_id' is MISSING — restoring it now...");
                jdbc.execute("ALTER TABLE teacher_assignments ADD COLUMN classroom_id uuid REFERENCES classrooms(id)");
                log.info("SUCCESS: 'classroom_id' column restored in teacher_assignments.");
            } else {
                log.info("'classroom_id' already exists in teacher_assignments — no migration needed.");
            }
        } catch (Exception e) {
            log.error("FAILED to restore classroom_id in teacher_assignments: {}", e.getMessage(), e);
        }
    }
}
