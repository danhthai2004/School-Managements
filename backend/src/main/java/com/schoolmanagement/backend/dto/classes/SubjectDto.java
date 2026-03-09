package com.schoolmanagement.backend.dto.classes;

import com.schoolmanagement.backend.domain.classes.SubjectType;

import java.util.UUID;

public record SubjectDto(
                UUID id,
                String name,
                String code,
                SubjectType type,
                com.schoolmanagement.backend.domain.classes.StreamType stream,
                Integer totalLessons,
                boolean active,
                String description) {
}
