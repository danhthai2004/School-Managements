package com.schoolmanagement.backend.dto;

import com.schoolmanagement.backend.domain.SubjectType;

import java.util.UUID;

public record SubjectDto(
                UUID id,
                String name,
                String code,
                SubjectType type,
                com.schoolmanagement.backend.domain.StreamType stream,
                Integer totalLessons,
                boolean active,
                String description) {
}
