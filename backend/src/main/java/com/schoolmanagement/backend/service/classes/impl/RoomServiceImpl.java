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
        boolean exists = roomDto.getBuilding() != null && !roomDto.getBuilding().isBlank()
                ? roomRepository.existsByNameIgnoreCaseAndBuildingIgnoreCaseAndSchoolId(roomDto.getName(),
                        roomDto.getBuilding(), schoolId)
                : roomRepository.existsByNameIgnoreCaseAndBuildingIsNullAndSchoolId(roomDto.getName(), schoolId);

        if (exists) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Tên phòng học đã tồn tại trong " +
                    (roomDto.getBuilding() != null ? "tòa nhà này" : "trường này"));
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
        School school = schoolRepository.findById(schoolId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy trường học"));

        List<Room> roomsToSave = roomDtos.stream().map(dto -> {
            boolean exists = dto.getBuilding() != null && !dto.getBuilding().isBlank()
                    ? roomRepository.existsByNameIgnoreCaseAndBuildingIgnoreCaseAndSchoolId(dto.getName(),
                            dto.getBuilding(), schoolId)
                    : roomRepository.existsByNameIgnoreCaseAndBuildingIsNullAndSchoolId(dto.getName(), schoolId);

            if (exists) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Phòng học " + dto.getName() +
                        (dto.getBuilding() != null ? " tại tòa nhà " + dto.getBuilding() : "") + " đã tồn tại.");
            }

            return Room.builder()
                    .name(dto.getName())
                    .capacity(dto.getCapacity() != null ? dto.getCapacity() : 40)
                    .building(dto.getBuilding())
                    .status(dto.getStatus() != null ? dto.getStatus() : RoomStatus.ACTIVE)
                    .school(school)
                    .build();
        }).collect(Collectors.toList());

        return roomRepository.saveAll(roomsToSave).stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public RoomDto updateRoom(UUID id, RoomDto roomDto, UUID schoolId) {
        Room room = roomRepository.findByIdAndSchoolId(id, schoolId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy phòng học"));

        if (!room.getName().equalsIgnoreCase(roomDto.getName()) ||
                (room.getBuilding() != null && !room.getBuilding().equalsIgnoreCase(roomDto.getBuilding())) ||
                (room.getBuilding() == null && roomDto.getBuilding() != null)) {

            boolean exists = roomDto.getBuilding() != null && !roomDto.getBuilding().isBlank()
                    ? roomRepository.existsByNameIgnoreCaseAndBuildingIgnoreCaseAndSchoolId(roomDto.getName(),
                            roomDto.getBuilding(), schoolId)
                    : roomRepository.existsByNameIgnoreCaseAndBuildingIsNullAndSchoolId(roomDto.getName(), schoolId);

            if (exists) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Tên phòng học đã tồn tại trong " +
                        (roomDto.getBuilding() != null ? "tòa nhà này" : "trường này"));
            }
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
