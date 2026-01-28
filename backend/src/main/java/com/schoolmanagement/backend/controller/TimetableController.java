package com.schoolmanagement.backend.controller;

import com.schoolmanagement.backend.domain.entity.Timetable;
import com.schoolmanagement.backend.service.AutoScheduleService;
import com.schoolmanagement.backend.service.TimetableService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

import com.schoolmanagement.backend.security.UserPrincipal;
import com.schoolmanagement.backend.service.UserLookupService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;

@RestController
@RequestMapping("/api/school-admin/timetables")
@RequiredArgsConstructor
public class TimetableController {

    private final TimetableService timetableService;
    private final AutoScheduleService autoScheduleService;
    private final UserLookupService userLookup;

    @GetMapping
    public ResponseEntity<List<Timetable>> getTimetables(@AuthenticationPrincipal UserPrincipal principal) {
        var admin = userLookup.requireById(principal.getId());
        var list = timetableService.getTimetables(admin.getSchool());
        return ResponseEntity.ok(list);
    }

    @PostMapping
    public ResponseEntity<Timetable> createTimetable(@AuthenticationPrincipal UserPrincipal principal,
            @RequestBody CreateTimetableRequest request) {
        var admin = userLookup.requireById(principal.getId());
        var t = timetableService.createTimetable(admin.getSchool(), request.name(),
                request.academicYear(), request.semester());
        return ResponseEntity.ok(t);
    }

    @GetMapping("/{id}")
    public ResponseEntity<Timetable> getTimetable(@PathVariable UUID id) {
        return ResponseEntity.ok(timetableService.getTimetable(id));
    }

    @PostMapping("/{id}/generate")
    public ResponseEntity<Void> generateTimetable(@PathVariable UUID id) {
        autoScheduleService.generateTimetable(id);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTimetable(@PathVariable UUID id) {
        timetableService.deleteTimetable(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/apply")
    public ResponseEntity<Void> applyTimetable(@PathVariable UUID id) {
        timetableService.applyTimetable(id);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/{id}/details")
    public ResponseEntity<List<com.schoolmanagement.backend.dto.TimetableDetailDto>> getTimetableDetails(
            @PathVariable UUID id) {
        return ResponseEntity.ok(timetableService.getTimetableDetails(id));
    }

    public record CreateTimetableRequest(String name, String academicYear, int semester) {
    }
}
