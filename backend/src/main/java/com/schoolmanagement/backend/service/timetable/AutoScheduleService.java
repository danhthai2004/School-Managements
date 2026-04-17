package com.schoolmanagement.backend.service.timetable;

import com.schoolmanagement.backend.domain.exam.SessionType;

import com.schoolmanagement.backend.domain.entity.classes.ClassRoom;
import com.schoolmanagement.backend.domain.entity.classes.Subject;
import com.schoolmanagement.backend.domain.entity.teacher.TeacherAssignment;
import com.schoolmanagement.backend.domain.entity.timetable.Timetable;
import com.schoolmanagement.backend.domain.entity.timetable.TimetableDetail;
import com.schoolmanagement.backend.domain.entity.teacher.Teacher;
import com.schoolmanagement.backend.repo.classes.ClassRoomRepository;
import com.schoolmanagement.backend.repo.classes.SubjectRepository;
import com.schoolmanagement.backend.repo.teacher.TeacherAssignmentRepository;
import com.schoolmanagement.backend.repo.timetable.TimetableDetailRepository;
import com.schoolmanagement.backend.repo.timetable.TimetableRepository;
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

    // Constants for timetable constraints
    private static final int MIN_PERIODS_PER_DAY = 4; // Each day should have at least 4 periods
    private static final int MAX_PERIODS_PER_DAY = 5; // Maximum 5 periods per day

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

        // Clear existing details for this timetable
        timetableDetailRepository.deleteByTimetable(timetable);
        timetableDetailRepository.flush();

        // Initialize Context
        ScheduleContext context = new ScheduleContext();

        // Get all relevant classes and shuffle them for fairness
        var allClasses = new java.util.ArrayList<>(
                classRoomRepository.findAllBySchoolOrderByGradeAscNameAsc(timetable.getSchool()).stream()
                        .filter(c -> c.getAcademicYear().equals(timetable.getSemester().getAcademicYear()))
                        .toList());

        // Step 1: Priority Activities (GDTC, GDQP, HDTN)
        java.util.Collections.shuffle(allClasses);
        schedulePriorityActivities(timetable, allClasses, context);

        // Step 2: High Frequency Subjects (TOAN, VAN, ANH)
        java.util.Collections.shuffle(allClasses);
        scheduleHighFrequencySubjects(timetable, allClasses, context);

        // Step 3: Elective Subjects
        java.util.Collections.shuffle(allClasses);
        scheduleElectiveSubjects(timetable, allClasses, context);

        // Step 4: Specialized Subjects
        java.util.Collections.shuffle(allClasses);
        scheduleSpecializedSubjects(timetable, allClasses, context);

        // Step 5: Compaction Pass (Push lessons up to fill gaps)
        compactTimetable(timetable, context);

        log.info("Auto-generation completed for Timetable ID: {}", timetableId);
    }

    /**
     * Step 1: Schedule priority activities for all classes.
     * Logic:
     * - GDTC & GDQP: Prefer slots 6-10 (Afternoon session)
     * - HDTN: Saturday last period (slot 4/9)
     */
    private void schedulePriorityActivities(Timetable timetable, java.util.List<ClassRoom> allClasses,
            ScheduleContext context) {
        log.info("Step 1: Scheduling priority activities (GDTC, GDQP, HDTN)...");

        // Find priority subjects
        Subject hdtnSubject = subjectRepository.findByCode("HDTN").orElse(null);
        Subject gdtcSubject = subjectRepository.findByCode("GDTC").orElse(null);
        Subject gdqpSubject = subjectRepository.findByCode("GDQP").orElse(null);

        for (var classroom : allClasses) {

            // Determine session type
            SessionType session = classroom.getSession();
            boolean isMorningMain = (session == null || session == SessionType.SANG);

            // 1. HDTN: Saturday last period (not strictly afternoon, but follows Saturday
            // logic)
            if (hdtnSubject != null) {
                int saturdaySlot = isMorningMain ? 4 : 9;
                createPriorityDetail(timetable, classroom, hdtnSubject, DayOfWeek.SATURDAY, saturdaySlot, context);
            }

            // 2. GDTC & GDQP: Prefer Afternoon (slots 6-10)
            scheduleAfternoonPrioritySubject(timetable, classroom, gdtcSubject, context);
            scheduleAfternoonPrioritySubject(timetable, classroom, gdqpSubject, context);
        }
    }

    /**
     * Tries to schedule a subject primarily in the afternoon (slots 6-10).
     * Falls back to morning if no afternoon slots are available.
     */
    private void scheduleAfternoonPrioritySubject(Timetable timetable, ClassRoom classroom, Subject subject,
            ScheduleContext context) {
        if (subject == null)
            return;

        Teacher teacher = teacherAssignmentRepository
                .findFirstByClassRoomAndSubjectAndTeacherIsNotNull(classroom, subject)
                .map(TeacherAssignment::getTeacher).orElse(null);

        int lessonsToAssign = subject.getTotalLessons();
        int assigned = 0;

        // Try Afternoon first (Mon-Fri)
        DayOfWeek[] weekDays = { DayOfWeek.MONDAY, DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY, DayOfWeek.THURSDAY,
                DayOfWeek.FRIDAY };

        // Strategy: 2 consecutive slots in afternoon
        for (DayOfWeek day : weekDays) {
            if (assigned >= lessonsToAssign)
                break;

            for (int slot = 6; slot <= 9; slot++) { // slots 6,7,8,9 (to allow 2 consecutive)
                if (lessonsToAssign - assigned >= 2) {
                    if (!context.isClassOccupied(classroom.getId(), day, slot) &&
                            !context.isClassOccupied(classroom.getId(), day, slot + 1) &&
                            !context.isTeacherOccupied(teacher != null ? teacher.getId() : null, day, slot) &&
                            !context.isTeacherOccupied(teacher != null ? teacher.getId() : null, day, slot + 1)) {

                        createAndSaveDetail(timetable, classroom, subject, day, slot, teacher, context);
                        createAndSaveDetail(timetable, classroom, subject, day, slot + 1, teacher, context);
                        assigned += 2;
                        break;
                    }
                } else if (lessonsToAssign - assigned == 1) {
                    if (!context.isClassOccupied(classroom.getId(), day, slot) &&
                            !context.isTeacherOccupied(teacher != null ? teacher.getId() : null, day, slot)) {
                        createAndSaveDetail(timetable, classroom, subject, day, slot, teacher, context);
                        assigned++;
                        break;
                    }
                }
            }
        }

        // Fallback to any slot if still not fully assigned
        if (assigned < lessonsToAssign) {
            scheduleSubjectWithPenalty(timetable, classroom, subject, teacher, context);
        }
    }

    /**
     * Create a priority timetable detail (NOT FIXED anymore).
     */
    private void createPriorityDetail(Timetable timetable, ClassRoom classroom,
            Subject subject, DayOfWeek day, int slotIndex, ScheduleContext context) {

        Teacher teacher = teacherAssignmentRepository
                .findFirstByClassRoomAndSubjectAndTeacherIsNotNull(classroom, subject)
                .map(TeacherAssignment::getTeacher).orElse(null);

        createAndSaveDetail(timetable, classroom, subject, day, slotIndex, teacher, context);
        log.debug("Priority activity: {} for class {} on {} period {}",
                subject.getCode(), classroom.getName(), day, slotIndex);
    }

    private void scheduleHighFrequencySubjects(Timetable timetable, java.util.List<ClassRoom> allClasses,
            ScheduleContext context) {
        log.info("Step 2: Scheduling high frequency subjects (TOAN, VAN, ANH)...");

        String[] highFreqCodes = { "TOAN", "VAN", "ANH" };

        for (var classroom : allClasses) {
            java.util.List<Subject> subjects = new java.util.ArrayList<>();
            for (String code : highFreqCodes) {
                subjectRepository.findByCode(code).ifPresent(subjects::add);
            }

            // Sort by total lessons descending
            subjects.sort((a, b) -> b.getTotalLessons() - a.getTotalLessons());

            for (Subject subject : subjects) {
                Teacher teacher = teacherAssignmentRepository.findByClassRoomAndSubject(classroom, subject)
                        .map(TeacherAssignment::getTeacher).orElse(null);

                scheduleSubjectWithPenalty(timetable, classroom, subject, teacher, context);
            }
        }
    }

    /**
     * Enhanced scheduling with Soft Constraints (Penalty based).
     */
    private void scheduleSubjectWithPenalty(Timetable timetable, ClassRoom classroom, Subject subject,
            Teacher teacher, ScheduleContext context) {

        int totalNeeded = subject.getTotalLessons();
        int alreadyAssigned = (int) timetableDetailRepository.countByTimetableAndClassRoomAndSubject(timetable,
                classroom, subject);
        int needed = totalNeeded - alreadyAssigned;

        if (needed <= 0)
            return;

        // Find all possible valid slots for this subject/teacher
        java.util.List<SlotCandidate> allValidSlots = findValidSlots(timetable, classroom, teacher, context);

        if (allValidSlots.isEmpty()) {
            log.warn("No valid slots found for {} in Class {}", subject.getCode(), classroom.getName());
            return;
        }

        // Try to pick the best 'needed' slots using a simple greedy approach with
        // penalty lookahead
        // or just try several random combinations and pick the best.

        java.util.List<SlotCandidate> bestCombination = null;
        long minPenalty = Long.MAX_VALUE;

        // Sample 20 random combinations of 'needed' slots
        int samples = 50;
        for (int i = 0; i < samples; i++) {
            java.util.Collections.shuffle(allValidSlots);
            if (allValidSlots.size() < needed)
                break;

            java.util.List<SlotCandidate> candidate = allValidSlots.subList(0, needed);
            long penalty = calculatePenalty(classroom, subject, candidate, timetable, context);

            if (penalty < minPenalty) {
                minPenalty = penalty;
                bestCombination = new java.util.ArrayList<>(candidate);
            }
            if (penalty == 0)
                break; // Perfect score
        }

        if (bestCombination != null) {
            for (SlotCandidate slot : bestCombination) {
                createAndSaveDetail(timetable, classroom, subject, slot.day, slot.slot, teacher, context);
            }
        }

        // Fallback to backtracking if still incomplete
        int finalAssigned = (int) timetableDetailRepository.countByTimetableAndClassRoomAndSubject(timetable, classroom,
                subject);
        if (finalAssigned < totalNeeded) {
            attemptBacktrackingSwap(timetable, classroom, subject, teacher, context, finalAssigned, totalNeeded);
        }
    }

    private static class SlotCandidate {
        DayOfWeek day;
        int slot;

        SlotCandidate(DayOfWeek d, int s) {
            this.day = d;
            this.slot = s;
        }
    }

    private java.util.List<SlotCandidate> findValidSlots(Timetable timetable, ClassRoom classroom, Teacher teacher,
            ScheduleContext context) {
        java.util.List<SlotCandidate> list = new java.util.ArrayList<>();
        SessionType classSession = classroom.getSession();

        for (DayOfWeek day : DayOfWeek.values()) {
            if (day == DayOfWeek.SUNDAY)
                continue;

            // Limit slots to 10. Saturday is usually only morning (1-5)
            int max = (day == DayOfWeek.SATURDAY) ? 5 : 10;
            for (int slot = 1; slot <= max; slot++) {
                if (context.isClassOccupied(classroom.getId(), day, slot))
                    continue;
                if (context.isTeacherOccupied(teacher != null ? teacher.getId() : null, day, slot))
                    continue;

                list.add(new SlotCandidate(day, slot));
            }
        }
        return list;
    }

    private long calculatePenalty(ClassRoom classroom, Subject subject, java.util.List<SlotCandidate> proposed,
            Timetable timetable, ScheduleContext context) {
        long penalty = 0;
        int totalLessons = subject.getTotalLessons();
        boolean isMajor = totalLessons >= 3;
        SessionType classSession = classroom.getSession();

        java.util.Map<DayOfWeek, java.util.List<Integer>> daySlots = new java.util.HashMap<>();
        for (SlotCandidate s : proposed) {
            daySlots.computeIfAbsent(s.day, k -> new java.util.ArrayList<>()).add(s.slot);
        }

        // 1. Spreading & Session Conflict
        for (DayOfWeek day : daySlots.keySet()) {
            java.util.List<Integer> slots = daySlots.get(day);
            int count = slots.size();

            // Penalty for multiple lessons of same subject in one day
            if (count > 1) {
                // If it's 2 on one day, and total is 3 or 4, that's okay but not ideal
                penalty += (isMajor ? 200 : 50) * (count - 1);
            }

            for (int slot : slots) {
                // GLOBAL MORNING PREFERENCE: Prefer morning (1-5) even if no ca sang/chieu
                // Exception: GDTC and GDQP often study in the afternoon
                boolean isSpecialSubject = subject.getCode().equals("GDTC") || subject.getCode().equals("GDQP");
                if (!isSpecialSubject) {
                    if (slot > 5) {
                        penalty += 500; // Prefer morning
                    }
                }

                // TOP-DOWN PREFERENCE: Prefer T1 > T2 > T3 ...
                penalty += slot * 10;
            }
        }

        // 2. Gap Detection (Simplified: check if slots in 'proposed' create gaps with
        // 'context')
        for (DayOfWeek day : DayOfWeek.values()) {
            if (day == DayOfWeek.SUNDAY)
                continue;

            // Check session 1 (1-5) or session 2 (6-10)
            penalty += calculateSessionGapPenalty(classroom, day, 1, 5,
                    daySlots.getOrDefault(day, java.util.Collections.emptyList()), context);
            penalty += calculateSessionGapPenalty(classroom, day, 6, 10,
                    daySlots.getOrDefault(day, java.util.Collections.emptyList()), context);
        }

        // 3. Morning Priority for Major (Even if class is CHIEU? No, only if SANG)
        if (isMajor && classSession == SessionType.SANG) {
            for (SlotCandidate s : proposed) {
                if (s.slot >= 4)
                    penalty += 20; // Prefer earlier slots T1, T2, T3
            }
        }

        return penalty;
    }

    /**
     * Final pass to eliminate gaps and push lessons to the earliest possible slots.
     */
    private void compactTimetable(Timetable timetable, ScheduleContext context) {
        log.info("Starting compaction pass to fill gaps and push lessons up...");
        var allClasses = classRoomRepository.findAllBySchoolOrderByGradeAscNameAsc(timetable.getSchool());

        for (var classroom : allClasses) {
            if (!classroom.getAcademicYear().equals(timetable.getSemester().getAcademicYear()))
                continue;

            for (DayOfWeek day : DayOfWeek.values()) {
                if (day == DayOfWeek.SUNDAY)
                    continue;

                boolean changed = true;
                while (changed) {
                    changed = false;
                    // Try to push lessons from slot 2-10 up to an earlier empty slot
                    for (int slot = 2; slot <= 10; slot++) {
                        // If current slot is occupied
                        var detailOpt = timetableDetailRepository.findByTimetableAndClassRoomAndDayOfWeekAndSlotIndex(
                                timetable, classroom, day, slot);

                        if (detailOpt.isPresent()) {
                            var detail = detailOpt.get();
                            // Try to find the earliest empty slot before this one
                            for (int targetSlot = 1; targetSlot < slot; targetSlot++) {
                                // Target slot must be empty for CLASS and TEACHER must be free at target
                                if (!context.isClassOccupied(classroom.getId(), day, targetSlot)) {
                                    Teacher teacher = detail.getTeacher();
                                    if (teacher == null
                                            || !context.isTeacherOccupied(teacher.getId(), day, targetSlot)) {
                                        // Valid move!
                                        context.freeSlot(classroom.getId(), teacher != null ? teacher.getId() : null,
                                                day, slot);

                                        detail.setSlotIndex(targetSlot);
                                        timetableDetailRepository.save(detail);

                                        context.markOccupied(classroom.getId(),
                                                teacher != null ? teacher.getId() : null, day, targetSlot);
                                        changed = true;
                                        log.debug("Compacted: Moved {} from {} to {} for class {}",
                                                detail.getSubject().getCode(), slot, targetSlot, classroom.getName());
                                        break;
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        timetableDetailRepository.flush();
    }

    private long calculateSessionGapPenalty(ClassRoom classroom, DayOfWeek day, int start, int end,
            java.util.List<Integer> proposedSlots, ScheduleContext context) {
        long gapPenalty = 0;
        java.util.List<Integer> occupied = new java.util.ArrayList<>();

        for (int s = start; s <= end; s++) {
            if (context.isClassOccupied(classroom.getId(), day, s) || proposedSlots.contains(s)) {
                occupied.add(s);
            }
        }

        if (occupied.size() <= 1) {
            // If there's only 1 lesson and it's NOT at the start of session (T1 or T6), add
            // penalty
            if (!occupied.isEmpty() && occupied.get(0) != start) {
                gapPenalty += 500; // Penalty for starting late in the session
            }
            return gapPenalty;
        }

        // Find if there's an empty slot between the first and last occupied slots
        int min = occupied.get(0);
        int max = occupied.get(occupied.size() - 1);

        // LEADING GAP: Penalty if session doesn't start at 'start'
        if (min > start) {
            gapPenalty += 500;
        }

        for (int s = min + 1; s < max; s++) {
            if (!context.isClassOccupied(classroom.getId(), day, s) && !proposedSlots.contains(s)) {
                gapPenalty += 300; // High penalty for gaps within a session
            }
        }

        return gapPenalty;
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

                // Check all 10 slots
                for (int slot = 1; slot <= 10; slot++) {

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
                        continue; // Should be none now but safety check

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

            int maxSlots = (day == DayOfWeek.SATURDAY) ? 4 : 10;
            for (int slot = 1; slot <= maxSlots; slot++) {
                // Skip the current slot
                if (day == detail.getDayOfWeek() && slot == detail.getSlotIndex())
                    continue;

                // Check if new slot is valid
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
                timetableDetailRepository.save(detail);

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

        // Safety check: verify DB doesn't already have a detail for this class+day+slot
        if (timetableDetailRepository.existsByTimetableAndClassRoomAndDayOfWeekAndSlotIndex(
                timetable, classroom, day, slotIndex)) {
            log.warn("SKIP: Class {} already has a lesson at {} slot {} (DB check)",
                    classroom.getName(), day, slotIndex);
            context.markOccupied(classroom.getId(), teacher != null ? teacher.getId() : null, day, slotIndex);
            return;
        }

        // Safety check: verify teacher isn't already teaching another class at this
        // slot
        if (teacher != null && timetableDetailRepository.existsByTimetableAndTeacherAndDayOfWeekAndSlotIndex(
                timetable, teacher, day, slotIndex)) {
            log.warn("SKIP: Teacher {} already teaches at {} slot {} (DB check)",
                    teacher.getFullName(), day, slotIndex);
            return;
        }

        var detail = TimetableDetail.builder()
                .timetable(timetable)
                .classRoom(classroom)
                .subject(subject)
                .teacher(teacher)
                .dayOfWeek(day)
                .slotIndex(slotIndex)
                .isFixed(false) // Never fixed now
                .build();
        timetableDetailRepository.save(detail);

        // Mark context immediately
        context.markOccupied(classroom.getId(), teacher != null ? teacher.getId() : null, day, slotIndex);
    }

    private void scheduleElectiveSubjects(Timetable timetable, java.util.List<ClassRoom> allClasses,
            ScheduleContext context) {
        log.info("Step 3: Scheduling elective subjects...");

        var compulsorySubjects = subjectRepository
                .findByTypeAndActiveTrue(SubjectType.COMPULSORY);

        for (var classroom : allClasses) {

            java.util.Set<Subject> subjectsToSchedule = new java.util.HashSet<>(compulsorySubjects);

            if (classroom.getCombination() != null) {
                subjectsToSchedule.addAll(classroom.getCombination().getSubjects());
            }

            // Order subjects by total lessons descending
            java.util.List<Subject> subjects = new java.util.ArrayList<>(subjectsToSchedule);
            subjects.sort((a, b) -> b.getTotalLessons() - a.getTotalLessons());

            for (Subject subject : subjects) {
                if (isSkippedSubject(subject.getCode()))
                    continue;

                if (subject.getType() == SubjectType.SPECIALIZED)
                    continue;

                Teacher teacher = teacherAssignmentRepository
                        .findFirstByClassRoomAndSubjectAndTeacherIsNotNull(classroom, subject)
                        .map(TeacherAssignment::getTeacher).orElse(null);

                scheduleSubjectWithPenalty(timetable, classroom, subject, teacher, context);
            }
        }
    }

    private boolean isSkippedSubject(String code) {
        // High Freq handled separately
        // GDTC/HDTN/GDQP already handled in step 1
        // CC/SHL explicitly ignored
        return java.util.List.of("TOAN", "VAN", "ANH", "CC", "SHL", "GDTC", "HDTN", "GDQP").contains(code);
    }

    private void scheduleSpecializedSubjects(Timetable timetable, java.util.List<ClassRoom> allClasses,
            ScheduleContext context) {
        log.info("Step 4: Scheduling specialized subjects (Chuyen de)...");

        var specializedSubjects = subjectRepository
                .findByTypeAndActiveTrue(SubjectType.SPECIALIZED);

        for (var classroom : allClasses) {

            if (classroom.getCombination() == null)
                continue;
            var stream = classroom.getCombination().getStream();
            if (stream == null)
                continue;

            for (Subject subject : specializedSubjects) {
                if (subject.getStream() != stream) {
                    continue;
                }

                Teacher teacher = teacherAssignmentRepository
                        .findFirstByClassRoomAndSubjectAndTeacherIsNotNull(classroom, subject)
                        .map(TeacherAssignment::getTeacher).orElse(null);

                if (teacher == null && subject.getCode().startsWith("CD_")) {
                    String baseCode = subject.getCode().replace("CD_", "");
                    var baseSubjectOpt = subjectRepository.findByCode(baseCode);
                    if (baseSubjectOpt.isPresent()) {
                        teacher = teacherAssignmentRepository
                                .findFirstByClassRoomAndSubjectAndTeacherIsNotNull(classroom, baseSubjectOpt.get())
                                .map(TeacherAssignment::getTeacher).orElse(null);
                    }
                }

                scheduleSubjectWithPenalty(timetable, classroom, subject, teacher, context);
            }
        }
    }
}
