package com.schoolmanagement.backend.dto;

import java.util.List;
import java.util.UUID;

public record SchoolDetailDto(
        UUID id,
        String name,
        String code,
        List<UserListDto> admins) {
}
