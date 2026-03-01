package com.schoolmanagement.backend.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

/**
 * One-time database migrations for schema changes that Hibernate
 * ddl-auto=update
 * cannot handle (e.g., dropping columns, changing NOT NULL constraints).
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
        dropClassroomIdFromTeacherAssignments();
    }

    /**
     * The teacher_assignments table was refactored from class-level to
     * school-level.
     * The old classroom_id column (NOT NULL) must be dropped since it's no longer
     * part of the TeacherAssignment entity.
     */
    private void dropClassroomIdFromTeacherAssignments() {
        try {
            // Check if the column exists before trying to drop it
            var columns = jdbc.queryForList(
                    "SELECT column_name FROM information_schema.columns " +
                            "WHERE table_name = 'teacher_assignments' AND column_name = 'classroom_id'");
            if (!columns.isEmpty()) {
                log.info("Dropping obsolete 'classroom_id' column from teacher_assignments table...");
                jdbc.execute("ALTER TABLE teacher_assignments DROP COLUMN classroom_id");
                log.info("Successfully dropped 'classroom_id' column from teacher_assignments.");
            } else {
                log.debug("Column 'classroom_id' already removed from teacher_assignments, skipping migration.");
            }
        } catch (Exception e) {
            log.warn("Migration: Could not drop classroom_id from teacher_assignments: {}", e.getMessage());
        }
    }
}
