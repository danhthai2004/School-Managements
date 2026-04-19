package com.schoolmanagement.backend.controller.classes;

import com.schoolmanagement.backend.domain.classes.RoomStatus;
import com.schoolmanagement.backend.dto.classes.RoomDto;
import com.schoolmanagement.backend.exception.ApiException;
import com.schoolmanagement.backend.security.UserPrincipal;
import com.schoolmanagement.backend.service.classes.RoomService;
import com.schoolmanagement.backend.service.auth.UserLookupService;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/school")
@Transactional(readOnly = true)
public class RoomController {

    private final RoomService roomService;
    private final UserLookupService userLookup;

    public RoomController(RoomService roomService, UserLookupService userLookup) {
        this.roomService = roomService;
        this.userLookup = userLookup;
    }

    private UUID getSchoolId(UserPrincipal principal) {
        var admin = userLookup.requireById(principal.getId());
        if (admin.getSchool() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "School admin chưa được gán trường.");
        }
        return admin.getSchool().getId();
    }

    @GetMapping("/rooms")
    public Page<RoomDto> getAllRooms(
            @AuthenticationPrincipal UserPrincipal principal,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {

        Pageable pageable = PageRequest.of(page, size);
        return roomService.getAllRoomsBySchool(getSchoolId(principal), pageable);
    }

    @GetMapping("/rooms/active")
    public List<RoomDto> getAllActiveRooms(@AuthenticationPrincipal UserPrincipal principal) {
        return roomService.getAllActiveRoomsBySchool(getSchoolId(principal));
    }

    @GetMapping("/rooms/{id}")
    public RoomDto getRoomById(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal) {
        return roomService.getRoomById(id, getSchoolId(principal));
    }

    @Transactional
    @PostMapping("/rooms")
    public RoomDto createRoom(
            @Valid @RequestBody RoomDto roomDto,
            @AuthenticationPrincipal UserPrincipal principal) {
        return roomService.createRoom(roomDto, getSchoolId(principal));
    }

    @Transactional
    @PostMapping("/rooms/bulk")
    public List<RoomDto> createBulkRooms(
            @Valid @RequestBody List<RoomDto> roomDtos,
            @AuthenticationPrincipal UserPrincipal principal) {
        return roomService.createBulkRooms(roomDtos, getSchoolId(principal));
    }

    @Transactional
    @PutMapping("/rooms/{id}")
    public RoomDto updateRoom(
            @PathVariable UUID id,
            @Valid @RequestBody RoomDto roomDto,
            @AuthenticationPrincipal UserPrincipal principal) {
        return roomService.updateRoom(id, roomDto, getSchoolId(principal));
    }

    @Transactional
    @DeleteMapping("/rooms/{id}")
    public void deleteRoom(
            @PathVariable UUID id,
            @AuthenticationPrincipal UserPrincipal principal) {
        roomService.deleteRoom(id, getSchoolId(principal));
    }

    @Transactional
    @PatchMapping("/rooms/{id}/status")
    public RoomDto updateRoomStatus(
            @PathVariable UUID id,
            @RequestParam RoomStatus status,
            @AuthenticationPrincipal UserPrincipal principal) {
        return roomService.updateRoomStatus(id, status, getSchoolId(principal));
    }
}
