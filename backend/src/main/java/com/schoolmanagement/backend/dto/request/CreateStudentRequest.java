package com.schoolmanagement.backend.dto.request;

import com.schoolmanagement.backend.domain.Gender;
import jakarta.validation.constraints.*;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

public record CreateStudentRequest(
                @Size(max = 20, message = "Mã học sinh tối đa 20 ký tự") String studentCode, // Optional - will be
                                                                                             // auto-generated

                @NotBlank(message = "Họ tên không được để trống") @Size(max = 100, message = "Họ tên tối đa 100 ký tự") String fullName,

                LocalDate dateOfBirth,

                Gender gender,

                @Size(max = 100, message = "Nơi sinh tối đa 100 ký tự") String birthPlace,

                @Size(max = 255, message = "Địa chỉ tối đa 255 ký tự") String address,

                @Email(message = "Email không hợp lệ") @Size(max = 254, message = "Email tối đa 254 ký tự") String email,

                @Size(max = 15, message = "SĐT tối đa 15 ký tự") String phone,

                LocalDate enrollmentDate,

                // Class assignment
                UUID classId,
                String academicYear,

                // Guardian info
                List<GuardianRequest> guardians) {
        public record GuardianRequest(
                        @NotBlank(message = "Tên người giám hộ không được để trống") @Size(max = 100, message = "Tên tối đa 100 ký tự") String fullName,

                        @Size(max = 15, message = "SĐT tối đa 15 ký tự") String phone,

                        @Email(message = "Email không hợp lệ") @Size(max = 254, message = "Email tối đa 254 ký tự") String email,

                        @Size(max = 50, message = "Quan hệ tối đa 50 ký tự") String relationship) {
        }
}
