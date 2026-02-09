package com.schoolmanagement.backend.service;

import com.schoolmanagement.backend.domain.Role;
import com.schoolmanagement.backend.domain.entity.ClassRoom;
import com.schoolmanagement.backend.domain.entity.School;
import com.schoolmanagement.backend.domain.entity.User;
import com.schoolmanagement.backend.dto.ClassRoomDto;
import com.schoolmanagement.backend.dto.request.CreateClassRoomRequest;
import com.schoolmanagement.backend.exception.ApiException;
import com.schoolmanagement.backend.repo.ClassEnrollmentRepository;
import com.schoolmanagement.backend.repo.ClassRoomRepository;
import com.schoolmanagement.backend.repo.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
public class ClassManagementService {

    private final ClassRoomRepository classRooms;
    private final UserRepository users;
    private final ClassEnrollmentRepository enrollments;
    private final com.schoolmanagement.backend.repo.CombinationRepository combinations;

    public ClassManagementService(ClassRoomRepository classRooms, UserRepository users,
            ClassEnrollmentRepository enrollments,
            com.schoolmanagement.backend.repo.CombinationRepository combinations) {
        this.classRooms = classRooms;
        this.users = users;
        this.enrollments = enrollments;
        this.combinations = combinations;
    }

    // ==================== CLASS ROOM MANAGEMENT ====================

    @Transactional
    public ClassRoomDto createClassRoom(School school, CreateClassRoomRequest req) {
        // Kiểm tra trùng tên lớp trong cùng năm học
        if (classRooms.existsBySchoolAndNameAndAcademicYear(school, req.name(), req.academicYear())) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "Lớp '" + req.name() + "' đã tồn tại trong năm học " + req.academicYear() + ".");
        }

        User teacher = null;
        if (req.homeroomTeacherId() != null) {
            teacher = users.findById(req.homeroomTeacherId())
                    .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy giáo viên."));
            if (teacher.getRole() != Role.TEACHER) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Người dùng này không phải giáo viên.");
            }
            // Kiểm tra giáo viên đã làm GVCN lớp khác trong năm học này chưa
            if (classRooms.existsByHomeroomTeacherAndAcademicYear(teacher, req.academicYear())) {
                throw new ApiException(HttpStatus.CONFLICT,
                        "Giáo viên này đã làm GVCN một lớp khác trong năm học " + req.academicYear() + ".");
            }
        }

        com.schoolmanagement.backend.domain.entity.Combination combination = null;
        if (req.combinationId() != null) {
            combination = combinations.findById(req.combinationId())
                    .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy tổ hợp môn."));
        }

        ClassRoom classRoom = ClassRoom.builder()
                .name(req.name())
                .grade(req.grade())
                .academicYear(req.academicYear())
                .maxCapacity(req.maxCapacity())
                .roomNumber(req.roomNumber())
                .department(req.department() != null ? req.department()
                        : com.schoolmanagement.backend.domain.ClassDepartment.KHONG_PHAN_BAN)
                .session(req.session() != null ? req.session()
                        : com.schoolmanagement.backend.domain.SessionType.SANG)
                .school(school)
                .homeroomTeacher(teacher)
                .combination(combination)
                .build();

        classRoom = classRooms.save(classRoom);
        return

        toClassRoomDto(classRoom);
    }

    @Transactional
    public ClassRoomDto updateClassRoom(School school, UUID classId, CreateClassRoomRequest req) {
        ClassRoom classRoom = classRooms.findById(classId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy lớp học."));

        // Verify class belongs to school
        if (!classRoom.getSchool().getId().equals(school.getId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Không có quyền chỉnh sửa lớp này.");
        }

        // Check duplicate name (exclude current class)
        if (!classRoom.getName().equals(req.name()) &&
                classRooms.existsBySchoolAndNameAndAcademicYear(school, req.name(), req.academicYear())) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "Lớp '" + req.name() + "' đã tồn tại trong năm học " + req.academicYear() + ".");
        }

        User teacher = null;
        if (req.homeroomTeacherId() != null) {
            teacher = users.findById(req.homeroomTeacherId())
                    .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy giáo viên."));
            if (teacher.getRole() != Role.TEACHER) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Người dùng này không phải giáo viên.");
            }
            // Check if teacher is already homeroom for another class (exclude current)
            User currentTeacher = classRoom.getHomeroomTeacher();
            if ((currentTeacher == null || !currentTeacher.getId().equals(teacher.getId())) &&
                    classRooms.existsByHomeroomTeacherAndAcademicYear(teacher, req.academicYear())) {
                throw new ApiException(HttpStatus.CONFLICT,
                        "Giáo viên này đã làm GVCN một lớp khác trong năm học " + req.academicYear() + ".");
            }
        }

        com.schoolmanagement.backend.domain.entity.Combination combination = null;
        if (req.combinationId() != null) {
            combination = combinations.findById(req.combinationId())
                    .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy tổ hợp môn."));
        }

        classRoom.setName(req.name());
        classRoom.setGrade(req.grade());
        classRoom.setAcademicYear(req.academicYear());
        classRoom.setMaxCapacity(req.maxCapacity());
        classRoom.setRoomNumber(req.roomNumber());
        classRoom.setDepartment(req.department() != null ? req.department()
                : com.schoolmanagement.backend.domain.ClassDepartment.KHONG_PHAN_BAN);
        classRoom.setSession(req.session() != null ? req.session()
                : com.schoolmanagement.backend.domain.SessionType.SANG);
        classRoom.setHomeroomTeacher(teacher);
        classRoom.setCombination(combination);

        classRoom = classRooms.save(classRoom);
        return toClassRoomDto(classRoom);
    }

    @Transactional
    public void deleteClassRoom(School school, UUID classId) {
        ClassRoom classRoom = classRooms.findById(classId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy lớp học."));

        if (!classRoom.getSchool().getId().equals(school.getId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Không có quyền xóa lớp này.");
        }

        // TODO: Check if class has students before delete
        classRooms.delete(classRoom);
    }

    @Transactional(readOnly = true)
    public ClassRoomDto getClassRoom(School school, UUID classId) {
        ClassRoom classRoom = classRooms.findById(classId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy lớp học."));

        if (!classRoom.getSchool().getId().equals(school.getId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Không có quyền xem lớp này.");
        }

        return toClassRoomDto(classRoom);
    }

    public List<ClassRoomDto> listClassRooms(School school) {
        return classRooms.findAllBySchoolOrderByGradeAscNameAsc(school)
                .stream()
                .map(this::toClassRoomDto)
                .toList();
    }

    private ClassRoomDto toClassRoomDto(ClassRoom classRoom) {
        User teacher = classRoom.getHomeroomTeacher();
        return new ClassRoomDto(
                classRoom.getId(),
                classRoom.getName(),
                classRoom.getGrade(),
                classRoom.getAcademicYear(),
                classRoom.getMaxCapacity(),
                classRoom.getRoomNumber(),
                classRoom.getDepartment() != null ? classRoom.getDepartment().name() : null,
                classRoom.getSession() != null ? classRoom.getSession().name() : "SANG",
                classRoom.getStatus().name(),
                teacher != null ? teacher.getId() : null,
                teacher != null ? teacher.getFullName() : null,
                enrollments.countByClassRoom(classRoom),
                classRoom.getCombination() != null ? classRoom.getCombination().getId() : null,
                classRoom.getCombination() != null ? classRoom.getCombination().getName() : null);
    }
}
