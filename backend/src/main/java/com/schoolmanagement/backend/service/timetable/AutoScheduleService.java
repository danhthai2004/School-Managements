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
    // In-memory occupancy tracker (no DB queries for slot checks)
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
    // In-memory assignment cache (replaces per-subject/per-class DB queries)
    // ═══════════════════════════════════════════════════════════════════════
    /** Key: "classId-subjectId" → TeacherAssignment (may have null teacher) */
    private static class AssignmentCache {
        // classId+subjectId → assignment (for lessonsPerWeek & teacher lookup)
        private final Map<String, TeacherAssignment> byClassAndSubject = new HashMap<>();
        // subjectCode → Subject entity (for CD_ fallback)
        private final Map<String, Subject> subjectByCode = new HashMap<>();

        void load(List<TeacherAssignment> all, List<Subject> subjects) {
            for (TeacherAssignment ta : all) {
                if (ta.getClassRoom() != null && ta.getSubject() != null) {
                    byClassAndSubject.put(key(ta.getClassRoom().getId(), ta.getSubject().getId()), ta);
                }
            }
            for (Subject s : subjects) {
                if (s.getCode() != null)
                    subjectByCode.put(s.getCode(), s);
            }
        }

        private static String key(UUID classId, UUID subjectId) {
            return classId + "-" + subjectId;
        }

        Teacher getTeacher(UUID classId, Subject subject) {
            TeacherAssignment ta = byClassAndSubject.get(key(classId, subject.getId()));
            if (ta != null && ta.getTeacher() != null)
                return ta.getTeacher();

            // Fallback CD_ prefix
            if (subject.getCode() != null && subject.getCode().startsWith("CD_")) {
                String baseCode = subject.getCode().replace("CD_", "");
                Subject base = subjectByCode.get(baseCode);
                if (base != null) {
                    TeacherAssignment baseTa = byClassAndSubject.get(key(classId, base.getId()));
                    if (baseTa != null)
                        return baseTa.getTeacher();
                }
            }
            return null;
        }

        int getLessonsPerWeek(UUID classId, Subject subject) {
            TeacherAssignment ta = byClassAndSubject.get(key(classId, subject.getId()));
            if (ta != null && ta.getLessonsPerWeek() > 0)
                return ta.getLessonsPerWeek();
            return subject.getTotalLessons() != null ? subject.getTotalLessons() : 0;
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // In-memory count tracker (replaces COUNT queries during scheduling)
    // ═══════════════════════════════════════════════════════════════════════
    private static class AssignedCountTracker {
        private final Map<String, Integer> counts = new HashMap<>();

        private static String key(UUID classId, UUID subjectId) {
            return classId + "-" + subjectId;
        }

        void increment(UUID classId, UUID subjectId) {
            counts.merge(key(classId, subjectId), 1, Integer::sum);
        }

        int get(UUID classId, UUID subjectId) {
            return counts.getOrDefault(key(classId, subjectId), 0);
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

        // ── Pre-load all data in bulk (3 queries total) ──────────────────
        List<TeacherAssignment> allAssignments = teacherAssignmentRepository
                .findAllBySchoolWithDetails(timetable.getSchool());
        List<Subject> allSubjects = subjectRepository.findAll();

        AssignmentCache cache = new AssignmentCache();
        cache.load(allAssignments, allSubjects);

        AssignedCountTracker countTracker = new AssignedCountTracker();
        ScheduleContext context = new ScheduleContext();

        // All classes of this academic year
        var allClasses = new ArrayList<>(
                classRoomRepository.findAllBySchoolOrderByGradeAscNameAsc(timetable.getSchool()).stream()
                        .filter(c -> c.getAcademicYear().equals(timetable.getSemester().getAcademicYear()))
                        .toList());

        // Step 1: Priority activities (GDTC, GDQP, HDTN) — afternoon / Saturday
        Collections.shuffle(allClasses);
        schedulePriorityActivities(timetable, allClasses, context, cache, countTracker);

        // Step 2: High-frequency subjects (TOAN, VAN, ANH) — spread across mornings
        Collections.shuffle(allClasses);
        scheduleHighFrequencySubjects(timetable, allClasses, context, cache, countTracker);

        // Step 3: All remaining subjects from the Combination
        Collections.shuffle(allClasses);
        scheduleRemainingSubjects(timetable, allClasses, context, cache, countTracker);

        // Step 4: Compaction — push lessons up, eliminate gaps (all in-memory)
        compactTimetable(timetable, context);

        log.info("Auto-generation completed for Timetable ID: {}", timetableId);
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
            ScheduleContext context, AssignmentCache cache, AssignedCountTracker countTracker) {
        log.info("Step 1: Scheduling priority activities (GDTC, GDQP, HDTN)...");

        // Subject lookup from cache (already loaded)
        Subject hdtnSubject = cache.subjectByCode.get("HDTN");
        Subject gdtcSubject = cache.subjectByCode.get("GDTC");
        Subject gdqpSubject = cache.subjectByCode.get("GDQP");

        for (var classroom : allClasses) {
            Set<Subject> classSubjects = getSubjectsForClass(classroom);

            SessionType session = classroom.getSession();
            boolean isMorningMain = (session == null || session == SessionType.SANG);

            // HDTN → Saturday last period first, then fill remaining lessons
            if (hdtnSubject != null && classSubjects.contains(hdtnSubject)) {
                int saturdaySlot = isMorningMain ? 4 : 9;
                createAndSaveDetail(timetable, classroom, hdtnSubject, DayOfWeek.SATURDAY, saturdaySlot,
                        cache.getTeacher(classroom.getId(), hdtnSubject), context, countTracker);

                // HDTN may have more than 1 lesson/week (e.g. 3) — schedule the rest
                Teacher hdtnTeacher = cache.getTeacher(classroom.getId(), hdtnSubject);
                scheduleSubjectWithPenalty(timetable, classroom, hdtnSubject, hdtnTeacher, context, cache,
                        countTracker);
            }

            // GDTC & GDQP → Prefer afternoon (slots 6-10)
            if (gdtcSubject != null && classSubjects.contains(gdtcSubject)) {
                scheduleAfternoonPrioritySubject(timetable, classroom, gdtcSubject, context, cache, countTracker);
            }
            if (gdqpSubject != null && classSubjects.contains(gdqpSubject)) {
                scheduleAfternoonPrioritySubject(timetable, classroom, gdqpSubject, context, cache, countTracker);
            }
        }
    }

    /**
     * Tries to schedule a subject primarily in the afternoon (slots 6-10).
     * Falls back to penalty-based scheduling if no afternoon slots are available.
     */
    private void scheduleAfternoonPrioritySubject(Timetable timetable, ClassRoom classroom, Subject subject,
            ScheduleContext context, AssignmentCache cache, AssignedCountTracker countTracker) {
        if (subject == null)
            return;

        Teacher teacher = cache.getTeacher(classroom.getId(), subject);
        int lessonsToAssign = cache.getLessonsPerWeek(classroom.getId(), subject);
        int assigned = countTracker.get(classroom.getId(), subject.getId());

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

                        createAndSaveDetail(timetable, classroom, subject, day, slot, teacher, context, countTracker);
                        createAndSaveDetail(timetable, classroom, subject, day, slot + 1, teacher, context,
                                countTracker);
                        assigned += 2;
                        break;
                    }
                } else if (lessonsToAssign - assigned == 1) {
                    if (!context.isClassOccupied(classroom.getId(), day, slot) &&
                            !context.isTeacherOccupied(teacher != null ? teacher.getId() : null, day, slot)) {
                        createAndSaveDetail(timetable, classroom, subject, day, slot, teacher, context, countTracker);
                        assigned++;
                        break;
                    }
                }
            }
        }

        // Fallback to penalty-based if still not fully assigned
        if (assigned < lessonsToAssign) {
            scheduleSubjectWithPenalty(timetable, classroom, subject, teacher, context, cache, countTracker);
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 2: High-frequency subjects (TOAN, VAN, ANH)
    // Only scheduled if the class's Combination includes them.
    // ═══════════════════════════════════════════════════════════════════════
    private void scheduleHighFrequencySubjects(Timetable timetable, List<ClassRoom> allClasses,
            ScheduleContext context, AssignmentCache cache, AssignedCountTracker countTracker) {
        log.info("Step 2: Scheduling high frequency subjects (TOAN, VAN, ANH)...");

        for (var classroom : allClasses) {
            Set<Subject> classSubjects = getSubjectsForClass(classroom);

            // Filter: only high-freq subjects that exist in this class's Combination
            List<Subject> subjects = classSubjects.stream()
                    .filter(s -> s.getCode() != null && HIGH_FREQ_CODES.contains(s.getCode()))
                    .sorted((a, b) -> cache.getLessonsPerWeek(classroom.getId(), b)
                            - cache.getLessonsPerWeek(classroom.getId(), a))
                    .collect(Collectors.toList());

            for (Subject subject : subjects) {
                Teacher teacher = cache.getTeacher(classroom.getId(), subject);
                scheduleSubjectWithPenalty(timetable, classroom, subject, teacher, context, cache, countTracker);
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 3: All remaining subjects from the Combination
    // Skips subjects already handled in Step 1 (PRIORITY) & Step 2 (HIGH_FREQ)
    // ═══════════════════════════════════════════════════════════════════════
    private void scheduleRemainingSubjects(Timetable timetable, List<ClassRoom> allClasses,
            ScheduleContext context, AssignmentCache cache, AssignedCountTracker countTracker) {
        log.info("Step 3: Scheduling remaining combination subjects...");

        for (var classroom : allClasses) {
            Set<Subject> classSubjects = getSubjectsForClass(classroom);

            // Sort by required lessons descending (heavier subjects first = more
            // constrained)
            List<Subject> subjects = new ArrayList<>(classSubjects);
            subjects.sort((a, b) -> cache.getLessonsPerWeek(classroom.getId(), b)
                    - cache.getLessonsPerWeek(classroom.getId(), a));

            for (Subject subject : subjects) {
                String code = subject.getCode();
                if (code == null)
                    continue;

                // Skip subjects already handled in Step 1 or Step 2, and ignored codes
                if (PRIORITY_CODES.contains(code) || HIGH_FREQ_CODES.contains(code)
                        || IGNORED_CODES.contains(code)) {
                    continue;
                }

                Teacher teacher = cache.getTeacher(classroom.getId(), subject);
                scheduleSubjectWithPenalty(timetable, classroom, subject, teacher, context, cache, countTracker);
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // CORE: Penalty-based scheduling with random sampling
    // ═══════════════════════════════════════════════════════════════════════
    private void scheduleSubjectWithPenalty(Timetable timetable, ClassRoom classroom, Subject subject,
            Teacher teacher, ScheduleContext context, AssignmentCache cache,
            AssignedCountTracker countTracker) {

        int totalNeeded = cache.getLessonsPerWeek(classroom.getId(), subject);
        // Use in-memory counter — no DB query
        int alreadyAssigned = countTracker.get(classroom.getId(), subject.getId());
        int needed = totalNeeded - alreadyAssigned;

        if (needed <= 0)
            return;

        // Find all possible valid slots for this subject/teacher (all in-memory)
        List<SlotCandidate> allValidSlots = findValidSlots(classroom, teacher, context);

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
            long penalty = calculatePenalty(classroom, subject, candidate, cache, context);

            if (penalty < minPenalty) {
                minPenalty = penalty;
                bestCombination = new ArrayList<>(candidate);
            }
            if (penalty == 0)
                break; // Perfect score
        }

        if (bestCombination != null) {
            for (SlotCandidate slot : bestCombination) {
                createAndSaveDetail(timetable, classroom, subject, slot.day, slot.slot, teacher, context, countTracker);
            }
        }

        // Fallback to backtracking swap if still incomplete
        int finalAssigned = countTracker.get(classroom.getId(), subject.getId());
        if (finalAssigned < totalNeeded) {
            attemptBacktrackingSwap(timetable, classroom, subject, teacher, context, countTracker, finalAssigned,
                    totalNeeded);
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

    /** All-in-memory valid slot enumeration — zero DB queries */
    private List<SlotCandidate> findValidSlots(ClassRoom classroom, Teacher teacher, ScheduleContext context) {
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
    // PENALTY CALCULATION (soft constraints) — all in-memory lookups
    // ═══════════════════════════════════════════════════════════════════════
    private long calculatePenalty(ClassRoom classroom, Subject subject, List<SlotCandidate> proposed,
            AssignmentCache cache, ScheduleContext context) {
        long penalty = 0;
        int totalLessons = cache.getLessonsPerWeek(classroom.getId(), subject);
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
                penalty += 10000 * (count - 2);
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
                gapPenalty += 500;
            }
            return gapPenalty;
        }

        int min = occupied.get(0);
        int max = occupied.get(occupied.size() - 1);

        if (min > start) {
            gapPenalty += 500;
        }
        for (int s = min + 1; s < max; s++) {
            if (!context.isClassOccupied(classroom.getId(), day, s) && !proposedSlots.contains(s)) {
                gapPenalty += 300;
            }
        }

        return gapPenalty;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // STEP 4: Compaction — load all details into memory, sort and re-slot
    // Eliminates O(N×Days×Slots) individual findBy DB queries
    // ═══════════════════════════════════════════════════════════════════════
    private void compactTimetable(Timetable timetable, ScheduleContext context) {
        log.info("Step 4: Starting compaction pass to fill gaps and push lessons up...");
        var allClasses = classRoomRepository.findAllBySchoolOrderByGradeAscNameAsc(timetable.getSchool());

        // Load ALL TimetableDetails for this timetable in ONE query
        List<TimetableDetail> allDetails = timetableDetailRepository.findAllByTimetable(timetable);

        // Group by classId → day → slotIndex for O(1) lookup
        // Map: classId → Map<"DAY-slot", TimetableDetail>
        Map<UUID, Map<String, TimetableDetail>> byClassDaySlot = new HashMap<>();
        for (TimetableDetail td : allDetails) {
            byClassDaySlot
                    .computeIfAbsent(td.getClassRoom().getId(), k -> new HashMap<>())
                    .put(td.getDayOfWeek() + "-" + td.getSlotIndex(), td);
        }

        for (var classroom : allClasses) {
            if (!classroom.getAcademicYear().equals(timetable.getSemester().getAcademicYear()))
                continue;

            Map<String, TimetableDetail> slotMap = byClassDaySlot.getOrDefault(classroom.getId(), new HashMap<>());

            for (DayOfWeek day : DayOfWeek.values()) {
                if (day == DayOfWeek.SUNDAY)
                    continue;

                boolean changed = true;
                while (changed) {
                    changed = false;
                    for (int slot = 2; slot <= 10; slot++) {
                        String slotKey = day + "-" + slot;
                        TimetableDetail detail = slotMap.get(slotKey);
                        if (detail == null)
                            continue;

                        for (int targetSlot = 1; targetSlot < slot; targetSlot++) {
                            String targetKey = day + "-" + targetSlot;
                            if (slotMap.containsKey(targetKey))
                                continue;
                            if (context.isClassOccupied(classroom.getId(), day, targetSlot))
                                continue;

                            Teacher teacher = detail.getTeacher();
                            if (teacher != null && context.isTeacherOccupied(teacher.getId(), day, targetSlot))
                                continue;

                            // Valid move — persist immediately and flush so DB sees
                            // the vacated slot before the next move tries to use it.
                            context.freeSlot(classroom.getId(), teacher != null ? teacher.getId() : null, day, slot);
                            slotMap.remove(slotKey);

                            detail.setSlotIndex(targetSlot);
                            timetableDetailRepository.save(detail);
                            timetableDetailRepository.flush();

                            slotMap.put(targetKey, detail);
                            context.markOccupied(classroom.getId(), teacher != null ? teacher.getId() : null, day,
                                    targetSlot);

                            changed = true;
                            log.debug("Compacted: Moved {} from slot {} to {} for class {} on {}",
                                    detail.getSubject().getCode(), slot, targetSlot, classroom.getName(), day);
                            break;
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
            Teacher teacherArg, ScheduleContext context, AssignedCountTracker countTracker,
            int currentAssigned, int totalNeeded) {
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
                        createAndSaveDetail(timetable, classroom, subjectArg, day, slot, teacherArg, context,
                                countTracker);
                        log.debug("SWAP SUCCESS: Moved {} to make room for {}",
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
    // DB-SAFE detail creation — context-first, then one DB check, then insert
    // ═══════════════════════════════════════════════════════════════════════
    private void createAndSaveDetail(Timetable timetable, ClassRoom classroom,
            Subject subject, DayOfWeek day, int slotIndex, Teacher teacher,
            ScheduleContext context, AssignedCountTracker countTracker) {

        // Fast context check first (in-memory, no DB)
        if (context.isClassOccupied(classroom.getId(), day, slotIndex)) {
            log.debug("SKIP (context): Class {} already has a lesson at {} slot {}",
                    classroom.getName(), day, slotIndex);
            return;
        }
        if (teacher != null && context.isTeacherOccupied(teacher.getId(), day, slotIndex)) {
            log.debug("SKIP (context): Teacher {} already teaches at {} slot {}",
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
        countTracker.increment(classroom.getId(), subject.getId());
    }
}
