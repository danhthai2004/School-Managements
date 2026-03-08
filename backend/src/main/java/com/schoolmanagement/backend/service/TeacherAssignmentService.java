package com.schoolmanagement.backend.service;

import com.schoolmanagement.backend.domain.entity.*;
import com.schoolmanagement.backend.dto.TeacherAssignmentDto;
import com.schoolmanagement.backend.exception.ApiException;
import com.schoolmanagement.backend.repo.ClassRoomRepository;
import com.schoolmanagement.backend.repo.TeacherAssignmentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TeacherAssignmentService {

    private final TeacherAssignmentRepository assignments;
    private final ClassRoomRepository classRooms;
    // private final UserRepository users; // No longer needed directly for
    // assignment
    private final com.schoolmanagement.backend.repo.TeacherRepository teachers;

    /**
     * Initialize empty assignments for all classes based on their combinations.
     * Call this when a Class is created or Combination is changed, or
     * manually/periodically.
     */
    @Transactional
    public void initializeAssignments(School school) {
        List<ClassRoom> classes = classRooms.findAllBySchoolOrderByGradeAscNameAsc(school);

        for (ClassRoom cls : classes) {
            Combination combo = cls.getCombination();
            if (combo == null)
                continue;

            for (Subject subject : combo.getSubjects()) {
                // Check if assignment already exists
                if (assignments.findByClassRoomAndSubject(cls, subject).isEmpty()) {
                    TeacherAssignment assignment = TeacherAssignment.builder()
                            .classRoom(cls)
                            .subject(subject)
                            .school(school)
                            .teacher(null) // Initially no teacher assigned
                            .lessonsPerWeek(subject.getTotalLessons() != null ? subject.getTotalLessons() : 2) // Default
                                                                                                               // from
                                                                                                               // subject
                                                                                                               // or
                                                                                                               // fallback
                                                                                                               // to 2
                            .build();
                    assignments.save(assignment);
                }
            }
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
                for (com.schoolmanagement.backend.domain.entity.Subject s : teacher.getSubjects()) {
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
                        .map(com.schoolmanagement.backend.domain.entity.Subject::getName)
                        .collect(Collectors.joining(", "));
                throw new ApiException(HttpStatus.BAD_REQUEST,
                        "Giáo viên có chuyên môn [" + subjectNames + "] không thể dạy môn "
                                + assignment.getSubject().getName());
            }
        }

        assignment.setTeacher(teacher);
        assignment = assignments.save(assignment);
        return toDto(assignment);
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
                entity.getLessonsPerWeek());
    }
}
