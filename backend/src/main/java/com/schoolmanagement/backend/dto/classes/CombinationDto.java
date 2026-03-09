package com.schoolmanagement.backend.dto.classes;

import java.util.List;
import java.util.UUID;

public record CombinationDto(
                UUID id,
                String name,
                String code,
                com.schoolmanagement.backend.domain.classes.StreamType stream,
                List<SubjectDto> subjects) {
}
