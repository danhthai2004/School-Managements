package com.schoolmanagement.backend.repo;

import com.schoolmanagement.backend.domain.entity.Notification;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.UUID;

public interface NotificationRepository extends JpaRepository<Notification, UUID> {
    List<Notification> findAllByOrderByCreatedAtDesc();
    
    // Find notifications for a specific school (scope = SCHOOL and targetSchool matches)
    List<Notification> findByTargetSchoolOrderByCreatedAtDesc(com.schoolmanagement.backend.domain.entity.School school);
    
    // Find all notifications that are visible to a school (ALL scope + SCHOOL scope for this school)
    @org.springframework.data.jpa.repository.Query("""
        SELECT n FROM Notification n 
        WHERE n.scope = 'ALL' 
           OR (n.scope = 'SCHOOL' AND n.targetSchool.id = :schoolId)
           OR (n.scope = 'ROLE' AND n.targetRole = :role)
        ORDER BY n.createdAt DESC
    """)
    List<Notification> findVisibleNotifications(
        @org.springframework.data.repository.query.Param("schoolId") UUID schoolId,
        @org.springframework.data.repository.query.Param("role") com.schoolmanagement.backend.domain.Role role
    );
    
    // Count unread notifications for a school (created in last 7 days as "new")
    @org.springframework.data.jpa.repository.Query("""
        SELECT COUNT(n) FROM Notification n 
        WHERE (n.scope = 'ALL' OR (n.scope = 'SCHOOL' AND n.targetSchool.id = :schoolId))
        AND n.createdAt > :since
    """)
    long countRecentForSchool(
        @org.springframework.data.repository.query.Param("schoolId") UUID schoolId,
        @org.springframework.data.repository.query.Param("since") java.time.Instant since
    );

    // Count all recent notifications (for System Admin)
    @org.springframework.data.jpa.repository.Query("""
        SELECT COUNT(n) FROM Notification n 
        WHERE n.createdAt > :since
    """)
    long countRecentAll(@org.springframework.data.repository.query.Param("since") java.time.Instant since);
}
