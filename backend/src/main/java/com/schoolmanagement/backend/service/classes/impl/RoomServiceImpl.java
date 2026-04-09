package com.schoolmanagement.backend.service.classes.impl;

import com.schoolmanagement.backend.domain.classes.RoomStatus;
import com.schoolmanagement.backend.domain.entity.classes.Room;
import com.schoolmanagement.backend.domain.entity.admin.School;
import com.schoolmanagement.backend.dto.classes.RoomDto;
import com.schoolmanagement.backend.exception.ApiException;
import com.schoolmanagement.backend.repo.classes.RoomRepository;
import com.schoolmanagement.backend.repo.admin.SchoolRepository;
import com.schoolmanagement.backend.service.classes.RoomService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RoomServiceImpl implements RoomService {

    private final RoomRepository roomRepository;
    private final SchoolRepository schoolRepository;

    @Override
    public Page<RoomDto> getAllRoomsBySchool(UUID schoolId, Pageable pageable) {
        return roomRepository.findBySchoolId(schoolId, pageable)
                .map(this::mapToDto);
    }

    @Override
    public List<RoomDto> getAllActiveRoomsBySchool(UUID schoolId) {
        return roomRepository.findBySchoolIdAndStatus(schoolId, RoomStatus.ACTIVE).stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Override
    public RoomDto getRoomById(UUID id, UUID schoolId) {
        Room room = roomRepository.findByIdAndSchoolId(id, schoolId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy phòng học"));
        return mapToDto(room);
    }

    @Override
    @Transactional
    public RoomDto createRoom(RoomDto roomDto, UUID schoolId) {
        if (roomRepository.existsByNameIgnoreCaseAndSchoolId(roomDto.getName(), schoolId)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Tên phòng học đã tồn tại trong trường này");
        }

        School school = schoolRepository.findById(schoolId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy trường học"));

        Room room = Room.builder()
                .name(roomDto.getName())
                .capacity(roomDto.getCapacity() != null ? roomDto.getCapacity() : 40)
                .building(roomDto.getBuilding())
                .status(roomDto.getStatus() != null ? roomDto.getStatus() : RoomStatus.ACTIVE)
                .school(school)
                .build();

        return mapToDto(roomRepository.save(room));
    }

    @Override
    @Transactional
    public List<RoomDto> createBulkRooms(List<RoomDto> roomDtos, UUID schoolId) {
        if (roomDtos == null || roomDtos.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Danh sách phòng không được để trống");
        }

        School school = schoolRepository.findById(schoolId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy trường học"));

        List<String> errors = new java.util.ArrayList<>();
        List<Room> roomsToSave = new java.util.ArrayList<>();

        for (int i = 0; i < roomDtos.size(); i++) {
            RoomDto dto = roomDtos.get(i);
            String name = dto.getName() != null ? dto.getName().trim() : "";
            if (name.isEmpty()) {
                errors.add("Phòng #" + (i + 1) + ": Tên phòng không được để trống");
                continue;
            }
            if (roomRepository.existsByNameIgnoreCaseAndSchoolId(name, schoolId)) {
                errors.add("Phòng \"" + name + "\": Tên phòng đã tồn tại trong trường");
                continue;
            }
            // Check duplicates within the batch itself
            boolean duplicateInBatch = roomsToSave.stream()
                    .anyMatch(r -> r.getName().equalsIgnoreCase(name));
            if (duplicateInBatch) {
                errors.add("Phòng \"" + name + "\": Trùng tên trong danh sách nhập");
                continue;
            }

            Room room = Room.builder()
                    .name(name)
                    .capacity(dto.getCapacity() != null ? dto.getCapacity() : 40)
                    .building(dto.getBuilding())
                    .status(dto.getStatus() != null ? dto.getStatus() : RoomStatus.ACTIVE)
                    .school(school)
                    .build();
            roomsToSave.add(room);
        }

        if (!errors.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, String.join("; ", errors));
        }

        return roomRepository.saveAll(roomsToSave).stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public RoomDto updateRoom(UUID id, RoomDto roomDto, UUID schoolId) {
        Room room = roomRepository.findByIdAndSchoolId(id, schoolId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy phòng học"));

        if (!room.getName().equalsIgnoreCase(roomDto.getName()) &&
                roomRepository.existsByNameIgnoreCaseAndSchoolId(roomDto.getName(), schoolId)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Tên phòng học đã tồn tại trong trường này");
        }

        room.setName(roomDto.getName());
        if (roomDto.getCapacity() != null) {
            room.setCapacity(roomDto.getCapacity());
        }
        room.setBuilding(roomDto.getBuilding());
        if (roomDto.getStatus() != null) {
            room.setStatus(roomDto.getStatus());
        }

        return mapToDto(roomRepository.save(room));
    }

    @Override
    @Transactional
    public void deleteRoom(UUID id, UUID schoolId) {
        Room room = roomRepository.findByIdAndSchoolId(id, schoolId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy phòng học"));
        roomRepository.delete(room);
    }

    @Override
    @Transactional
    public RoomDto updateRoomStatus(UUID id, RoomStatus status, UUID schoolId) {
        Room room = roomRepository.findByIdAndSchoolId(id, schoolId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy phòng học"));
        room.setStatus(status);
        return mapToDto(roomRepository.save(room));
    }

    private RoomDto mapToDto(Room room) {
        return RoomDto.builder()
                .id(room.getId())
                .name(room.getName())
                .capacity(room.getCapacity())
                .building(room.getBuilding())
                .status(room.getStatus())
                .build();
    }
}
