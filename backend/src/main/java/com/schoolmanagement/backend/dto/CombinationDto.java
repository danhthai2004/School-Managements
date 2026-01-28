package com.schoolmanagement.backend.dto;

import java.util.List;
import java.util.UUID;

public record CombinationDto(
                UUID id,
                String name,
                String code,
                com.schoolmanagement.backend.domain.StreamType stream,
                List<SubjectDto> subjects) {
}
