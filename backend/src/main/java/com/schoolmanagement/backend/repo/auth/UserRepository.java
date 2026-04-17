package com.schoolmanagement.backend.repo.auth;

import com.schoolmanagement.backend.domain.auth.Role;
import com.schoolmanagement.backend.domain.entity.admin.School;
import com.schoolmanagement.backend.domain.entity.auth.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<User, UUID>, JpaSpecificationExecutor<User> {
    Optional<User> findByEmailIgnoreCase(String email);

    boolean existsByEmailIgnoreCase(String email);

    List<User> findBySchoolId(UUID schoolId);

    List<User> findByRole(Role role);

    List<User> findBySchoolIdAndRole(UUID schoolId, Role role);

    List<User> findByPendingDeleteAtIsNotNull();

    List<User> findByPendingDeleteAtBefore(Instant time);

    @Query("SELECT u FROM User u WHERE " +
            "(:role IS NULL OR u.role = :role) AND " +
            "(:schoolId IS NULL OR u.school.id = :schoolId) AND " +
            "(:enabled IS NULL OR u.enabled = :enabled) AND " +
            "(:pendingDelete = false OR u.pendingDeleteAt IS NOT NULL) AND " +
            "(:pendingDelete = true OR u.pendingDeleteAt IS NULL)")
    List<User> findWithFilters(
            @Param("role") Role role,
            @Param("schoolId") UUID schoolId,
            @Param("enabled") Boolean enabled,
            @Param("pendingDelete") boolean pendingDelete);
    List<User> findBySchoolIdAndPendingDeleteAtIsNotNull(UUID schoolId);

    List<User> findBySchoolIdAndPendingDeleteAtIsNull(UUID schoolId);

    long countBySchool(School school);

    long countBySchoolAndRole(School school, Role role);

    @org.springframework.data.jpa.repository.Query("SELECT u FROM User u LEFT JOIN FETCH u.school WHERE u.id = :id")
    Optional<User> findByIdWithSchool(UUID id);
}
