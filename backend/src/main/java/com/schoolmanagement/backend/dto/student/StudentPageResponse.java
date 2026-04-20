package com.schoolmanagement.backend.dto.student;

import java.util.List;

public record StudentPageResponse(
        List<StudentDto> content,
        int page,
        int size,
        long totalElements,
        int totalPages) {
}
