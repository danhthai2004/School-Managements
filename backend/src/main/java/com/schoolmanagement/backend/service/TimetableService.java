package com.schoolmanagement.backend.service;

import com.schoolmanagement.backend.domain.TimetableStatus;
import com.schoolmanagement.backend.domain.entity.School;
import com.schoolmanagement.backend.domain.entity.Timetable;
import com.schoolmanagement.backend.repo.TimetableRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TimetableService {

    private final TimetableRepository timetableRepository;
    private final com.schoolmanagement.backend.repo.TimetableDetailRepository timetableDetailRepository;

    public List<Timetable> getTimetables(School school) {
        return timetableRepository.findAllBySchoolOrderByCreatedAtDesc(school);
    }

    public Timetable getTimetable(UUID id) {
        return timetableRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Timetable not found"));
    }

    @Transactional
    public Timetable createTimetable(School school, String name, String academicYear, int semester) {
        Timetable timetable = Timetable.builder()
                .school(school)
                .name(name)
                .academicYear(academicYear)
                .semester(semester)
                .status(TimetableStatus.DRAFT)
                .createdAt(Instant.now())
                .build();
        return timetableRepository.save(timetable);
    }

    public List<com.schoolmanagement.backend.dto.TimetableDetailDto> getTimetableDetails(UUID timetableId) {
        Timetable timetable = getTimetable(timetableId);
        List<com.schoolmanagement.backend.dto.TimetableDetailDto> dtos = timetableDetailRepository
                .findAllByTimetable(timetable).stream()
                .map(d -> new com.schoolmanagement.backend.dto.TimetableDetailDto(
                        d.getId(),
                        d.getClassRoom().getId(),
                        d.getClassRoom().getName(),
                        d.getSubject().getId(),
                        d.getSubject().getName(),
                        d.getSubject().getCode(),
                        d.getTeacher() != null ? d.getTeacher().getId() : null,
                        d.getTeacher() != null ? d.getTeacher().getFullName() : null,
                        d.getDayOfWeek().name(),
                        d.getSlotIndex(),
                        d.isFixed()))
                .toList();

        if (!dtos.isEmpty()) {
            // var first = dtos.get(0);
        }
        return dtos;
    }

    @Transactional
    public void deleteTimetable(UUID id) {
        timetableRepository.deleteById(id);
    }

    @Transactional
    public void applyTimetable(UUID id) {
        Timetable timetable = getTimetable(id);

        // Optional: Set all other timetables of this school to DRAFT/ARCHIVED if needed
        // For now, just mark this one as OFFICIAL (Active)
        List<Timetable> schoolTimetables = timetableRepository
                .findAllBySchoolOrderByCreatedAtDesc(timetable.getSchool());
        for (Timetable t : schoolTimetables) {
            if (t.getId().equals(id)) {
                t.setStatus(TimetableStatus.OFFICIAL);
            } else if (t.getStatus() == TimetableStatus.OFFICIAL) {
                t.setStatus(TimetableStatus.DRAFT); // Demote currently active TKB
            }
            timetableRepository.save(t);
        }
    }
}
