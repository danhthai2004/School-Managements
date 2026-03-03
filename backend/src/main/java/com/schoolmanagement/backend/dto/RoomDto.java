package com.schoolmanagement.backend.dto;

import com.schoolmanagement.backend.domain.RoomStatus;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.*;

import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class RoomDto {
    private UUID id;

    @NotBlank(message = "Tên phòng không được để trống")
    private String name;

    @Min(value = 1, message = "Sức chứa phải lớn hơn 0")
    private Integer capacity;

    private String building;

    private RoomStatus status;
}
