package com.schoolmanagement.backend.repo.classes;

import com.schoolmanagement.backend.domain.entity.classes.ClassSeatMap;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;
import java.util.UUID;

@Repository
public interface ClassSeatMapRepository extends JpaRepository<ClassSeatMap, UUID> {
    Optional<ClassSeatMap> findByClassRoomId(UUID classRoomId);

    @Modifying
    @Transactional
    void deleteByClassRoomId(UUID classRoomId);
}
