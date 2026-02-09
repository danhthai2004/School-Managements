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

        // Clear existing details for this timetable to avoid duplicates if re-run
        timetableDetailRepository.deleteByTimetable(timetable);
        timetableDetailRepository.flush(); // Ensure deletion is committed

        // Initialize Context
        ScheduleContext context = new ScheduleContext();

        // Step 1: Fixed Activities (Chào cờ, Sinh hoạt lớp)
        scheduleFixedActivities(timetable, context);

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

    /**
     * Step 1: Schedule fixed activities for all classes.
     * NEW LOGIC (no more CC/SHL):
     * - HDTN: Saturday last period of MAIN session (slot 5 for morning, slot 9 for afternoon)
     * - GDTC: 2 consecutive slots in SECONDARY session (random day Mon-Fri)
     * - HDTN (additional): 2 consecutive slots in SECONDARY session (random day Mon-Fri, different from GDTC)
     */
    private void scheduleFixedActivities(Timetable timetable, ScheduleContext context) {
        log.info("Step 1: Scheduling fixed activities (HDTN on Saturday, GDTC/HDTN in secondary session)...");

        var allClasses = classRoomRepository.findAllBySchoolOrderByGradeAscNameAsc(timetable.getSchool());

        // Find HDTN and GDTC subjects
        Subject hdtnSubject = subjectRepository.findByCode("HDTN").orElse(null);
        Subject gdtcSubject = subjectRepository.findByCode("GDTC").orElse(null);

        if (hdtnSubject == null) {
            log.warn("Subject HDTN not found, skipping fixed HDTN scheduling");
        }
        if (gdtcSubject == null) {
            log.warn("Subject GDTC not found, skipping fixed GDTC scheduling");
        }

        // Days available for secondary session activities (Mon-Fri, not Saturday)
        DayOfWeek[] availableDays = {DayOfWeek.MONDAY, DayOfWeek.TUESDAY, DayOfWeek.WEDNESDAY, DayOfWeek.THURSDAY, DayOfWeek.FRIDAY};
        java.util.Random random = new java.util.Random();

        for (var classroom : allClasses) {
            if (!classroom.getAcademicYear().equals(timetable.getAcademicYear()))
                continue;

            // Determine session type (morning or afternoon main session)
            com.schoolmanagement.backend.domain.SessionType session = classroom.getSession();
            boolean isMorningMain = (session == null || session == com.schoolmanagement.backend.domain.SessionType.SANG);

            // ===== HDTN: Saturday last period of MAIN session =====
            // Saturday has only 4 periods, HDTN is the last one
            // Morning main: Saturday slot 4 (last of 4 morning slots)
            // Afternoon main: Saturday slot 9 (last afternoon slot)
            if (hdtnSubject != null) {
                int saturdaySlot = isMorningMain ? 4 : 9;
                createFixedDetail(timetable, classroom, hdtnSubject, DayOfWeek.SATURDAY, saturdaySlot, context);
                log.debug("Scheduled HDTN for {} on Saturday slot {}", classroom.getName(), saturdaySlot);
            }

            // Shuffle days for random selection
            java.util.List<DayOfWeek> shuffledDays = new java.util.ArrayList<>(java.util.Arrays.asList(availableDays));
            java.util.Collections.shuffle(shuffledDays, random);

            // ===== GDTC: 2 consecutive slots in SECONDARY session (random day) =====
            if (gdtcSubject != null) {
                int gdtcStartSlot = isMorningMain ? 6 : 1;
                DayOfWeek gdtcDay = shuffledDays.get(0); // First random day
                // Schedule 2 consecutive GDTC slots
                createFixedDetail(timetable, classroom, gdtcSubject, gdtcDay, gdtcStartSlot, context);
                createFixedDetail(timetable, classroom, gdtcSubject, gdtcDay, gdtcStartSlot + 1, context);
                log.debug("Scheduled GDTC for {} on {} slots {},{}", classroom.getName(), gdtcDay, gdtcStartSlot, gdtcStartSlot + 1);
            }

            // ===== HDTN (additional): 2 consecutive slots in SECONDARY session (different random day) =====
            if (hdtnSubject != null) {
                int hdtnStartSlot = isMorningMain ? 6 : 1;
                DayOfWeek hdtnDay = shuffledDays.get(1); // Second random day (different from GDTC)
                // Schedule 2 consecutive HDTN slots
                createFixedDetail(timetable, classroom, hdtnSubject, hdtnDay, hdtnStartSlot, context);
                createFixedDetail(timetable, classroom, hdtnSubject, hdtnDay, hdtnStartSlot + 1, context);
                log.debug("Scheduled HDTN for {} on {} slots {},{}", classroom.getName(), hdtnDay, hdtnStartSlot, hdtnStartSlot + 1);
            }
        }
    }

    /**
     * Create a fixed timetable detail that cannot be moved/swapped.
     */
    private void createFixedDetail(Timetable timetable, ClassRoom classroom,
            Subject subject, DayOfWeek day, int slotIndex, ScheduleContext context) {
        var detail = TimetableDetail.builder()
                .timetable(timetable)
                .classRoom(classroom)
                .subject(subject)
                .teacher(null) // Usually no specific teacher for activities
                .dayOfWeek(day)
                .slotIndex(slotIndex)
                .isFixed(true) // Mark as fixed - cannot be swapped
                .build();
        timetableDetailRepository.save(detail);

        // Mark context immediately
        context.markOccupied(classroom.getId(), null, day, slotIndex);
        log.debug("Fixed activity: {} for class {} on {} period {}",
                subject.getCode(), classroom.getName(), day, slotIndex);
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

            // Prioritize contiguous slots
            // Saturday has only 4 periods (T1-T4), with T4 reserved for HDTN
            // Other days have 5 periods (T1-T5)
            java.util.List<Integer> slots;
            if (day == DayOfWeek.SATURDAY) {
                slots = new java.util.ArrayList<>(java.util.List.of(1, 2, 3)); // T4 reserved for HDTN
            } else {
                slots = new java.util.ArrayList<>(java.util.List.of(1, 2, 3, 4, 5));
            }

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
        // High Freq handled separately
        // CC/SHL not scheduled at all
        // GDTC/HDTN already scheduled as fixed activities
        return java.util.List.of("TOAN", "VAN", "ANH", "CC", "SHL", "GDTC", "HDTN").contains(code);
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

                // Smart Fallback: If no teacher assigned to CD_SUBJECT, check usage of base
                // Subject teacher
                if (teacher == null && subject.getCode().startsWith("CD_")) {
                    String baseCode = subject.getCode().replace("CD_", "");
                    // Find base subject teacher for this class
                    var baseSubjectOpt = subjectRepository.findByCode(baseCode);
                    if (baseSubjectOpt.isPresent()) {
                        teacher = teacherAssignmentRepository.findByClassRoomAndSubject(classroom, baseSubjectOpt.get())
                                .map(TeacherAssignment::getTeacher).orElse(null);
                        if (teacher != null) {
                            log.info("Using implicit teacher {} from {} for specialized subject {}",
                                    teacher.getFullName(), baseCode, subject.getCode());
                        }
                    }
                }

                // Use the shared scheduling method
                scheduleSubject(timetable, classroom, subject, teacher, true, context);
            }
        }
    }
}
