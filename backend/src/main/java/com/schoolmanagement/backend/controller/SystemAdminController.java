package com.schoolmanagement.backend.controller;

import com.schoolmanagement.backend.dto.SchoolDto;
import com.schoolmanagement.backend.dto.UserDto;
import com.schoolmanagement.backend.dto.request.CreateSchoolRequest;
import com.schoolmanagement.backend.dto.request.CreateUserRequest;
import com.schoolmanagement.backend.exception.ApiException;
import com.schoolmanagement.backend.service.SystemAdminService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/system")
public class SystemAdminController {

    private final SystemAdminService systemAdmin;

    public SystemAdminController(SystemAdminService systemAdmin) {
        this.systemAdmin = systemAdmin;
    }

    @PostMapping("/schools")
    public SchoolDto createSchool(@Valid @RequestBody CreateSchoolRequest req) {
        return systemAdmin.createSchool(req.name(), req.code());
    }

    @GetMapping("/schools")
    public List<SchoolDto> listSchools() {
        return systemAdmin.listSchools();
    }

    /**
     * Create a SCHOOL_ADMIN for a school.
     */
    @PostMapping("/school-admins")
    public UserDto createSchoolAdmin(@Valid @RequestBody CreateUserRequest req) {
        if (req.schoolId() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "schoolId là bắt buộc.");
        }
        if (req.role() == null || req.role().name().equals("SCHOOL_ADMIN") == false) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "role phải là SCHOOL_ADMIN.");
        }
        return systemAdmin.createSchoolAdmin(req.schoolId(), req.email(), req.fullName());
    }
}
