package com.schoolmanagement.backend.repo.classes;

import com.schoolmanagement.backend.domain.classes.RoomStatus;
import com.schoolmanagement.backend.domain.entity.classes.Room;
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

    boolean existsByNameIgnoreCaseAndBuildingIgnoreCaseAndSchoolId(String name, String building, UUID schoolId);

    // Fallback for when building is null - name must be unique among rooms with no building
    @org.springframework.data.jpa.repository.Query("SELECT COUNT(r) > 0 FROM Room r WHERE LOWER(r.name) = LOWER(:name) AND r.building IS NULL AND r.school.id = :schoolId")
    boolean existsByNameIgnoreCaseAndBuildingIsNullAndSchoolId(String name, UUID schoolId);
}
