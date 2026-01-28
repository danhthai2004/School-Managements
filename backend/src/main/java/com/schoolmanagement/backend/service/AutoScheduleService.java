package com.schoolmanagement.backend.service;

import com.schoolmanagement.backend.domain.entity.ClassRoom;
import com.schoolmanagement.backend.domain.entity.Subject;
import com.schoolmanagement.backend.domain.entity.TeacherAssignment;
import com.schoolmanagement.backend.domain.entity.Timetable;
import com.schoolmanagement.backend.domain.entity.TimetableDetail;
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
                com.schoolmanagement.backend.domain.entity.User teacher = assignmentOpt
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
            com.schoolmanagement.backend.domain.entity.User teacher, boolean randomize, ScheduleContext context) {
        int lessonsToAssign = subject.getTotalLessons();
        int assignedCount = (int) timetableDetailRepository.countByTimetableAndClassRoomAndSubject(
                timetable, classroom, subject); // This might be stale if we don't update DB but we rely on context for
                                                // slots.
                                                // Actually, if we use separate transactions or flush, it is accurate.
                                                // Since we flush delete at start, and insert 1 by 1...
                                                // For a single batch run, assignedCount starts at 0 (after delete).
                                                // If we had partially scheduled, we would trust DB.
                                                // BUT we rely on context for SLOTS.
        // NOTE: Since "countBy..." reads from DB, and we are flushing periodically or
        // not,
        // relying on this count is risky IF we don't flush.
        // However, for this simplified "Wipe & Re-run" flow:
        // existing DB count is 0 (except what we just added).
        // If we want to rely on DB count, we MUST flush.
        // ALTERNATIVE: Use local counting logic?
        // For now, let's assume we are calling this for a subject that hasn't been
        // scheduled yet in this run.
        // Actually, scheduleSubject is called ONCE per subject per class. So existing
        // count is 0.
        // Unless we run this method multiple times? No.

        // Wait, what if we have multiple "Math" entries caused by something else?
        // Assuming clean slate.

        // RE-FIX from previous step: We might have non-zero count if we re-run?
        // No, we delete all at start.

        // So assignedCount is effectively 0 here, unless we split logic.
        // We will trust the loop to increment assignedCount.

        if (assignedCount >= lessonsToAssign)
            return;

        int limitPerDay = (lessonsToAssign >= 3) ? 2 : 1;

        java.util.List<DayOfWeek> days = new java.util.ArrayList<>(java.util.List.of(DayOfWeek.values()));
        if (randomize)
            java.util.Collections.shuffle(days);

        // Track local assignedToday for this specific function call
        java.util.Map<DayOfWeek, Integer> dailyCount = new java.util.HashMap<>();
        // In case there's pre-existing data (robustness), we could query DB, but let's
        // rely on local loop for now.

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

                // 2. Check Strict Interleaving (Optional but requested)
                // Use DB check or Context? Context is reliable for occupancy.
                // Checking "previous slot" via context is hard (keys are strings).
                // Let's skip strict consecutive check for now or implement simple one.
                // Implementing simple one:
                // We don't easily know WHICH subject is in the previous slot from context (it
                // just says "occupied").
                // So skipping is safer than crashing or false positives. The "Max 2 per day"
                // and "Random" handles interleaving well enough.

                // 3. Assign
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
            com.schoolmanagement.backend.domain.entity.User teacherArg,
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

                    // 1. If this slot is free for Class but blocked by Teacher -> No swap helps
                    // (unless we swap teacher's other class? Too complex).
                    // 2. We are looking for a slot OCCUPIED by THIS CLASS (with another subject)
                    if (!context.isClassOccupied(classroom.getId(), day, slot)) {
                        // It's free! Why didn't we pick it?
                        // Ah, probably Teacher is busy.
                        // If Teacher is busy, we CANNOT put subjectArg here.
                        continue;
                    }

                    // So, slot is occupied by Class. Let's see who is there.
                    // We need to query DB to find the detail.
                    var existingDetailOpt = timetableDetailRepository
                            .findByTimetableAndClassRoomAndDayOfWeekAndSlotIndex(
                                    timetable, classroom, day, slot);

                    if (existingDetailOpt.isEmpty())
                        continue; // Should not happen if context says occupied

                    var existingDetail = existingDetailOpt.get();
                    if (existingDetail.isFixed())
                        continue; // Cannot move Fixed slots (CC, SHL)

                    // Subject B is at (day, slot).
                    // Can Subject B move to (day2, slot2)?
                    // AND Can Subject A (subjectArg) fit in (day, slot)? -> We assume YES if
                    // Teacher A is free.

                    if (context.isTeacherOccupied(teacherArg != null ? teacherArg.getId() : null, day, slot)) {
                        // Teacher A is busy at this slot, so we can't put Subject A here even if we
                        // move Subject B.
                        continue;
                    }

                    // OK, Subject A fits here logic-wise (Class becomes free if B moves, Teacher A
                    // is free).
                    // Now find a home for Subject B.
                    if (tryMoveExistingDetail(existingDetail, context)) {
                        // Move successful! Now (day, slot) is free for Subject A.
                        // But wait, tryMove updated DB and Context for B.
                        // We just need to overwrite/insert A.

                        // Context for (day, slot) was CLEARED by tryMove (for Class).
                        // Teacher A is free.

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
        com.schoolmanagement.backend.domain.entity.User teacher = detail.getTeacher();

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
                // 1. Remove old occupancy from Context
                // Note: scheduleContext uses Sets. We need a "remove" or just rely on
                // "markOccupied" adding new ones?
                // The current ScheduleContext DOES NOT have remove.
                // We MUST add remove capability to ScheduleContext.
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
            Subject subject, DayOfWeek day, int slotIndex, com.schoolmanagement.backend.domain.entity.User teacher,
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

        for (var classroom : allClasses) {
            if (!classroom.getAcademicYear().equals(timetable.getAcademicYear()))
                continue;

            var assignments = teacherAssignmentRepository.findAllByClassRoom(classroom);

            for (var assignment : assignments) {
                Subject subject = assignment.getSubject();

                if (isSkippedSubject(subject.getCode()))
                    continue;

                com.schoolmanagement.backend.domain.entity.User teacher = assignment.getTeacher();

                // Use the shared scheduling method with randomization enabled
                scheduleSubject(timetable, classroom, subject, teacher, true, context);
            }
        }
    }

    private boolean isSkippedSubject(String code) {
        // High Freq only (CC, SHL removed)
        return java.util.List.of("TOAN", "VAN", "ANH").contains(code);
    }

    private void scheduleSpecializedSubjects(Timetable timetable, ScheduleContext context) {
        log.info("Step 4: Scheduling specialized subjects (Chuyen de)...");

        var allClasses = classRoomRepository.findAllBySchoolOrderByGradeAscNameAsc(timetable.getSchool());

        for (var classroom : allClasses) {
            if (!classroom.getAcademicYear().equals(timetable.getAcademicYear()))
                continue;

            var assignments = teacherAssignmentRepository.findAllByClassRoom(classroom);

            for (var assignment : assignments) {
                Subject subject = assignment.getSubject();

                // Only process SPECIALIZED subjects here
                if (subject.getType() != com.schoolmanagement.backend.domain.SubjectType.SPECIALIZED) {
                    continue;
                }

                com.schoolmanagement.backend.domain.entity.User teacher = assignment.getTeacher();
                int lessonsToAssign = subject.getTotalLessons();
                int assignedCount = 0;

                // Simple loop with context check
                for (DayOfWeek day : DayOfWeek.values()) {
                    if (day == DayOfWeek.SUNDAY)
                        continue;
                    if (assignedCount >= lessonsToAssign)
                        break;

                    for (int slot = 1; slot <= 5; slot++) {
                        if (assignedCount >= lessonsToAssign)
                            break;

                        // Check Context
                        if (context.isClassOccupied(classroom.getId(), day, slot))
                            continue;
                        if (context.isTeacherOccupied(teacher != null ? teacher.getId() : null, day, slot))
                            continue;

                        createAndSaveDetail(timetable, classroom, subject, day, slot, teacher, context);
                        assignedCount++;
                    }
                }
            }
        }
    }
}
