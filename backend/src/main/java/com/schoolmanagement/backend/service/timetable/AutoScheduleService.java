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

        // Clear existing details for this timetable to avoid duplicates if re-run
        timetableDetailRepository.deleteByTimetable(timetable);
        timetableDetailRepository.flush(); // Ensure deletion is committed

        // Initialize Context
        ScheduleContext context = new ScheduleContext();

        // Step 1: Priority Activities (GDTC, GDQP, HDTN)
        schedulePriorityActivities(timetable, context);

        // Step 2: High Frequency Subjects
        scheduleHighFrequencySubjects(timetable, context);

        // Step 3: Elective Subjects (Load Balancing)
        scheduleElectiveSubjects(timetable, context);

        // Step 4: Specialized Subjects (Blocks)
        scheduleSpecializedSubjects(timetable, context);

        // Step 5: Handling Deadlocks (Backtracking/Swapping)
        // Implemented within scheduleSubject via attemptBacktrackingSwap

        log.info("Auto-generation completed for Timetable ID: {}", timetableId);
    }

    /**
     * Step 1: Schedule priority activities for all classes.
     * Logic:
     * - GDTC & GDQP: Prefer slots 6-10 (Afternoon session)
     * - HDTN: Saturday last period (slot 4/9)
     */
    private void schedulePriorityActivities(Timetable timetable, ScheduleContext context) {
        log.info("Step 1: Scheduling priority activities (GDTC, GDQP, HDTN)...");

        var allClasses = classRoomRepository.findAllBySchoolOrderByGradeAscNameAsc(timetable.getSchool());

        // Find priority subjects
        Subject hdtnSubject = subjectRepository.findByCode("HDTN").orElse(null);
        Subject gdtcSubject = subjectRepository.findByCode("GDTC").orElse(null);
        Subject gdqpSubject = subjectRepository.findByCode("GDQP").orElse(null);

        for (var classroom : allClasses) {
            if (!classroom.getAcademicYear().equals(timetable.getSemester().getAcademicYear()))
                continue;

            // Determine session type
            com.schoolmanagement.backend.domain.exam.SessionType session = classroom.getSession();
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
            scheduleSubject(timetable, classroom, subject, teacher, true, context);
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

    private void scheduleHighFrequencySubjects(Timetable timetable, ScheduleContext context) {
        log.info("Step 2: Scheduling high frequency subjects (TOAN, VAN, ANH)...");

        String[] highFreqCodes = { "TOAN", "VAN", "ANH" };
        var allClasses = classRoomRepository.findAllBySchoolOrderByGradeAscNameAsc(timetable.getSchool());

        for (var classroom : allClasses) {
            if (!classroom.getAcademicYear().equals(timetable.getSemester().getAcademicYear()))
                continue;

            for (String code : highFreqCodes) {
                var subjectOpt = subjectRepository.findByCode(code);
                if (subjectOpt.isEmpty())
                    continue;

                Subject subject = subjectOpt.get();
                Teacher teacher = teacherAssignmentRepository
                        .findFirstByClassRoomAndSubjectAndTeacherIsNotNull(classroom, subject)
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
            // Saturday has only 4 periods (T1-T4), with T4 reserved for HDTN if not already
            // assigned
            // Other days have 10 slots (T1-T10)
            java.util.List<Integer> slots = new java.util.ArrayList<>();
            if (day == DayOfWeek.SATURDAY) {
                slots.addAll(java.util.List.of(1, 2, 3));
            } else {
                slots.addAll(java.util.List.of(1, 2, 3, 4, 5, 6, 7, 8, 9, 10));
            }

            for (int slot : slots) {
                if (assignedCount >= lessonsToAssign)
                    break;
                if (assignedToday >= limitPerDay)
                    break;

                // 1. Check Context (In-Memory)
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

    private void scheduleElectiveSubjects(Timetable timetable, ScheduleContext context) {
        log.info("Step 3: Scheduling elective subjects...");

        var allClasses = classRoomRepository.findAllBySchoolOrderByGradeAscNameAsc(timetable.getSchool());
        var compulsorySubjects = subjectRepository
                .findByTypeAndActiveTrue(com.schoolmanagement.backend.domain.classes.SubjectType.COMPULSORY);

        for (var classroom : allClasses) {
            if (!classroom.getAcademicYear().equals(timetable.getSemester().getAcademicYear()))
                continue;

            java.util.Set<Subject> subjectsToSchedule = new java.util.HashSet<>(compulsorySubjects);

            if (classroom.getCombination() != null) {
                subjectsToSchedule.addAll(classroom.getCombination().getSubjects());
            }

            for (Subject subject : subjectsToSchedule) {
                if (isSkippedSubject(subject.getCode()))
                    continue;

                if (subject.getType() == com.schoolmanagement.backend.domain.classes.SubjectType.SPECIALIZED)
                    continue;

                Teacher teacher = teacherAssignmentRepository
                        .findFirstByClassRoomAndSubjectAndTeacherIsNotNull(classroom, subject)
                        .map(TeacherAssignment::getTeacher).orElse(null);

                scheduleSubject(timetable, classroom, subject, teacher, true, context);
            }
        }
    }

    private boolean isSkippedSubject(String code) {
        // High Freq handled separately
        // GDTC/HDTN/GDQP already handled in step 1
        // CC/SHL explicitly ignored
        return java.util.List.of("TOAN", "VAN", "ANH", "CC", "SHL", "GDTC", "HDTN", "GDQP").contains(code);
    }

    private void scheduleSpecializedSubjects(Timetable timetable, ScheduleContext context) {
        log.info("Step 4: Scheduling specialized subjects (Chuyen de)...");

        var allClasses = classRoomRepository.findAllBySchoolOrderByGradeAscNameAsc(timetable.getSchool());
        var specializedSubjects = subjectRepository
                .findByTypeAndActiveTrue(com.schoolmanagement.backend.domain.classes.SubjectType.SPECIALIZED);

        for (var classroom : allClasses) {
            if (!classroom.getAcademicYear().equals(timetable.getSemester().getAcademicYear()))
                continue;

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

                scheduleSubject(timetable, classroom, subject, teacher, true, context);
            }
        }
    }
}
