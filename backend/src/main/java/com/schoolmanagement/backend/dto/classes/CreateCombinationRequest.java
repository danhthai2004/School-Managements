package com.schoolmanagement.backend.dto.classes;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;
import java.util.UUID;

public record CreateCombinationRequest(
                @NotBlank(message = "Tên tổ hợp không được để trống") String name,

                String code,

                com.schoolmanagement.backend.domain.classes.StreamType stream,

                @NotNull(message = "Danh sách môn lựa chọn không được để trống") @Size(min = 4, max = 4, message = "Phải chọn đúng 4 môn lựa chọn") List<UUID> electiveSubjectIds,

                @NotNull(message = "Danh sách chuyên đề không được để trống") @Size(min = 3, max = 3, message = "Phải chọn đúng 3 chuyên đề học tập") List<UUID> specializedSubjectIds) {
}
