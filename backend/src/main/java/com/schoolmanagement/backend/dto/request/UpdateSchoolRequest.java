package com.schoolmanagement.backend.dto.request;

public record UpdateSchoolRequest(
                String name,
                String code,
                Integer provinceCode,
                Integer wardCode,
                String enrollmentArea,
                String address) {
}
