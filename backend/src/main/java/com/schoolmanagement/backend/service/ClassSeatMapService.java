package com.schoolmanagement.backend.service;

import com.schoolmanagement.backend.domain.entity.classes.ClassRoom;
import com.schoolmanagement.backend.domain.entity.classes.ClassSeatMap;
import com.schoolmanagement.backend.domain.entity.auth.User;
import com.schoolmanagement.backend.dto.teacher.ClassSeatMapDto;
import com.schoolmanagement.backend.dto.teacher.SaveClassSeatMapRequest;
import com.schoolmanagement.backend.repo.classes.ClassRoomRepository;
import com.schoolmanagement.backend.repo.classes.ClassSeatMapRepository;
import com.schoolmanagement.backend.repo.auth.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class ClassSeatMapService {

        private final ClassSeatMapRepository classSeatMapRepository;
        private final ClassRoomRepository classRoomRepository;
        private final UserRepository userRepository;

        /**
         * Get the seating chart for a class.
         * Any teacher can view.
         */
        public ClassSeatMapDto getClassSeatMap(String email, UUID classId) {
                User teacher = findTeacherByEmail(email);
                ClassRoom classRoom = classRoomRepository.findById(classId)
                                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                                                "Class not found"));

                // Check GVCN permission
                ensureIsHomeroom(teacher, classRoom);

                Optional<ClassSeatMap> seatMapOpt = classSeatMapRepository.findByClassRoomId(classId);

                if (seatMapOpt.isEmpty()) {
                        log.debug("No seat map found for class {}", classId);
                        // Return empty DTO (no seating chart yet)
                        return ClassSeatMapDto.builder()
                                        .classId(classId.toString())
                                        .className(classRoom.getName())
                                        .config(null)
                                        .build();
                }

                ClassSeatMap seatMap = seatMapOpt.get();
                String updatedByName = seatMap.getUpdatedBy() != null
                                ? seatMap.getUpdatedBy().getFullName()
                                : null;

                return ClassSeatMapDto.builder()
                                .classId(classId.toString())
                                .className(classRoom.getName())
                                .config(seatMap.getConfig())
                                .updatedAt(seatMap.getUpdatedAt() != null ? seatMap.getUpdatedAt().toString() : null)
                                .updatedByName(updatedByName)
                                .build();
        }

        /**
         * Save or update the seating chart for a class.
         * Only the homeroom teacher (GVCN) of this class can save.
         */
        @Transactional
        public ClassSeatMapDto saveClassSeatMap(String email, UUID classId, SaveClassSeatMapRequest request) {
                User teacher = findTeacherByEmail(email);
                ClassRoom classRoom = classRoomRepository.findById(classId)
                                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                                                "Class not found"));

                // Check GVCN permission
                try {
                        ensureIsHomeroom(teacher, classRoom);
                } catch (ResponseStatusException e) {
                        log.error("Permission denied: Teacher {} is not the GVCN of class {}", email,
                                        classRoom.getName());
                        throw e;
                }

                Optional<ClassSeatMap> existing = classSeatMapRepository.findByClassRoomId(classId);

                ClassSeatMap seatMap;
                try {
                        if (existing.isPresent()) {
                                seatMap = existing.get();
                                seatMap.setConfig(request.getConfig());
                                seatMap.setUpdatedAt(Instant.now());
                                seatMap.setUpdatedBy(teacher);
                        } else {
                                seatMap = ClassSeatMap.builder()
                                                .classRoom(classRoom)
                                                .config(request.getConfig())
                                                .updatedAt(Instant.now())
                                                .updatedBy(teacher)
                                                .build();
                        }

                        classSeatMapRepository.save(seatMap);
                        log.info("Seat map saved successfully for class {} by teacher {}", classRoom.getName(), email);
                } catch (Exception e) {
                        log.error("Failed to save seat map for class {}: {}", classRoom.getName(), e.getMessage(), e);
                        throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR,
                                        "Lỗi khi lưu dữ liệu sơ đồ: " + e.getMessage());
                }

                return ClassSeatMapDto.builder()
                                .classId(classId.toString())
                                .className(classRoom.getName())
                                .config(seatMap.getConfig())
                                .updatedAt(seatMap.getUpdatedAt().toString())
                                .updatedByName(teacher.getFullName())
                                .build();
        }

        /**
         * Delete/reset the seating chart for a class.
         * Only the homeroom teacher (GVCN) can delete.
         */
        @Transactional
        public void deleteClassSeatMap(String email, UUID classId) {
                User teacher = findTeacherByEmail(email);
                ClassRoom classRoom = classRoomRepository.findById(classId)
                                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                                                "Class not found"));

                ensureIsHomeroom(teacher, classRoom);

                classSeatMapRepository.deleteByClassRoomId(classId);
                log.info("Seat map deleted for class {} by {}", classRoom.getName(), email);
        }

        // ========================= PRIVATE HELPERS =========================

        private User findTeacherByEmail(String email) {
                return userRepository.findByEmailIgnoreCase(email)
                                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                                                "Teacher not found"));
        }

        private void ensureIsHomeroom(User teacher, ClassRoom classRoom) {
                if (classRoom.getHomeroomTeacher() == null ||
                                !classRoom.getHomeroomTeacher().getId().equals(teacher.getId())) {
                        throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                                        "Chỉ giáo viên chủ nhiệm mới có quyền chỉnh sửa sơ đồ lớp");
                }
        }
}
