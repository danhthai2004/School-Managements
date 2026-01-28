package com.schoolmanagement.backend.dto.request;

import com.schoolmanagement.backend.domain.NotificationScope;
import com.schoolmanagement.backend.domain.Role;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.util.UUID;

public record CreateNotificationRequest(
        @NotBlank String title,
        @NotBlank String message,
        @NotNull NotificationScope scope,
        UUID targetSchoolId, // required when scope = SCHOOL
        Role targetRole // required when scope = ROLE
) {
}
