package com.schoolmanagement.backend.service;

import com.schoolmanagement.backend.domain.entity.ClassRoom;
import com.schoolmanagement.backend.domain.entity.Subject;
import com.schoolmanagement.backend.domain.entity.TeacherAssignment;
import com.schoolmanagement.backend.domain.entity.Timetable;
import com.schoolmanagement.backend.domain.entity.TimetableDetail;
import com.schoolmanagement.backend.domain.entity.Teacher;
import com.schoolmanagement.backend.repo.ClassRoomRepository;
import com.schoolmanagement.backend.repo.SubjectRepository;
import com.schoolmanagement.backend.repo.TeacherAssignmentRepository;
import com.schoolmanagement.backend.repo.TimetableDetailRepository;
import com.schoolmanagement.backend.repo.TimetableRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AutoScheduleService {

    private final TimetableRepository timetableRepository;
    private final TimetableConstraintService constraintService;
    private final SubjectRepository subjectRepository;
    private final ClassRoomRepository classRoomRepository;
    private final TimetableDetailRepository timetableDetailRepository;
    private final TeacherAssignmentRepository teacherAssignmentRepository;

    /**
     * Entry point for the 5-step heuristic algorithm.
     * 
     * @param timetableId The ID of the timetable to generate.
     */
    // Helper class to track in-memory occupancy
    private static class ScheduleContext {
        private final java.util.Set<String> classOccupancy = new java.util.HashSet<>();
        private final java.util.Set<String> teacherOccupancy = new java.util.HashSet<>();

        void markOccupied(UUID classId, UUID teacherId, DayOfWeek day, int slot) {
            classOccupancy.add(classId + "-" + day + "-" + slot);
            if (teacherId != null) {
                teacherOccupancy.add(teacherId + "-" + day + "-" + slot);
            }
        }

        boolean isClassOccupied(UUID classId, DayOfWeek day, int slot) {
            return classOccupancy.contains(classId + "-" + day + "-" + slot);
        }

        boolean isTeacherOccupied(UUID teacherId, DayOfWeek day, int slot) {
            if (teacherId == null)
                return false;
            return teacherOccupancy.contains(teacherId + "-" + day + "-" + slot);
        }

        void freeSlot(UUID classId, UUID teacherId, DayOfWeek day, int slot) {
            classOccupancy.remove(classId + "-" + day + "-" + slot);
            if (teacherId != null) {
                teacherOccupancy.remove(teacherId + "-" + day + "-" + slot);
            }
        }
    }

    @Transactional
    public void generateTimetable(UUID timetableId) {
        log.info("Starting auto-generation for Timetable ID: {}", timetableId);

        Timetable timetable = timetableRepository.findById(timetableId)
                .orElseThrow(() -> new IllegalArgumentException("Timetable not found"));

        // Clear existing details for this timetable to avoid duplicates if re-run
        timetableDetailRepository.deleteByTimetable(timetable);
        timetableDetailRepository.flush(); // Ensure deletion is committed

        // Initialize Context
        ScheduleContext context = new ScheduleContext();

        // Step 2: High Frequency Subjects
        scheduleHighFrequencySubjects(timetable, context);

        // Step 3: Elective Subjects (Load Balancing)
        scheduleElectiveSubjects(timetable, context);

        // Step 4: Specialized Subjects (Blocks)
        scheduleSpecializedSubjects(timetable, context);

        // Step 5: Handling Deadlocks (Backtracking/Swapping - if needed)
        // ... implementation pending

        log.info("Auto-generation completed for Timetable ID: {}", timetableId);
    }

    private void scheduleHighFrequencySubjects(Timetable timetable, ScheduleContext context) {
        log.info("Step 2: Scheduling high frequency subjects (TOAN, VAN, ANH)...");

        String[] highFreqCodes = { "TOAN", "VAN", "ANH" };
        var allClasses = classRoomRepository.findAllBySchoolOrderByGradeAscNameAsc(timetable.getSchool());

        for (var classroom : allClasses) {
            if (!classroom.getAcademicYear().equals(timetable.getAcademicYear()))
                continue;

            for (String code : highFreqCodes) {
                var subjectOpt = subjectRepository.findByCode(code);
                if (subjectOpt.isEmpty())
                    continue;

                Subject subject = subjectOpt.get();
                var assignmentOpt = teacherAssignmentRepository.findByClassRoomAndSubject(classroom, subject);
                Teacher teacher = assignmentOpt
                        .map(TeacherAssignment::getTeacher).orElse(null);

                // Use the shared scheduling method with randomization enabled
                scheduleSubject(timetable, classroom, subject, teacher, true, context);
            }
        }
    }

    /**
     * Generic method to schedule a subject with constraints:
     * - Max 2 lessons/day if total >= 3, else Max 1/day.
     * - Avoid consecutive lessons (interleaving).
     * - Optional randomization of days/slots.
     */
    private void scheduleSubject(Timetable timetable, ClassRoom classroom, Subject subject,
            Teacher teacher, boolean randomize, ScheduleContext context) {
        int lessonsToAssign = subject.getTotalLessons();
        int assignedCount = (int) timetableDetailRepository.countByTimetableAndClassRoomAndSubject(
                timetable, classroom, subject);

        if (assignedCount >= lessonsToAssign)
            return;

        int limitPerDay = (lessonsToAssign >= 3) ? 2 : 1;

        java.util.List<DayOfWeek> days = new java.util.ArrayList<>(java.util.List.of(DayOfWeek.values()));
        if (randomize)
            java.util.Collections.shuffle(days);

        // Track local assignedToday for this specific function call
        java.util.Map<DayOfWeek, Integer> dailyCount = new java.util.HashMap<>();

        for (DayOfWeek day : days) {
            if (day == DayOfWeek.SUNDAY)
                continue;
            if (assignedCount >= lessonsToAssign)
                break;

            int assignedToday = dailyCount.getOrDefault(day, 0);
            if (assignedToday >= limitPerDay)
                continue;

            java.util.List<Integer> slots = new java.util.ArrayList<>(java.util.List.of(1, 2, 3, 4, 5));
            if (randomize)
                java.util.Collections.shuffle(slots);

            for (int slot : slots) {
                if (assignedCount >= lessonsToAssign)
                    break;
                if (assignedToday >= limitPerDay)
                    break;

                // 1. Check Context (In-Memory) - CRITICAL FIX
                if (context.isClassOccupied(classroom.getId(), day, slot))
                    continue;
                if (context.isTeacherOccupied(teacher != null ? teacher.getId() : null, day, slot))
                    continue;

                // 2. Assign
                createAndSaveDetail(timetable, classroom, subject, day, slot, teacher, context);
                assignedCount++;
                assignedToday++;
                dailyCount.put(day, assignedToday);
            }
        }

        if (assignedCount < lessonsToAssign) {
            log.warn("Could only assign {}/{} lessons for {} in Class {}. Attempting SWAP...",
                    assignedCount, lessonsToAssign, subject.getCode(), classroom.getName());

            // Step 5: Backtracking / Swap Logic
            attemptBacktrackingSwap(timetable, classroom, subject, teacher, context, assignedCount, lessonsToAssign);
        }
    }

    private void attemptBacktrackingSwap(Timetable timetable, ClassRoom classroom, Subject subjectArg,
            Teacher teacherArg,
            ScheduleContext context, int currentAssigned, int totalNeeded) {
        // Try to find N more slots
        int needed = totalNeeded - currentAssigned;

        java.util.List<DayOfWeek> days = java.util.Arrays.asList(DayOfWeek.values());
        java.util.Collections.shuffle(days); // Random search

        for (int i = 0; i < needed; i++) {
            boolean swapped = false;

            // Loop through all slots (even occupied ones)
            outerLoop: for (DayOfWeek day : days) {
                if (day == DayOfWeek.SUNDAY)
                    continue;
                for (int slot = 1; slot <= 5; slot++) {

                    if (!context.isClassOccupied(classroom.getId(), day, slot)) {
                        continue;
                    }

                    // So, slot is occupied by Class. Let's see who is there.
                    var existingDetailOpt = timetableDetailRepository
                            .findByTimetableAndClassRoomAndDayOfWeekAndSlotIndex(
                                    timetable, classroom, day, slot);

                    if (existingDetailOpt.isEmpty())
                        continue;

                    var existingDetail = existingDetailOpt.get();
                    if (existingDetail.isFixed())
                        continue;

                    if (context.isTeacherOccupied(teacherArg != null ? teacherArg.getId() : null, day, slot)) {
                        continue;
                    }

                    if (tryMoveExistingDetail(existingDetail, context)) {
                        createAndSaveDetail(timetable, classroom, subjectArg, day, slot, teacherArg, context);
                        swapped = true;
                        log.info("SWAP SUCCESS: Moved {} to make room for {}", existingDetail.getSubject().getCode(),
                                subjectArg.getCode());
                        break outerLoop;
                    }
                }
            }
        }
    }

    private boolean tryMoveExistingDetail(TimetableDetail detail, ScheduleContext context) {
        // Find a new slot for this detail
        ClassRoom classroom = detail.getClassRoom();
        Teacher teacher = detail.getTeacher();

        // Potential new slots
        for (DayOfWeek day : DayOfWeek.values()) {
            if (day == DayOfWeek.SUNDAY)
                continue;
            for (int slot = 1; slot <= 5; slot++) {
                // Skip the current slot (obviously)
                if (day == detail.getDayOfWeek() && slot == detail.getSlotIndex())
                    continue;

                // Check if new slot is valid for Valid B
                if (context.isClassOccupied(classroom.getId(), day, slot))
                    continue;
                if (context.isTeacherOccupied(teacher != null ? teacher.getId() : null, day, slot))
                    continue;

                // Found a valid empty slot!
                context.freeSlot(classroom.getId(), teacher != null ? teacher.getId() : null, detail.getDayOfWeek(),
                        detail.getSlotIndex());

                // 2. Update Detail in DB
                detail.setDayOfWeek(day);
                detail.setSlotIndex(slot);
                timetableDetailRepository.save(detail); // Update assignment

                // 3. Mark new occupancy
                context.markOccupied(classroom.getId(), teacher != null ? teacher.getId() : null, day, slot);

                return true;
            }
        }
        return false;
    }

    private void createAndSaveDetail(Timetable timetable, ClassRoom classroom,
            Subject subject, DayOfWeek day, int slotIndex, Teacher teacher,
            ScheduleContext context) {
        var detail = TimetableDetail.builder()
                .timetable(timetable)
                .classRoom(classroom)
                .subject(subject)
                .teacher(teacher)
                .dayOfWeek(day)
                .slotIndex(slotIndex)
                .isFixed(false) // Not fixed like CC/SHL
                .build();
        timetableDetailRepository.save(detail);

        // Mark context immediately
        context.markOccupied(classroom.getId(), teacher != null ? teacher.getId() : null, day, slotIndex);
    }

    private void scheduleElectiveSubjects(Timetable timetable, ScheduleContext context) {
        log.info("Step 3: Scheduling elective subjects (Physical, Chemical, Bio, History, Geo, etc.)...");

        var allClasses = classRoomRepository.findAllBySchoolOrderByGradeAscNameAsc(timetable.getSchool());
        // Cache compulsory subjects once
        var compulsorySubjects = subjectRepository
                .findByTypeAndActiveTrue(com.schoolmanagement.backend.domain.SubjectType.COMPULSORY);

        for (var classroom : allClasses) {
            if (!classroom.getAcademicYear().equals(timetable.getAcademicYear()))
                continue;

            // Gather all subjects to schedule for this class
            java.util.Set<Subject> subjectsToSchedule = new java.util.HashSet<>(compulsorySubjects);

            // Add combination subjects if any
            if (classroom.getCombination() != null) {
                subjectsToSchedule.addAll(classroom.getCombination().getSubjects());
            }

            for (Subject subject : subjectsToSchedule) {
                if (isSkippedSubject(subject.getCode()))
                    continue;

                // SPECIALIZED subjects are handled in next step
                if (subject.getType() == com.schoolmanagement.backend.domain.SubjectType.SPECIALIZED)
                    continue;

                // Lookup Teacher
                var assignmentOpt = teacherAssignmentRepository.findByClassRoomAndSubject(classroom, subject);
                Teacher teacher = assignmentOpt.map(TeacherAssignment::getTeacher).orElse(null);

                // Use the shared scheduling method with randomization enabled
                scheduleSubject(timetable, classroom, subject, teacher, true, context);
            }
        }
    }

    private boolean isSkippedSubject(String code) {
        // High Freq only
        return java.util.List.of("TOAN", "VAN", "ANH").contains(code);
    }

    private void scheduleSpecializedSubjects(Timetable timetable, ScheduleContext context) {
        log.info("Step 4: Scheduling specialized subjects (Chuyen de)...");

        var allClasses = classRoomRepository.findAllBySchoolOrderByGradeAscNameAsc(timetable.getSchool());
        // Fetch all specialized subjects
        var specializedSubjects = subjectRepository
                .findByTypeAndActiveTrue(com.schoolmanagement.backend.domain.SubjectType.SPECIALIZED);

        for (var classroom : allClasses) {
            if (!classroom.getAcademicYear().equals(timetable.getAcademicYear()))
                continue;

            if (classroom.getCombination() == null)
                continue;
            var stream = classroom.getCombination().getStream();
            if (stream == null)
                continue;

            for (Subject subject : specializedSubjects) {
                // Determine if this specialized subject belongs to the class stream
                // Assuming specialized subjects have a stream field that matches
                if (subject.getStream() != stream) {
                    continue;
                }

                Teacher teacher = teacherAssignmentRepository.findByClassRoomAndSubject(classroom, subject)
                        .map(TeacherAssignment::getTeacher).orElse(null);

                // Use the shared scheduling method
                scheduleSubject(timetable, classroom, subject, teacher, true, context);
            }
        }
    }
}
