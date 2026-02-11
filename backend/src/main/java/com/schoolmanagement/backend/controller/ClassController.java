package com.schoolmanagement.backend.controller;

import com.schoolmanagement.backend.dto.ClassRoomDto;
import com.schoolmanagement.backend.dto.request.CreateClassRoomRequest;
import com.schoolmanagement.backend.exception.ApiException;
import com.schoolmanagement.backend.security.UserPrincipal;
import com.schoolmanagement.backend.service.ClassManagementService;
import com.schoolmanagement.backend.service.UserLookupService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/school")
@Transactional(readOnly = true)
public class ClassController {

    private final ClassManagementService classManagementService;
    private final UserLookupService userLookup;

    public ClassController(ClassManagementService classManagementService, UserLookupService userLookup) {
        this.classManagementService = classManagementService;
        this.userLookup = userLookup;
    }

    @GetMapping("/classes")
    public List<ClassRoomDto> listClasses(@AuthenticationPrincipal UserPrincipal principal) {
        var admin = userLookup.requireById(principal.getId());
        if (admin.getSchool() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "School admin chưa được gán trường.");
        }
        return classManagementService.listClassRooms(admin.getSchool());
    }

    @GetMapping("/classes/{id}")
    public ClassRoomDto getClass(@AuthenticationPrincipal UserPrincipal principal,
            @PathVariable("id") UUID classId) {
        var admin = userLookup.requireById(principal.getId());
        if (admin.getSchool() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "School admin chưa được gán trường.");
        }
        return classManagementService.getClassRoom(admin.getSchool(), classId);
    }

    @Transactional
    @PostMapping("/classes")
    public ClassRoomDto createClass(@AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody CreateClassRoomRequest req) {
        var admin = userLookup.requireById(principal.getId());
        if (admin.getSchool() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "School admin chưa được gán trường.");
        }
        return classManagementService.createClassRoom(admin.getSchool(), req);
    }

    @Transactional
    @PutMapping("/classes/{id}")
    public ClassRoomDto updateClass(@AuthenticationPrincipal UserPrincipal principal,
            @PathVariable("id") UUID classId,
            @Valid @RequestBody CreateClassRoomRequest req) {
        var admin = userLookup.requireById(principal.getId());
        if (admin.getSchool() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "School admin chưa được gán trường.");
        }
        return classManagementService.updateClassRoom(admin.getSchool(), classId, req);
    }

    @Transactional
    @DeleteMapping("/classes/{id}")
    public void deleteClass(@AuthenticationPrincipal UserPrincipal principal,
            @PathVariable("id") UUID classId) {
        var admin = userLookup.requireById(principal.getId());
        if (admin.getSchool() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "School admin chưa được gán trường.");
        }
        classManagementService.deleteClassRoom(admin.getSchool(), classId);
    }
}
