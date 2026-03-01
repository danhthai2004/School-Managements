package com.schoolmanagement.backend.service;

import com.schoolmanagement.backend.domain.entity.*;
import com.schoolmanagement.backend.dto.TeacherAssignmentDto;
import com.schoolmanagement.backend.dto.request.AssignTeacherRequest;
import com.schoolmanagement.backend.exception.ApiException;
import com.schoolmanagement.backend.repo.SubjectRepository;
import com.schoolmanagement.backend.repo.TeacherAssignmentRepository;
import com.schoolmanagement.backend.repo.TeacherRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@lombok.extern.slf4j.Slf4j
@Service
@RequiredArgsConstructor
public class TeacherAssignmentService {

    private final TeacherAssignmentRepository assignments;
    private final TeacherRepository teachers;
    private final SubjectRepository subjects;

    /**
     * List all teacher-subject assignments for the school.
     */
    @Transactional(readOnly = true)
    public List<TeacherAssignmentDto> listAssignments(School school) {
        var result = assignments.findAllBySchool(school).stream()
                .map(this::toDto)
                .collect(Collectors.toList());
        log.info("listAssignments for school {}: count={}", school.getId(), result.size());
        for (var a : result) {
            log.info("  assignment: id={}, teacherId={}, teacherName={}, subjectId={}, subjectName={}",
                    a.id(), a.teacherId(), a.teacherName(), a.subjectId(), a.subjectName());
        }
        return result;
    }

    /**
     * Add a teacher-subject assignment (school-level).
     */
    @Transactional
    public TeacherAssignmentDto addAssignment(School school, AssignTeacherRequest req) {
        log.info("addAssignment called: teacherId={}, subjectId={}, schoolId={}",
                req.teacherId(), req.subjectId(), school.getId());

        Teacher teacher = teachers.findById(req.teacherId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy giáo viên"));

        log.info("Found teacher: id={}, name={}, schoolId={}",
                teacher.getId(), teacher.getFullName(), teacher.getSchool().getId());

        if (!teacher.getSchool().getId().equals(school.getId())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Giáo viên không thuộc trường này");
        }

        Subject subject = subjects.findById(req.subjectId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy môn học"));

        log.info("Found subject: id={}, name={}", subject.getId(), subject.getName());

        // Check for duplicate
        var existing = assignments.findByTeacherAndSubjectAndSchool(teacher, subject, school);
        log.info("Duplicate check result: present={}", existing.isPresent());
        if (existing.isPresent()) {
            log.warn("DUPLICATE FOUND: existingId={}, teacherId={}, subjectId={}, schoolId={}",
                    existing.get().getId(),
                    existing.get().getTeacher().getId(),
                    existing.get().getSubject().getId(),
                    existing.get().getSchool().getId());
            throw new ApiException(HttpStatus.CONFLICT, "Giáo viên đã được phân công dạy môn này");
        }

        TeacherAssignment assignment = TeacherAssignment.builder()
                .teacher(teacher)
                .subject(subject)
                .school(school)
                .headOfDepartment(false)
                .build();

        assignment = assignments.save(assignment);
        log.info("Assignment saved successfully: id={}", assignment.getId());
        return toDto(assignment);
    }

    /**
     * Remove a teacher-subject assignment.
     */
    @Transactional
    public void removeAssignment(School school, UUID assignmentId) {
        TeacherAssignment assignment = assignments.findById(assignmentId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy phân công"));

        if (!assignment.getSchool().getId().equals(school.getId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Không có quyền chỉnh sửa");
        }

        assignments.delete(assignment);
    }

    /**
     * Appoint / remove head of department for a teacher-subject assignment.
     * Returns all assignments for the affected subject so frontend can sync.
     */
    @Transactional
    public List<TeacherAssignmentDto> setHeadOfDepartment(School school, UUID assignmentId, boolean isHead) {
        TeacherAssignment assignment = assignments.findById(assignmentId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy phân công"));

        if (!assignment.getSchool().getId().equals(school.getId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Không có quyền chỉnh sửa");
        }

        // If appointing head, remove existing head for this subject in the school
        if (isHead) {
            List<TeacherAssignment> subjectAssignments = assignments
                    .findAllBySubjectAndSchool(assignment.getSubject(), school);
            for (TeacherAssignment sa : subjectAssignments) {
                if (sa.isHeadOfDepartment()) {
                    sa.setHeadOfDepartment(false);
                    assignments.save(sa);
                }
            }
        }

        assignment.setHeadOfDepartment(isHead);
        assignments.save(assignment);

        // Return all assignments for this subject so frontend can update the whole
        // group
        return assignments.findAllBySubjectAndSchool(assignment.getSubject(), school)
                .stream().map(this::toDto).collect(Collectors.toList());
    }

    private TeacherAssignmentDto toDto(TeacherAssignment entity) {
        return new TeacherAssignmentDto(
                entity.getId(),
                entity.getSubject() != null ? entity.getSubject().getId() : null,
                entity.getSubject() != null ? entity.getSubject().getName() : null,
                entity.getTeacher() != null ? entity.getTeacher().getId() : null,
                entity.getTeacher() != null ? entity.getTeacher().getFullName() : null,
                entity.isHeadOfDepartment());
    }
}
