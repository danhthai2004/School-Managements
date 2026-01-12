package com.schoolmanagement.backend.dto;

import java.util.UUID;

public record SchoolDto(
        UUID id,
        String name,
        String code
) {}
