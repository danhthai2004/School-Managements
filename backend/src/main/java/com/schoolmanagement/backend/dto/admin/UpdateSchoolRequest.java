package com.schoolmanagement.backend.dto.admin;

public record UpdateSchoolRequest(
        String name,
        Integer provinceCode,
        Integer wardCode,
        String address) {
}

