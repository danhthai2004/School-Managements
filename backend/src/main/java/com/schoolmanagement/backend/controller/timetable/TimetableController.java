package com.schoolmanagement.backend.controller.timetable;

import com.schoolmanagement.backend.dto.timetable.MoveSlotRequest;
import com.schoolmanagement.backend.dto.timetable.SlotValidationResponse;
import com.schoolmanagement.backend.dto.timetable.SwapSlotRequest;
import com.schoolmanagement.backend.dto.timetable.TimetableDto;
import com.schoolmanagement.backend.service.timetable.AutoScheduleService;
import com.schoolmanagement.backend.service.timetable.TimetableAdjustmentService;
import com.schoolmanagement.backend.service.timetable.TimetableService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

import org.springframework.transaction.annotation.Transactional;
import com.schoolmanagement.backend.security.UserPrincipal;
import com.schoolmanagement.backend.service.auth.UserLookupService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;

@RestController
@RequestMapping("/api/school-admin/timetables")
@RequiredArgsConstructor
public class TimetableController {

    private final TimetableService timetableService;
    private final AutoScheduleService autoScheduleService;
    private final TimetableAdjustmentService adjustmentService;
    private final UserLookupService userLookup;

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

    // ──────────────────────────────────────────────────────────────────────
    // Manual Adjustment APIs (Post-Auto-Scheduling)
    // ──────────────────────────────────────────────────────────────────────

    /**
     * Kiểm tra xem di chuyển tiết học đến ô trống có bị xung đột không.
     */
    @PostMapping("/adjust/validate-move")
    public ResponseEntity<SlotValidationResponse> validateMove(@RequestBody MoveSlotRequest request) {
        return ResponseEntity.ok(adjustmentService.validateMove(request));
    }

    /**
     * Kiểm tra xem hoán đổi 2 tiết học có bị xung đột không.
     */
    @PostMapping("/adjust/validate-swap")
    public ResponseEntity<SlotValidationResponse> validateSwap(@RequestBody SwapSlotRequest request) {
        return ResponseEntity.ok(adjustmentService.validateSwap(request));
    }

    /**
     * Thực hiện di chuyển tiết học đến ô trống.
     */
    @PutMapping("/adjust/move")
    public ResponseEntity<Void> applyMove(@RequestBody MoveSlotRequest request) {
        adjustmentService.applyMove(request);
        return ResponseEntity.ok().build();
    }

    /**
     * Thực hiện hoán đổi 2 tiết học.
     */
    @PutMapping("/adjust/swap")
    public ResponseEntity<Void> applySwap(@RequestBody SwapSlotRequest request) {
        adjustmentService.applySwap(request);
        return ResponseEntity.ok().build();
    }

    /**
     * Ghim/Mở ghim tiết học (tiết bị ghim không cho di chuyển/hoán đổi).
     */
    @PatchMapping("/adjust/{detailId}/toggle-lock")
    public ResponseEntity<Void> toggleLock(@PathVariable UUID detailId) {
        adjustmentService.toggleLock(detailId);
        return ResponseEntity.ok().build();
    }
}
