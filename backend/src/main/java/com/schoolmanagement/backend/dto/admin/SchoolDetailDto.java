package com.schoolmanagement.backend.dto.admin;

import com.schoolmanagement.backend.dto.auth.UserListDto;

import java.util.List;
import java.util.UUID;

public record SchoolDetailDto(
        UUID id,
        String name,
        String code,
        List<UserListDto> admins) {
}
