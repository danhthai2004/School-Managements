package com.schoolmanagement.backend.dto.teacher;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SaveClassSeatMapRequest {
    @NotBlank(message = "Config is required")
    private String config; // JSON string with grid layout + positions
}
