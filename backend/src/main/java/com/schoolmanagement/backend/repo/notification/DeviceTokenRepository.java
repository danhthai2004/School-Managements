package com.schoolmanagement.backend.repo.notification;

import com.schoolmanagement.backend.domain.entity.notification.DeviceToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;


import com.schoolmanagement.backend.domain.entity.auth.User;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

@Repository
public interface DeviceTokenRepository extends JpaRepository<DeviceToken, String> {
    
    List<DeviceToken> findByUserId(UUID userId);
    
    void deleteByUserId(UUID userId);

    @Query("SELECT d.fcmToken FROM DeviceToken d WHERE d.user IN :users")
    List<String> findFcmTokensByUsers(@Param("users") List<User> users);
}
