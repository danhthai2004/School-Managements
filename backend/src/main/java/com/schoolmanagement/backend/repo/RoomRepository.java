package com.schoolmanagement.backend.repo;

import com.schoolmanagement.backend.domain.RoomStatus;
import com.schoolmanagement.backend.domain.entity.Room;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface RoomRepository extends JpaRepository<Room, UUID> {
    Page<Room> findBySchoolId(UUID schoolId, Pageable pageable);

    List<Room> findBySchoolId(UUID schoolId);

    List<Room> findBySchoolIdAndStatus(UUID schoolId, RoomStatus status);

    Optional<Room> findByIdAndSchoolId(UUID id, UUID schoolId);

    boolean existsByNameIgnoreCaseAndSchoolId(String name, UUID schoolId);
}
