package com.schoolmanagement.backend.repo.classes;

import com.schoolmanagement.backend.domain.entity.classes.ClassSeatMap;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface ClassSeatMapRepository extends JpaRepository<ClassSeatMap, UUID> {
    Optional<ClassSeatMap> findByClassRoom_Id(UUID classRoomId);

    void deleteByClassRoom_Id(UUID classRoomId);
}
