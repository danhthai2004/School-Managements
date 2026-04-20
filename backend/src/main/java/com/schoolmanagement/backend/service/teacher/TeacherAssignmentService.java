package com.schoolmanagement.backend.service.teacher;

import com.schoolmanagement.backend.domain.entity.classes.ClassRoom;
import com.schoolmanagement.backend.domain.entity.classes.Combination;
import com.schoolmanagement.backend.domain.entity.classes.Subject;
import com.schoolmanagement.backend.domain.entity.teacher.Teacher;

import com.schoolmanagement.backend.domain.entity.admin.School;
import com.schoolmanagement.backend.domain.entity.teacher.TeacherAssignment;

import com.schoolmanagement.backend.dto.teacher.TeacherAssignmentDto;
import com.schoolmanagement.backend.exception.ApiException;
import com.schoolmanagement.backend.repo.classes.ClassRoomRepository;
import com.schoolmanagement.backend.repo.teacher.TeacherAssignmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class TeacherAssignmentService {

    private final TeacherAssignmentRepository assignments;
    private final ClassRoomRepository classRooms;
    // private final UserRepository users; // No longer needed directly for
    // assignment
    private final com.schoolmanagement.backend.repo.teacher.TeacherRepository teachers;
    private final com.schoolmanagement.backend.repo.timetable.TimetableDetailRepository timetableDetailRepository;

    /**
     * Initialize empty assignments for all classes based on their combinations.
     * Call this when a Class is created or Combination is changed, or
     * manually/periodically.
     *
     * Optimized: pre-loads existing assignments into a Set for O(1) lookup,
     * deduplicates subjects per combination to prevent cartesian product issues.
     */
    @Transactional
    public void initializeAssignments(School school) {
        List<ClassRoom> classes = classRooms.findAllBySchoolOrderByGradeAscNameAsc(school);

        // Step 1: Remove existing duplicates first
        removeDuplicateAssignments(school);

        // Step 2: Pre-load ALL existing assignments into a Set for O(1) lookup
        List<TeacherAssignment> existingAssignments = assignments.findAllBySchool(school);
        Set<String> existingKeys = new HashSet<>();
        for (TeacherAssignment a : existingAssignments) {
            existingKeys.add(a.getClassRoom().getId() + "_" + a.getSubject().getId());
        }

        // Step 3: Collect new assignments in-memory, then batch save
        List<TeacherAssignment> newAssignments = new ArrayList<>();

        for (ClassRoom cls : classes) {
            Combination combo = cls.getCombination();
            if (combo == null)
                continue;

            // Deduplicate subjects within this combination (prevents EAGER fetch
            // duplication)
            Set<UUID> seenSubjectIds = new HashSet<>();

            for (Subject subject : combo.getSubjects()) {
                // Skip if we've already processed this subject for this class
                if (!seenSubjectIds.add(subject.getId())) {
                    continue;
                }

                String key = cls.getId() + "_" + subject.getId();
                if (!existingKeys.contains(key)) {
                    TeacherAssignment assignment = TeacherAssignment.builder()
                            .classRoom(cls)
                            .subject(subject)
                            .school(school)
                            .teacher(null)
                            .lessonsPerWeek(subject.getTotalLessons() != null ? subject.getTotalLessons() : 2)
                            .build();
                    newAssignments.add(assignment);
                    existingKeys.add(key); // prevent intra-batch duplicates
                }
            }
        }

        // Batch save all new assignments at once
        if (!newAssignments.isEmpty()) {
            assignments.saveAll(newAssignments);
        }
    }

    /**
     * Remove duplicate TeacherAssignment records (same classRoom + subject).
     * Keeps the one with a teacher assigned if possible, otherwise keeps the first.
     */
    private void removeDuplicateAssignments(School school) {
        List<TeacherAssignment> all = assignments.findAllBySchool(school);
        Map<String, List<TeacherAssignment>> grouped = new LinkedHashMap<>();

        for (TeacherAssignment a : all) {
            String key = a.getClassRoom().getId() + "_" + a.getSubject().getId();
            grouped.computeIfAbsent(key, k -> new ArrayList<>()).add(a);
        }

        List<TeacherAssignment> toDelete = new ArrayList<>();
        for (List<TeacherAssignment> group : grouped.values()) {
            if (group.size() <= 1)
                continue;

            // Keep the one with a teacher assigned, or the first one
            TeacherAssignment keeper = group.stream()
                    .filter(a -> a.getTeacher() != null)
                    .findFirst()
                    .orElse(group.get(0));

            for (TeacherAssignment a : group) {
                if (!a.getId().equals(keeper.getId())) {
                    toDelete.add(a);
                }
            }
        }

        if (!toDelete.isEmpty()) {
            assignments.deleteAll(toDelete);
            assignments.flush();
        }
    }

    @Transactional(readOnly = true)
    public List<TeacherAssignmentDto> listAssignments(School school, UUID classId) {
        if (classId != null) {
            ClassRoom classRoom = classRooms.findById(classId)
                    .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Lớp học không tồn tại"));
            return assignments.findAllByClassRoom(classRoom).stream()
                    .map(this::toDto)
                    .collect(Collectors.toList());
        }
        return assignments.findAllBySchool(school).stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Transactional
    public TeacherAssignmentDto assignTeacher(School school, UUID assignmentId, UUID teacherId) {
        TeacherAssignment assignment = assignments.findById(assignmentId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy phân công"));

        if (!assignment.getSchool().getId().equals(school.getId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Không có quyền chỉnh sửa");
        }

        Teacher teacher = null;
        if (teacherId != null) {
            teacher = teachers.findById(teacherId)
                    .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy giáo viên"));

            if (!teacher.getSchool().getId().equals(school.getId())) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Giáo viên không thuộc trường này");
            }

            // Validate Subject
            // Validate Subject
            boolean canTeach = false;
            if (teacher.getSubjects() == null || teacher.getSubjects().isEmpty()) {
                // If no subjects listed, maybe allow? Let's assume strict rule: must have
                // subject.
                // Or maybe allow if "Specialization" string matches?
                // Let's stick to strict: must match one of the assigned subjects.
            } else {
                for (com.schoolmanagement.backend.domain.entity.classes.Subject s : teacher.getSubjects()) {
                    if (s.getId().equals(assignment.getSubject().getId())) {
                        canTeach = true;
                        break;
                    }
                    // Smart check: Allow if assignment is SPECIALIZED equivalent of a teacher
                    // subject
                    String teacherSubjectCode = s.getCode();
                    String assignmentSubjectCode = assignment.getSubject().getCode();
                    if (assignmentSubjectCode.startsWith("CD_") && assignmentSubjectCode.contains(teacherSubjectCode)) {
                        canTeach = true;
                        break;
                    }
                }
            }

            if (!canTeach && !teacher.getSubjects().isEmpty()) {
                // Format list of subjects
                String subjectNames = teacher.getSubjects().stream()
                        .map(com.schoolmanagement.backend.domain.entity.classes.Subject::getName)
                        .collect(Collectors.joining(", "));
                throw new ApiException(HttpStatus.BAD_REQUEST,
                        "Giáo viên có chuyên môn [" + subjectNames + "] không thể dạy môn "
                                + assignment.getSubject().getName());
            }
        }

        assignment.setTeacher(teacher);
        assignment = assignments.save(assignment);

        // Sync with timetables matching the class and subject
        timetableDetailRepository.updateTeacherForClassAndSubject(assignment.getClassRoom(), assignment.getSubject(),
                teacher);

        return toDto(assignment);
    }

    @Transactional
    public List<TeacherAssignmentDto> bulkAssignTeachers(School school,
            java.util.List<com.schoolmanagement.backend.dto.teacher.TeacherAssignmentUpdate> updates) {
        return updates.stream().map(update -> {
            try {
                return assignTeacher(school, update.assignmentId(), update.teacherId());
            } catch (Exception e) {
                // If one fails, the transaction rolls back, but we can also just throw
                // exception
                throw e; // Or handle selectively
            }
        }).collect(Collectors.toList());
    }

    @Transactional
    public TeacherAssignmentDto updateLessonsPerWeek(School school, UUID assignmentId, int lessons) {
        TeacherAssignment assignment = assignments.findById(assignmentId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy phân công"));

        if (!assignment.getSchool().getId().equals(school.getId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Không có quyền chỉnh sửa");
        }

        if (lessons < 0)
            throw new ApiException(HttpStatus.BAD_REQUEST, "Số tiết không hợp lệ");

        assignment.setLessonsPerWeek(lessons);
        assignment = assignments.save(assignment);
        return toDto(assignment);
    }

    private TeacherAssignmentDto toDto(TeacherAssignment entity) {
        return new TeacherAssignmentDto(
                entity.getId(),
                entity.getClassRoom().getId(),
                entity.getClassRoom().getName(),
                entity.getSubject().getId(),
                entity.getSubject().getName(),
                entity.getTeacher() != null ? entity.getTeacher().getId() : null,
                entity.getTeacher() != null ? entity.getTeacher().getFullName() : null,
                entity.getLessonsPerWeek(),
                false); // default isHeadOfDepartment
    }
}
