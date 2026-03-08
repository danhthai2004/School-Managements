package com.schoolmanagement.backend.service;

import com.schoolmanagement.backend.domain.Role;
import com.schoolmanagement.backend.domain.entity.Student;
import com.schoolmanagement.backend.domain.entity.Teacher;
import com.schoolmanagement.backend.domain.entity.User;
import com.schoolmanagement.backend.repo.*;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

/**
 * Shared helper that cleans up all FK-dependent records before a User can be
 * deleted.
 * Used by both SchoolAdminService and SystemAdminService.
 */
@Component
public class UserDeletionHelper {
    /*
     * Temporarily commented out to fix compilation errors from fuuko branch merge
     */
}
