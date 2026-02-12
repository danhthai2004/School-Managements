package com.schoolmanagement.backend.service;

import com.schoolmanagement.backend.domain.ClassDepartment;
import com.schoolmanagement.backend.domain.ExamStatus;
import com.schoolmanagement.backend.domain.ExamType;
import com.schoolmanagement.backend.domain.StreamType;
import com.schoolmanagement.backend.domain.SubjectType;
import com.schoolmanagement.backend.domain.entity.*;
import com.schoolmanagement.backend.dto.ExamScheduleGenerateRequest;
import com.schoolmanagement.backend.dto.ExamScheduleViewDto;
import com.schoolmanagement.backend.exception.ApiException;
import com.schoolmanagement.backend.repo.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ExamScheduleService {

    private final ExamScheduleRepository examScheduleRepo;
    private final ClassRoomRepository classRoomRepo;
    private final SubjectRepository subjectRepo;
    
    // Exam duration constants (in minutes)
    private static final int MAJOR_SUBJECT_DURATION = 60; // 1 hour for major subjects
    private static final int MINOR_SUBJECT_DURATION = 45; // 45 minutes for minor subjects
    private static final int BREAK_BETWEEN_EXAMS = 15; // 15 minutes break
    
    // Time slots for exams
    private static final LocalTime MORNING_START = LocalTime.of(7, 30);
    private static final LocalTime MORNING_END = LocalTime.of(11, 30);
    private static final LocalTime AFTERNOON_START = LocalTime.of(13, 30);
    private static final LocalTime AFTERNOON_END = LocalTime.of(17, 0);
    
    // Major subjects that require centralized exam rooms by grade
    private static final Set<String> MAJOR_SUBJECTS = Set.of(
            "toán", "toán học",
            "ngữ văn", "văn",
            "tiếng anh", "anh văn", "ngoại ngữ",
            "vật lý", "lý",
            "hóa học", "hóa"
    );
    
    // Exam room prefixes for major subjects
    private static final String[] EXAM_ROOMS = {"P101", "P102", "P103", "P201", "P202", "P203", "P301", "P302", "P303", "P401", "P402", "P403"};

    /**
     * Generate exam schedules for selected subjects and grades.
     * Major subjects (Toán, Văn, Anh, Lý, Hóa) are scheduled by grade with random room assignments.
     * Other subjects are scheduled in their classrooms.
     * NO TIME OVERLAP within the same grade.
     */
    @Transactional
    public List<ExamScheduleViewDto> generateExamSchedule(
            School school,
            ExamScheduleGenerateRequest request,
            User createdBy) {
        
        log.info("Generating exam schedule for school: {}, grades: {}, subjects: {}", 
                school.getName(), request.grades(), request.subjectIds());
        
        // Get all subjects
        List<Subject> subjects = subjectRepo.findAllById(request.subjectIds());
        if (subjects.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Không tìm thấy môn học nào.");
        }
        
        // Get all classrooms for selected grades
        List<ClassRoom> classRooms = classRoomRepo.findBySchoolAndGradeIn(school, request.grades());
        if (classRooms.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Không có lớp học nào trong các khối đã chọn.");
        }
        
        // Group classrooms by grade
        Map<Integer, List<ClassRoom>> classRoomsByGrade = classRooms.stream()
                .collect(Collectors.groupingBy(ClassRoom::getGrade));
        
        // Delete existing exam schedules for this period (to regenerate)
        deleteExistingSchedules(school, request.examType(), request.academicYear(), request.semester());
        
        // Generate schedule
        List<ExamSchedule> schedules = new ArrayList<>();
        
        // Separate major and minor subjects
        List<Subject> majorSubjects = new ArrayList<>();
        List<Subject> minorSubjects = new ArrayList<>();
        
        for (Subject subject : subjects) {
            if (isMajorSubject(subject)) {
                majorSubjects.add(subject);
            } else {
                minorSubjects.add(subject);
            }
        }
        
        // Shuffle subjects for random order
        Collections.shuffle(majorSubjects);
        Collections.shuffle(minorSubjects);
        
        // Track time slots used PER GRADE to avoid conflicts
        // Key: grade number, Value: list of used time slots
        Map<Integer, List<TimeSlot>> usedSlotsByGrade = new HashMap<>();
        for (Integer grade : request.grades()) {
            usedSlotsByGrade.put(grade, new ArrayList<>());
        }
        
        // Process major subjects first - one exam per grade with room assignment
        for (Subject subject : majorSubjects) {
            for (Integer grade : request.grades()) {
                List<ClassRoom> gradeClassRooms = classRoomsByGrade.get(grade);
                if (gradeClassRooms == null || gradeClassRooms.isEmpty()) continue;
                
                // Filter classrooms that should take this subject's exam
                List<ClassRoom> eligibleClassRooms = filterEligibleClassRooms(gradeClassRooms, subject);
                if (eligibleClassRooms.isEmpty()) continue;
                
                // Find available slot for this grade (no overlap with other subjects)
                TimeSlot slot = findAvailableSlotForGrade(
                        request.startDate(), 
                        request.endDate(), 
                        usedSlotsByGrade.get(grade), 
                        MAJOR_SUBJECT_DURATION
                );
                
                if (slot == null) {
                    log.warn("Could not find slot for major subject: {} grade: {}", subject.getName(), grade);
                    continue;
                }
                
                // Create exam for each eligible classroom with random room assignment
                List<String> shuffledRooms = new ArrayList<>(Arrays.asList(EXAM_ROOMS));
                Collections.shuffle(shuffledRooms);
                int roomIndex = 0;
                
                for (ClassRoom classRoom : eligibleClassRooms) {
                    String examRoom = shuffledRooms.get(roomIndex % shuffledRooms.size());
                    roomIndex++;
                    
                    ExamSchedule exam = ExamSchedule.builder()
                            .classRoom(classRoom)
                            .subject(subject)
                            .examType(request.examType())
                            .examDate(slot.date)
                            .startTime(slot.startTime)
                            .duration(MAJOR_SUBJECT_DURATION)
                            .roomNumber(examRoom)
                            .status(ExamStatus.UPCOMING)
                            .note("Thi tập trung tại phòng " + examRoom)
                            .academicYear(request.academicYear())
                            .semester(request.semester())
                            .school(school)
                            .build();
                    
                    schedules.add(exam);
                }
                
                // Mark slot as used for this grade
                usedSlotsByGrade.get(grade).add(slot);
                log.info("Scheduled {} for grade {} ({} classes) at {} {}", 
                        subject.getName(), grade, eligibleClassRooms.size(), slot.date, slot.startTime);
            }
        }
        
        // Process minor subjects - exam in classroom (also check for grade conflicts)
        for (Subject subject : minorSubjects) {
            boolean isElective = isElectiveSubject(subject);
            int duration = isElective ? MINOR_SUBJECT_DURATION : MINOR_SUBJECT_DURATION;
            String note = isElective ? "Thời gian tùy giáo viên" : "Thi tại lớp";
            
            for (Integer grade : request.grades()) {
                List<ClassRoom> gradeClassRooms = classRoomsByGrade.get(grade);
                if (gradeClassRooms == null || gradeClassRooms.isEmpty()) continue;
                
                // Filter classrooms that should take this subject's exam
                List<ClassRoom> eligibleClassRooms = filterEligibleClassRooms(gradeClassRooms, subject);
                if (eligibleClassRooms.isEmpty()) continue;
                
                // Find available slot for this grade
                TimeSlot slot = findAvailableSlotForGrade(
                        request.startDate(), 
                        request.endDate(), 
                        usedSlotsByGrade.get(grade), 
                        duration
                );
                
                if (slot == null) {
                    log.warn("Could not find slot for minor subject: {} grade: {}", subject.getName(), grade);
                    continue;
                }
                
                // Create exam for each eligible classroom in this grade
                for (ClassRoom classRoom : eligibleClassRooms) {
                    ExamSchedule exam = ExamSchedule.builder()
                            .classRoom(classRoom)
                            .subject(subject)
                            .examType(request.examType())
                            .examDate(slot.date)
                            .startTime(slot.startTime)
                            .duration(duration)
                            .roomNumber(classRoom.getName()) // Exam in classroom
                            .status(ExamStatus.UPCOMING)
                            .note(note)
                            .academicYear(request.academicYear())
                            .semester(request.semester())
                            .school(school)
                            .build();
                    
                    schedules.add(exam);
                }
                
                // Mark slot as used for this grade
                usedSlotsByGrade.get(grade).add(slot);
                log.info("Scheduled {} for grade {} ({} classes) at {} {}", 
                        subject.getName(), grade, eligibleClassRooms.size(), slot.date, slot.startTime);
            }
        }
        
        // Save all schedules
        examScheduleRepo.saveAll(schedules);
        
        log.info("Generated {} exam schedules", schedules.size());
        
        return schedules.stream()
                .map(this::toViewDto)
                .collect(Collectors.toList());
    }
    
    /**
     * Get all exam schedules for a school.
     */
    public List<ExamScheduleViewDto> getExamSchedules(School school, String academicYear, Integer semester) {
        List<ExamSchedule> schedules = examScheduleRepo.findBySchoolAndAcademicYearAndSemester(
                school, academicYear, semester);
        
        return schedules.stream()
                .map(this::toViewDto)
                .sorted(Comparator.comparing(ExamScheduleViewDto::examDate)
                        .thenComparing(ExamScheduleViewDto::startTime))
                .collect(Collectors.toList());
    }
    
    /**
     * Delete exam schedules by type and period.
     */
    @Transactional
    public void deleteExistingSchedules(School school, ExamType examType, String academicYear, Integer semester) {
        List<ExamSchedule> existing = examScheduleRepo.findBySchoolAndAcademicYearAndSemester(
                school, academicYear, semester);
        
        List<ExamSchedule> toDelete = existing.stream()
                .filter(e -> e.getExamType() == examType)
                .collect(Collectors.toList());
        
        if (!toDelete.isEmpty()) {
            examScheduleRepo.deleteAll(toDelete);
            log.info("Deleted {} existing exam schedules", toDelete.size());
        }
    }
    
    /**
     * Find an available time slot for a grade that doesn't conflict with existing slots.
     */
    private TimeSlot findAvailableSlotForGrade(LocalDate startDate, LocalDate endDate, 
            List<TimeSlot> usedSlots, int duration) {
        LocalDate currentDate = startDate;
        
        while (!currentDate.isAfter(endDate)) {
            // Skip weekends
            if (currentDate.getDayOfWeek().getValue() >= 6) {
                currentDate = currentDate.plusDays(1);
                continue;
            }
            
            // Get slots used on this date
            final LocalDate checkDate = currentDate;
            List<TimeSlot> daySlots = usedSlots.stream()
                    .filter(s -> s.date.equals(checkDate))
                    .collect(Collectors.toList());
            
            // Try morning slots
            TimeSlot morningSlot = findSlotInPeriod(MORNING_START, MORNING_END, daySlots, duration);
            if (morningSlot != null) {
                morningSlot.date = currentDate;
                return morningSlot;
            }
            
            // Try afternoon slots
            TimeSlot afternoonSlot = findSlotInPeriod(AFTERNOON_START, AFTERNOON_END, daySlots, duration);
            if (afternoonSlot != null) {
                afternoonSlot.date = currentDate;
                return afternoonSlot;
            }
            
            currentDate = currentDate.plusDays(1);
        }
        
        return null;
    }
    
    /**
     * Find an available time slot within a period that doesn't conflict with used slots.
     */
    private TimeSlot findSlotInPeriod(LocalTime periodStart, LocalTime periodEnd, 
            List<TimeSlot> usedSlots, int duration) {
        LocalTime currentTime = periodStart;
        
        while (currentTime.plusMinutes(duration).isBefore(periodEnd) || 
               currentTime.plusMinutes(duration).equals(periodEnd)) {
            final LocalTime checkTime = currentTime;
            final LocalTime endTime = currentTime.plusMinutes(duration);
            
            // Check if this slot conflicts with any used slot
            boolean hasConflict = usedSlots.stream().anyMatch(slot -> 
                    isTimeOverlap(checkTime, endTime, slot.startTime, slot.endTime));
            
            if (!hasConflict) {
                TimeSlot slot = new TimeSlot();
                slot.startTime = currentTime;
                slot.endTime = endTime;
                return slot;
            }
            
            // Move to next slot (after break)
            currentTime = currentTime.plusMinutes(BREAK_BETWEEN_EXAMS + duration);
        }
        
        return null;
    }
    
    /**
     * Check if two time ranges overlap.
     */
    private boolean isTimeOverlap(LocalTime start1, LocalTime end1, LocalTime start2, LocalTime end2) {
        // Add break between exams
        LocalTime end1WithBreak = end1.plusMinutes(BREAK_BETWEEN_EXAMS);
        LocalTime end2WithBreak = end2.plusMinutes(BREAK_BETWEEN_EXAMS);
        return start1.isBefore(end2WithBreak) && start2.isBefore(end1WithBreak);
    }
    
    /**
     * Check if subject is a major subject that requires centralized exam.
     */
    private boolean isMajorSubject(Subject subject) {
        String name = subject.getName().toLowerCase().trim();
        for (String major : MAJOR_SUBJECTS) {
            if (name.contains(major) || name.equals(major)) {
                return true;
            }
        }
        return false;
    }
    
    private boolean isElectiveSubject(Subject subject) {
        String name = subject.getName().toLowerCase();
        return name.contains("tự chọn") || 
               name.contains("nghệ thuật") || 
               name.contains("âm nhạc") ||
               name.contains("mỹ thuật") ||
               name.contains("thể dục") ||
               name.contains("công nghệ");
    }
    
    private ExamScheduleViewDto toViewDto(ExamSchedule exam) {
        return new ExamScheduleViewDto(
                exam.getId(),
                exam.getClassRoom().getId(),
                exam.getClassRoom().getName(),
                exam.getSubject().getId(),
                exam.getSubject().getName(),
                exam.getExamType().name(),
                exam.getExamDate(),
                exam.getStartTime(),
                exam.getDuration(),
                exam.getRoomNumber(),
                exam.getStatus().name(),
                exam.getNote(),
                exam.getAcademicYear(),
                exam.getSemester()
        );
    }
    
    /**
     * Filter classrooms that should take a specific subject's exam.
     * - COMPULSORY subjects: All classes can take the exam
     * - ELECTIVE/SPECIALIZED subjects: Only classes with matching department/stream
     *   - If subject has TU_NHIEN stream, only TU_NHIEN department classes
     *   - If subject has XA_HOI stream, only XA_HOI department classes
     *   - Classes with KHONG_PHAN_BAN (grade 10) will take both stream exams
     * - Also check if class has a combination that includes this subject
     */
    private List<ClassRoom> filterEligibleClassRooms(List<ClassRoom> classRooms, Subject subject) {
        SubjectType subjectType = subject.getType();
        StreamType subjectStream = subject.getStream();
        
        // COMPULSORY subjects: all classes take the exam (except CC and SHL)
        // Skip CC and SHL (Chào cờ, Sinh hoạt lớp) - they don't have exams
        String code = subject.getCode();
        if ("CC".equals(code) || "SHL".equals(code)) {
            return new ArrayList<>();
        }
        
        if (subjectType == SubjectType.COMPULSORY) {
            return classRooms;
        }
        
        // ELECTIVE or SPECIALIZED subjects: filter by department/stream
        List<ClassRoom> eligibleClasses = new ArrayList<>();
        
        for (ClassRoom classRoom : classRooms) {
            ClassDepartment classDepartment = classRoom.getDepartment();
            Combination combination = classRoom.getCombination();
            
            // Check 1: If class has a combination, check if subject is in that combination
            if (combination != null && combination.getSubjects() != null && !combination.getSubjects().isEmpty()) {
                boolean subjectInCombination = combination.getSubjects().stream()
                        .anyMatch(s -> s.getId().equals(subject.getId()));
                if (subjectInCombination) {
                    eligibleClasses.add(classRoom);
                    continue;
                }
                // If class has a combination but subject is not in it, skip this class
                continue;
            }
            
            // Check 2: Classes without combination - check department matching
            // Grade 10 (KHONG_PHAN_BAN) classes can take ALL exams
            if (classDepartment == null || classDepartment == ClassDepartment.KHONG_PHAN_BAN) {
                eligibleClasses.add(classRoom);
                continue;
            }
            
            // Check 3: Match subject stream with class department
            if (subjectStream != null) {
                if (subjectStream == StreamType.TU_NHIEN && classDepartment == ClassDepartment.TU_NHIEN) {
                    eligibleClasses.add(classRoom);
                } else if (subjectStream == StreamType.XA_HOI && classDepartment == ClassDepartment.XA_HOI) {
                    eligibleClasses.add(classRoom);
                }
            }
        }
        
        return eligibleClasses;
    }
    
    private static class TimeSlot {
        LocalDate date;
        LocalTime startTime;
        LocalTime endTime;
    }
}
