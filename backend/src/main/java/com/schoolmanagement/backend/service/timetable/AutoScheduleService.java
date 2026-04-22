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
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class AutoScheduleService {

    // ─── Constants ──────────────────────────────────────────────────────────
    private static final int MIN_PERIODS_PER_DAY = 4;
    private static final int MAX_PERIODS_PER_DAY = 5;
    /** Subject codes that get special Step-1 treatment (afternoon / Saturday). */
    private static final Set<String> PRIORITY_CODES = Set.of("GDTC", "GDQP", "HDTN");
    /** Subject codes that get Step-2 high-frequency treatment. */
    private static final Set<String> HIGH_FREQ_CODES = Set.of("TOAN", "VAN", "ANH");
    /** Codes to never schedule (homeroom / self-study). */
    private static final Set<String> IGNORED_CODES = Set.of("CC", "SHL");

    // ─── Repositories ───────────────────────────────────────────────────────
    private final TimetableRepository timetableRepository;
    private final TimetableConstraintService constraintService;
    private final SubjectRepository subjectRepository;
    private final ClassRoomRepository classRoomRepository;
    private final TimetableDetailRepository timetableDetailRepository;
    private final TeacherAssignmentRepository teacherAssignmentRepository;

    // ═══════════════════════════════════════════════════════════════════════
    // In-memory occupancy tracker
    // ═══════════════════════════════════════════════════════════════════════
    private static class ScheduleContext {
        private final Set<String> classOccupancy = new HashSet<>();
        private final Set<String> teacherOccupancy = new HashSet<>();

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

    // ═══════════════════════════════════════════════════════════════════════
    // ENTRY POINT
    // ═══════════════════════════════════════════════════════════════════════
    @Transactional
    public void generateTimetable(UUID timetableId) {
        log.info("Starting auto-generation for Timetable ID: {}", timetableId);

        Timetable timetable = timetableRepository.findById(timetableId)
                .orElseThrow(() -> new IllegalArgumentException("Timetable not found"));

        // Clear old details
        timetableDetailRepository.deleteByTimetable(timetable);
        timetableDetailRepository.flush();

        ScheduleContext context = new ScheduleContext();

        // All classes of this academic year
        var allClasses = new ArrayList<>(
                classRoomRepository.findAllBySchoolOrderByGradeAscNameAsc(timetable.getSchool()).stream()
                        .filter(c -> c.getAcademicYear().equals(timetable.getSemester().getAcademicYear()))
                        .toList());

        // Step 1: Priority activities (GDTC, GDQP, HDTN) — afternoon / Saturday
        Collections.shuffle(allClasses);
        schedulePriorityActivities(timetable, allClasses, context);

        // Step 2: High-frequency subjects (TOAN, VAN, ANH) — spread across mornings
        Collections.shuffle(allClasses);
        scheduleHighFrequencySubjects(timetable, allClasses, context);

        // Step 3: All remaining subjects from the Combination
        Collections.shuffle(allClasses);
        scheduleRemainingSubjects(timetable, allClasses, context);

        // Step 4: Compaction — push lessons up, eliminate gaps
        compactTimetable(timetable, context);

        log.info("Auto-generation completed for Timetable ID: {}", timetableId);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // HELPER: Resolve teacher (supports CD_ fallback)
    // ═══════════════════════════════════════════════════════════════════════
    private Teacher getTeacherForSubject(ClassRoom classroom, Subject subject) {
        Teacher teacher = teacherAssignmentRepository
                .findFirstByClassRoomAndSubjectAndTeacherIsNotNull(classroom, subject)
                .map(TeacherAssignment::getTeacher).orElse(null);

        // Fallback for Specialized subjects (CD_XXX → base XXX teacher)
        if (teacher == null && subject.getCode() != null && subject.getCode().startsWith("CD_")) {
            String baseCode = subject.getCode().replace("CD_", "");
            var baseSubjectOpt = subjectRepository.findByCode(baseCode);
            if (baseSubjectOpt.isPresent()) {
                teacher = teacherAssignmentRepository
                        .findFirstByClassRoomAndSubjectAndTeacherIsNotNull(classroom, baseSubjectOpt.get())
                        .map(TeacherAssignment::getTeacher).orElse(null);
            }
        }
        return teacher;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // HELPER: Resolve required lessons per week
    // Priority: TeacherAssignment.lessonsPerWeek > Subject.totalLessons
    // ═══════════════════════════════════════════════════════════════════════
    private int getRequiredLessons(ClassRoom classroom, Subject subject) {
        return teacherAssignmentRepository.findFirstByClassRoomAndSubject(classroom, subject)
                .map(TeacherAssignment::getLessonsPerWeek)
                .filter(l -> l > 0)
                .orElse(subject.getTotalLessons() != null ? subject.getTotalLessons() : 0);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // HELPER: Get all subjects a class must study (from its Combination)
    // ═══════════════════════════════════════════════════════════════════════
    private Set<Subject> getSubjectsForClass(ClassRoom classroom) {
        Set<Subject> subjects = new HashSet<>();
        if (classroom.getCombination() != null && classroom.getCombination().getSubjects() != null) {
            subjects.addAll(classroom.getCombination().getSubjects());
        }
        return subjects;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 1: Priority activities (GDTC, GDQP → afternoon; HDTN → Sat)
    // ═══════════════════════════════════════════════════════════════════════
    private void schedulePriorityActivities(Timetable timetable, List<ClassRoom> allClasses,
            ScheduleContext context) {
        log.info("Step 1: Scheduling priority activities (GDTC, GDQP, HDTN)...");

        Subject hdtnSubject = subjectRepository.findByCode("HDTN").orElse(null);
        Subject gdtcSubject = subjectRepository.findByCode("GDTC").orElse(null);
        Subject gdqpSubject = subjectRepository.findByCode("GDQP").orElse(null);

        for (var classroom : allClasses) {
            Set<Subject> classSubjects = getSubjectsForClass(classroom);

            SessionType session = classroom.getSession();
            boolean isMorningMain = (session == null || session == SessionType.SANG);

            // HDTN → Saturday last period first, then fill remaining lessons
            if (hdtnSubject != null && classSubjects.contains(hdtnSubject)) {
                int saturdaySlot = isMorningMain ? 4 : 9;
                createPriorityDetail(timetable, classroom, hdtnSubject, DayOfWeek.SATURDAY, saturdaySlot, context);

                // HDTN may have more than 1 lesson/week (e.g. 3) — schedule the rest
                Teacher hdtnTeacher = getTeacherForSubject(classroom, hdtnSubject);
                scheduleSubjectWithPenalty(timetable, classroom, hdtnSubject, hdtnTeacher, context);
            }

            // GDTC & GDQP → Prefer afternoon (slots 6-10)
            if (gdtcSubject != null && classSubjects.contains(gdtcSubject)) {
                scheduleAfternoonPrioritySubject(timetable, classroom, gdtcSubject, context);
            }
            if (gdqpSubject != null && classSubjects.contains(gdqpSubject)) {
                scheduleAfternoonPrioritySubject(timetable, classroom, gdqpSubject, context);
            }
        }
    }

    /**
     * Tries to schedule a subject primarily in the afternoon (slots 6-10).
     * Falls back to penalty-based scheduling if no afternoon slots are available.
     */
    private void scheduleAfternoonPrioritySubject(Timetable timetable, ClassRoom classroom, Subject subject,
            ScheduleContext context) {
        if (subject == null)
            return;

        Teacher teacher = getTeacherForSubject(classroom, subject);
        int lessonsToAssign = getRequiredLessons(classroom, subject);
        int assigned = 0;

        DayOfWeek[] weekDays = { DayOfWeek.MONDAY, DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY,
                DayOfWeek.THURSDAY, DayOfWeek.FRIDAY };

        // Strategy: try 2 consecutive afternoon slots first
        for (DayOfWeek day : weekDays) {
            if (assigned >= lessonsToAssign)
                break;

            for (int slot = 6; slot <= 9; slot++) {
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

        // Fallback to penalty-based if still not fully assigned
        if (assigned < lessonsToAssign) {
            scheduleSubjectWithPenalty(timetable, classroom, subject, teacher, context);
        }
    }

    /** Create a priority timetable detail. */
    private void createPriorityDetail(Timetable timetable, ClassRoom classroom,
            Subject subject, DayOfWeek day, int slotIndex, ScheduleContext context) {
        Teacher teacher = getTeacherForSubject(classroom, subject);
        createAndSaveDetail(timetable, classroom, subject, day, slotIndex, teacher, context);
        log.debug("Priority activity: {} for class {} on {} period {}",
                subject.getCode(), classroom.getName(), day, slotIndex);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 2: High-frequency subjects (TOAN, VAN, ANH)
    // Only scheduled if the class's Combination includes them.
    // ═══════════════════════════════════════════════════════════════════════
    private void scheduleHighFrequencySubjects(Timetable timetable, List<ClassRoom> allClasses,
            ScheduleContext context) {
        log.info("Step 2: Scheduling high frequency subjects (TOAN, VAN, ANH)...");

        for (var classroom : allClasses) {
            Set<Subject> classSubjects = getSubjectsForClass(classroom);

            // Filter: only high-freq subjects that exist in this class's Combination
            List<Subject> subjects = classSubjects.stream()
                    .filter(s -> s.getCode() != null && HIGH_FREQ_CODES.contains(s.getCode()))
                    .sorted((a, b) -> getRequiredLessons(classroom, b) - getRequiredLessons(classroom, a))
                    .collect(Collectors.toList());

            for (Subject subject : subjects) {
                Teacher teacher = getTeacherForSubject(classroom, subject);
                scheduleSubjectWithPenalty(timetable, classroom, subject, teacher, context);
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 3: All remaining subjects from the Combination
    // Skips subjects already handled in Step 1 (PRIORITY) & Step 2 (HIGH_FREQ)
    // ═══════════════════════════════════════════════════════════════════════
    private void scheduleRemainingSubjects(Timetable timetable, List<ClassRoom> allClasses,
            ScheduleContext context) {
        log.info("Step 3: Scheduling remaining combination subjects...");

        for (var classroom : allClasses) {
            Set<Subject> classSubjects = getSubjectsForClass(classroom);

            // Sort by required lessons descending (heavier subjects first = more
            // constrained)
            List<Subject> subjects = new ArrayList<>(classSubjects);
            subjects.sort((a, b) -> getRequiredLessons(classroom, b) - getRequiredLessons(classroom, a));

            for (Subject subject : subjects) {
                String code = subject.getCode();
                if (code == null)
                    continue;

                // Skip subjects already handled in Step 1 or Step 2, and ignored codes
                if (PRIORITY_CODES.contains(code) || HIGH_FREQ_CODES.contains(code)
                        || IGNORED_CODES.contains(code)) {
                    continue;
                }

                Teacher teacher = getTeacherForSubject(classroom, subject);
                scheduleSubjectWithPenalty(timetable, classroom, subject, teacher, context);
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // CORE: Penalty-based scheduling with random sampling
    // ═══════════════════════════════════════════════════════════════════════
    /**
     * Enhanced scheduling with Soft Constraints (Penalty based).
     */
    private void scheduleSubjectWithPenalty(Timetable timetable, ClassRoom classroom, Subject subject,
            Teacher teacher, ScheduleContext context) {

        int totalNeeded = getRequiredLessons(classroom, subject);
        int alreadyAssigned = (int) timetableDetailRepository.countByTimetableAndClassRoomAndSubject(
                timetable, classroom, subject);
        int needed = totalNeeded - alreadyAssigned;

        if (needed <= 0)
            return;

        // Find all possible valid slots for this subject/teacher
        List<SlotCandidate> allValidSlots = findValidSlots(timetable, classroom, teacher, context);

        if (allValidSlots.isEmpty()) {
            log.warn("No valid slots found for {} in Class {}", subject.getCode(), classroom.getName());
            return;
        }

        // Sample 50 random combinations, pick the one with minimal penalty
        List<SlotCandidate> bestCombination = null;
        long minPenalty = Long.MAX_VALUE;

        int samples = 50;
        for (int i = 0; i < samples; i++) {
            Collections.shuffle(allValidSlots);
            if (allValidSlots.size() < needed)
                break;

            List<SlotCandidate> candidate = allValidSlots.subList(0, needed);
            long penalty = calculatePenalty(classroom, subject, candidate, timetable, context);

            if (penalty < minPenalty) {
                minPenalty = penalty;
                bestCombination = new ArrayList<>(candidate);
            }
            if (penalty == 0)
                break; // Perfect score
        }

        if (bestCombination != null) {
            for (SlotCandidate slot : bestCombination) {
                createAndSaveDetail(timetable, classroom, subject, slot.day, slot.slot, teacher, context);
            }
        }

        // Fallback to backtracking swap if still incomplete
        int finalAssigned = (int) timetableDetailRepository.countByTimetableAndClassRoomAndSubject(
                timetable, classroom, subject);
        if (finalAssigned < totalNeeded) {
            attemptBacktrackingSwap(timetable, classroom, subject, teacher, context, finalAssigned, totalNeeded);
        }
    }

    // ─── Slot candidate helper ──────────────────────────────────────────────
    private static class SlotCandidate {
        DayOfWeek day;
        int slot;

        SlotCandidate(DayOfWeek d, int s) {
            this.day = d;
            this.slot = s;
        }
    }

    private List<SlotCandidate> findValidSlots(Timetable timetable, ClassRoom classroom,
            Teacher teacher, ScheduleContext context) {
        List<SlotCandidate> list = new ArrayList<>();

        for (DayOfWeek day : DayOfWeek.values()) {
            if (day == DayOfWeek.SUNDAY)
                continue;

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

    // ═══════════════════════════════════════════════════════════════════════
    // PENALTY CALCULATION (soft constraints)
    // ═══════════════════════════════════════════════════════════════════════
    private long calculatePenalty(ClassRoom classroom, Subject subject, List<SlotCandidate> proposed,
            Timetable timetable, ScheduleContext context) {
        long penalty = 0;
        int totalLessons = getRequiredLessons(classroom, subject);
        boolean isMajor = totalLessons >= 3;
        SessionType classSession = classroom.getSession();
        String code = subject.getCode();

        Map<DayOfWeek, List<Integer>> daySlots = new HashMap<>();
        for (SlotCandidate s : proposed) {
            daySlots.computeIfAbsent(s.day, k -> new ArrayList<>()).add(s.slot);
        }

        // ── 1. Spreading & max 2 lessons/subject/day ────────────────────────
        for (DayOfWeek day : daySlots.keySet()) {
            List<Integer> slots = daySlots.get(day);
            int count = slots.size();

            // Hard penalty: more than 2 lessons of same subject in one day
            if (count > 2) {
                penalty += 10000 * (count - 2); // Effectively block this
            }
            // Soft penalty: 2 lessons of same subject in one day
            if (count > 1) {
                penalty += (isMajor ? 200 : 50) * (count - 1);
            }

            for (int slot : slots) {
                // MORNING PREFERENCE: Non-GDTC/GDQP subjects prefer morning (1-5)
                boolean isSpecialSubject = "GDTC".equals(code) || "GDQP".equals(code);
                if (!isSpecialSubject) {
                    if (slot > 5) {
                        penalty += 500;
                    }
                }

                // TOP-DOWN PREFERENCE: Prefer T1 > T2 > T3 ...
                penalty += slot * 10;
            }
        }

        // ── 2. Gap detection ────────────────────────────────────────────────
        for (DayOfWeek day : DayOfWeek.values()) {
            if (day == DayOfWeek.SUNDAY)
                continue;

            List<Integer> proposed4Day = daySlots.getOrDefault(day, Collections.emptyList());
            // Session 1 (morning 1-5)
            penalty += calculateSessionGapPenalty(classroom, day, 1, 5, proposed4Day, context);
            // Session 2 (afternoon 6-10)
            penalty += calculateSessionGapPenalty(classroom, day, 6, 10, proposed4Day, context);
        }

        // ── 3. Morning priority for major subjects ──────────────────────────
        if (isMajor && classSession == SessionType.SANG) {
            for (SlotCandidate s : proposed) {
                if (s.slot >= 4)
                    penalty += 20;
            }
        }

        return penalty;
    }

    private long calculateSessionGapPenalty(ClassRoom classroom, DayOfWeek day, int start, int end,
            List<Integer> proposedSlots, ScheduleContext context) {
        long gapPenalty = 0;
        List<Integer> occupied = new ArrayList<>();

        for (int s = start; s <= end; s++) {
            if (context.isClassOccupied(classroom.getId(), day, s) || proposedSlots.contains(s)) {
                occupied.add(s);
            }
        }

        if (occupied.size() <= 1) {
            if (!occupied.isEmpty() && occupied.get(0) != start) {
                gapPenalty += 500; // Penalty for starting late in session
            }
            return gapPenalty;
        }

        int min = occupied.get(0);
        int max = occupied.get(occupied.size() - 1);

        // LEADING GAP: penalty if session doesn't start at 'start'
        if (min > start) {
            gapPenalty += 500;
        }

        // INTERNAL GAP: penalty for holes between first and last occupied
        for (int s = min + 1; s < max; s++) {
            if (!context.isClassOccupied(classroom.getId(), day, s) && !proposedSlots.contains(s)) {
                gapPenalty += 300;
            }
        }

        return gapPenalty;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 4: Compaction — push lessons to earliest possible slots
    // ═══════════════════════════════════════════════════════════════════════
    private void compactTimetable(Timetable timetable, ScheduleContext context) {
        log.info("Step 4: Starting compaction pass to fill gaps and push lessons up...");
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
                    for (int slot = 2; slot <= 10; slot++) {
                        var detailOpt = timetableDetailRepository
                                .findByTimetableAndClassRoomAndDayOfWeekAndSlotIndex(timetable, classroom, day, slot);

                        if (detailOpt.isPresent()) {
                            var detail = detailOpt.get();
                            for (int targetSlot = 1; targetSlot < slot; targetSlot++) {
                                if (!context.isClassOccupied(classroom.getId(), day, targetSlot)) {
                                    Teacher teacher = detail.getTeacher();
                                    if (teacher == null
                                            || !context.isTeacherOccupied(teacher.getId(), day, targetSlot)) {
                                        // Valid move
                                        context.freeSlot(classroom.getId(),
                                                teacher != null ? teacher.getId() : null, day, slot);
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

    // ═══════════════════════════════════════════════════════════════════════
    // BACKTRACKING SWAP — last resort to fill missing lessons
    // ═══════════════════════════════════════════════════════════════════════
    private void attemptBacktrackingSwap(Timetable timetable, ClassRoom classroom, Subject subjectArg,
            Teacher teacherArg, ScheduleContext context, int currentAssigned, int totalNeeded) {
        int needed = totalNeeded - currentAssigned;

        List<DayOfWeek> days = Arrays.asList(DayOfWeek.values());
        Collections.shuffle(days);

        for (int i = 0; i < needed; i++) {
            outerLoop: for (DayOfWeek day : days) {
                if (day == DayOfWeek.SUNDAY)
                    continue;

                for (int slot = 1; slot <= 10; slot++) {
                    if (!context.isClassOccupied(classroom.getId(), day, slot))
                        continue;

                    var existingDetailOpt = timetableDetailRepository
                            .findByTimetableAndClassRoomAndDayOfWeekAndSlotIndex(timetable, classroom, day, slot);

                    if (existingDetailOpt.isEmpty())
                        continue;

                    var existingDetail = existingDetailOpt.get();
                    if (existingDetail.isFixed())
                        continue;

                    if (context.isTeacherOccupied(
                            teacherArg != null ? teacherArg.getId() : null, day, slot)) {
                        continue;
                    }

                    if (tryMoveExistingDetail(existingDetail, context)) {
                        createAndSaveDetail(timetable, classroom, subjectArg, day, slot, teacherArg, context);
                        log.info("SWAP SUCCESS: Moved {} to make room for {}",
                                existingDetail.getSubject().getCode(), subjectArg.getCode());
                        break outerLoop;
                    }
                }
            }
        }
    }

    private boolean tryMoveExistingDetail(TimetableDetail detail, ScheduleContext context) {
        ClassRoom classroom = detail.getClassRoom();
        Teacher teacher = detail.getTeacher();

        for (DayOfWeek day : DayOfWeek.values()) {
            if (day == DayOfWeek.SUNDAY)
                continue;

            int maxSlots = (day == DayOfWeek.SATURDAY) ? 4 : 10;
            for (int slot = 1; slot <= maxSlots; slot++) {
                if (day == detail.getDayOfWeek() && slot == detail.getSlotIndex())
                    continue;

                if (context.isClassOccupied(classroom.getId(), day, slot))
                    continue;
                if (context.isTeacherOccupied(teacher != null ? teacher.getId() : null, day, slot))
                    continue;

                // Found a valid empty slot — perform the move
                context.freeSlot(classroom.getId(), teacher != null ? teacher.getId() : null,
                        detail.getDayOfWeek(), detail.getSlotIndex());

                detail.setDayOfWeek(day);
                detail.setSlotIndex(slot);
                timetableDetailRepository.save(detail);

                context.markOccupied(classroom.getId(), teacher != null ? teacher.getId() : null, day, slot);
                return true;
            }
        }
        return false;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // DB-SAFE detail creation (double-checks DB before inserting)
    // ═══════════════════════════════════════════════════════════════════════
    private void createAndSaveDetail(Timetable timetable, ClassRoom classroom,
            Subject subject, DayOfWeek day, int slotIndex, Teacher teacher,
            ScheduleContext context) {

        // Hard Constraint: no duplicate class+day+slot
        if (timetableDetailRepository.existsByTimetableAndClassRoomAndDayOfWeekAndSlotIndex(
                timetable, classroom, day, slotIndex)) {
            log.warn("SKIP: Class {} already has a lesson at {} slot {} (DB check)",
                    classroom.getName(), day, slotIndex);
            context.markOccupied(classroom.getId(), teacher != null ? teacher.getId() : null, day, slotIndex);
            return;
        }

        // Hard Constraint: no teacher collision
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
                .isFixed(false)
                .build();
        timetableDetailRepository.save(detail);

        // Mark context immediately
        context.markOccupied(classroom.getId(), teacher != null ? teacher.getId() : null, day, slotIndex);
    }
}
