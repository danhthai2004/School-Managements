package com.schoolmanagement.backend.dto.admin;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record CreateSchoolAdminForSchoolRequest(
        @NotBlank @Email String email,
        @NotBlank String fullName) {
}
