package com.schoolmanagement.backend.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record CreateSchoolAdminForSchoolRequest(
        @NotBlank @Email String email,
        @NotBlank String fullName) {
}
