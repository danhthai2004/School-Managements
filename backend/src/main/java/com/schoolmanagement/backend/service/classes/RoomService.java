package com.schoolmanagement.backend.service.classes;

import com.schoolmanagement.backend.domain.classes.RoomStatus;
import com.schoolmanagement.backend.dto.classes.RoomDto;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;
import java.util.UUID;

public interface RoomService {
    Page<RoomDto> getAllRoomsBySchool(UUID schoolId, Pageable pageable);

    List<RoomDto> getAllActiveRoomsBySchool(UUID schoolId);

    RoomDto getRoomById(UUID id, UUID schoolId);

    RoomDto createRoom(RoomDto roomDto, UUID schoolId);

    List<RoomDto> createBulkRooms(List<RoomDto> roomDtos, UUID schoolId);

    RoomDto updateRoom(UUID id, RoomDto roomDto, UUID schoolId);

    void deleteRoom(UUID id, UUID schoolId);

    RoomDto updateRoomStatus(UUID id, RoomStatus status, UUID schoolId);
}
