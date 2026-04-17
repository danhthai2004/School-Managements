package com.schoolmanagement.backend.controller.timetable;

import com.schoolmanagement.backend.dto.timetable.TimetableScheduleSummaryDto;
import com.schoolmanagement.backend.dto.timetable.TimetableSettingsDto;
import com.schoolmanagement.backend.dto.timetable.TimetableDto;
import com.schoolmanagement.backend.service.timetable.AutoScheduleService;
import com.schoolmanagement.backend.service.timetable.TimetableService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

import com.schoolmanagement.backend.security.UserPrincipal;
import com.schoolmanagement.backend.service.timetable.SchoolTimetableSettingsService;
import com.schoolmanagement.backend.service.auth.UserLookupService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;

@RestController
@RequestMapping("/api/school-admin/timetables")
@RequiredArgsConstructor
public class TimetableController {

    private final TimetableService timetableService;
    private final AutoScheduleService autoScheduleService;
    private final UserLookupService userLookup;
    private final SchoolTimetableSettingsService settingsService;

    @GetMapping
    public ResponseEntity<List<TimetableDto>> getTimetables(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(required = false) UUID semesterId) {
        var admin = userLookup.requireById(principal.getId());
        var list = timetableService.getTimetables(admin.getSchool(), semesterId);
        return ResponseEntity.ok(list);
    }

    @PostMapping
    public ResponseEntity<TimetableDto> createTimetable(@AuthenticationPrincipal UserPrincipal principal,
            @RequestBody CreateTimetableRequest request) {
        var admin = userLookup.requireById(principal.getId());
        var t = timetableService.createTimetable(admin.getSchool(), request.name(), request.semesterId());
        return ResponseEntity.ok(t);
    }

    @GetMapping("/{id}")
    public ResponseEntity<TimetableDto> getTimetable(@AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID id) {
        var admin = userLookup.requireById(principal.getId());
        return ResponseEntity.ok(timetableService.getTimetable(admin.getSchool(), id));
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
    public ResponseEntity<List<com.schoolmanagement.backend.dto.timetable.TimetableDetailDto>> getTimetableDetails(
            @PathVariable UUID id,
            @RequestParam(required = false) Integer grade,
            @RequestParam(required = false) String className) {
        return ResponseEntity.ok(timetableService.getTimetableDetails(id, grade, className));
    }

    @GetMapping("/{id}/export")
    public ResponseEntity<org.springframework.core.io.Resource> exportTimetable(
            @PathVariable UUID id,
            @RequestParam(required = false) Integer grade,
            @RequestParam(required = false) String className) {

        try {
            byte[] content = timetableService.exportTimetableToExcel(id, grade, className);
            org.springframework.core.io.ByteArrayResource resource = new org.springframework.core.io.ByteArrayResource(
                    content);

            return ResponseEntity.ok()
                    .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION,
                            "attachment; filename=timetable.xlsx")
                    .contentType(org.springframework.http.MediaType
                            .parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                    .body(resource);
        } catch (java.io.IOException e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    public record CreateTimetableRequest(String name, UUID semesterId) {
    }

    // ========== Settings Endpoints ==========

    @GetMapping("/settings")
    public ResponseEntity<TimetableSettingsDto> getSettings(@AuthenticationPrincipal UserPrincipal principal) {
        var admin = userLookup.requireById(principal.getId());
        return ResponseEntity.ok(settingsService.getSettings(admin.getSchool()));
    }

    @PutMapping("/settings")
    public ResponseEntity<TimetableSettingsDto> updateSettings(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestBody TimetableSettingsDto request) {
        var admin = userLookup.requireById(principal.getId());
        return ResponseEntity.ok(settingsService.updateSettings(admin.getSchool(), request));
    }

    @GetMapping("/settings/summary")
    public ResponseEntity<TimetableScheduleSummaryDto> getScheduleSummary(
            @AuthenticationPrincipal UserPrincipal principal) {
        var admin = userLookup.requireById(principal.getId());
        return ResponseEntity.ok(settingsService.calculateScheduleSummary(admin.getSchool()));
    }

    @PostMapping("/settings/preview")
    public ResponseEntity<TimetableScheduleSummaryDto> previewScheduleSummary(
            @RequestBody TimetableSettingsDto request) {
        return ResponseEntity.ok(settingsService.calculateScheduleSummaryFromDto(request));
    }

    @GetMapping("/slot-times")
    public ResponseEntity<List<TimetableScheduleSummaryDto.SlotTimeDto>> getSlotTimes(
            @AuthenticationPrincipal UserPrincipal principal) {
        var admin = userLookup.requireById(principal.getId());
        return ResponseEntity.ok(settingsService.getAllSlotTimes(admin.getSchool()));
    }

    @PostMapping("/{id}/global-slot")
    public ResponseEntity<Void> updateGlobalSlot(@PathVariable UUID id, @RequestBody GlobalSlotRequest request) {
        timetableService.updateGlobalSlot(id, request.dayOfWeek(), request.slotIndex(), request.subjectId(),
                request.grades());
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{id}/class-slot")
    public ResponseEntity<Void> updateClassSlot(@PathVariable UUID id, @RequestBody ClassSlotRequest request) {
        timetableService.updateClassSlot(id, request.classRoomId(), request.dayOfWeek(), request.slotIndex(),
                request.subjectId(), request.teacherId());
        return ResponseEntity.ok().build();
    }


    public record GlobalSlotRequest(java.time.DayOfWeek dayOfWeek, int slotIndex, UUID subjectId,
            List<Integer> grades) {
    }

    public record ClassSlotRequest(UUID classRoomId, java.time.DayOfWeek dayOfWeek, int slotIndex, UUID subjectId,
            UUID teacherId) {
    }
}


