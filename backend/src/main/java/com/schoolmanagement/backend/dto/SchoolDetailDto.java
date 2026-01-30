package com.schoolmanagement.backend.dto;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public record SchoolDetailDto(
        UUID id,
        String name,
        String code,
        Integer provinceCode,
        String provinceName,
        Integer wardCode,
        String wardName,
        String enrollmentArea,
        String address,
        List<UserListDto> admins,
        Instant pendingDeleteAt) {
}
