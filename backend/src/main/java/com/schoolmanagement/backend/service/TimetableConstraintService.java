package com.schoolmanagement.backend.service;

import com.schoolmanagement.backend.domain.entity.TimetableDetail;
import com.schoolmanagement.backend.repo.TimetableDetailRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.DayOfWeek;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class TimetableConstraintService {

    private final TimetableDetailRepository timetableDetailRepository;

    /**
     * Check if a teacher is available at a specific time slot.
     * Returns true if available (not teaching elsewhere), false otherwise.
     */
    public boolean checkTeacherAvailability(UUID teacherId, UUID timetableId, DayOfWeek day, int slotIndex) {
        if (teacherId == null)
            return true; // No teacher assigned yet, so "availability" is not an issue for the teacher
        boolean exists = timetableDetailRepository.existsByTimetableIdAndTeacherIdAndDayOfWeekAndSlotIndex(
                timetableId, teacherId, day, slotIndex);
        return !exists;
    }

    /**
     * Check if a class is available (free) at a specific time slot.
     * Returns true if available (no other subject assigned), false otherwise.
     */
    public boolean checkClassAvailability(UUID classId, UUID timetableId, DayOfWeek day, int slotIndex) {
        boolean exists = timetableDetailRepository.existsByTimetableIdAndClassRoomIdAndDayOfWeekAndSlotIndex(
                timetableId, classId, day, slotIndex);
        return !exists;
    }

    /**
     * Check if assigning a subject to a class on a specific day violates the
     * "spread" constraint.
     * e.g., A class shouldn't have more than 2 lessons of the same subject per day
     * (unless it's a block).
     */
    public boolean checkSubjectSpread(UUID classId, UUID timetableId, UUID subjectId, DayOfWeek day, int maxPerDay) {
        long count = timetableDetailRepository.countByTimetableIdAndClassRoomIdAndSubjectIdAndDayOfWeek(
                timetableId, classId, subjectId, day);
        return count < maxPerDay;
    }

    /**
     * Check valid distribution (example):
     * Main subjects (Math, Lit, Eng) should prefer morning slots?
     * This is more of a heuristic score than a hard constraint, but we can have
     * hard limits here.
     */
    public boolean checkHardConstraints(TimetableDetail potentialAssignment) {
        // Wrapper for all hard checks
        return checkTeacherAvailability(
                potentialAssignment.getTeacher() != null ? potentialAssignment.getTeacher().getId() : null,
                potentialAssignment.getTimetable().getId(),
                potentialAssignment.getDayOfWeek(),
                potentialAssignment.getSlotIndex())
                && checkClassAvailability(
                        potentialAssignment.getClassRoom().getId(),
                        potentialAssignment.getTimetable().getId(),
                        potentialAssignment.getDayOfWeek(),
                        potentialAssignment.getSlotIndex());
    }
}
