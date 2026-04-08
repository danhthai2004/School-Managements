package com.schoolmanagement.backend.service.classes;

import com.schoolmanagement.backend.domain.classes.ClassDepartment;
import com.schoolmanagement.backend.domain.admin.AcademicYearStatus;
import com.schoolmanagement.backend.domain.exam.SessionType;

import com.schoolmanagement.backend.domain.auth.Role;
import com.schoolmanagement.backend.domain.entity.classes.ClassRoom;
import com.schoolmanagement.backend.domain.entity.admin.School;
import com.schoolmanagement.backend.domain.entity.auth.User;
import com.schoolmanagement.backend.dto.classes.ClassRoomDto;
import com.schoolmanagement.backend.dto.classes.CreateClassRoomRequest;
import com.schoolmanagement.backend.exception.ApiException;
import com.schoolmanagement.backend.repo.classes.ClassEnrollmentRepository;
import com.schoolmanagement.backend.repo.classes.ClassRoomRepository;
import com.schoolmanagement.backend.repo.auth.UserRepository;
import com.schoolmanagement.backend.domain.entity.admin.AcademicYear;
import com.schoolmanagement.backend.service.admin.SemesterService;
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
    private final com.schoolmanagement.backend.repo.classes.CombinationRepository combinations;
    private final com.schoolmanagement.backend.repo.classes.RoomRepository rooms;
    private final SemesterService semesterService;

    public ClassManagementService(ClassRoomRepository classRooms, UserRepository users,
            ClassEnrollmentRepository enrollments,
            com.schoolmanagement.backend.repo.classes.CombinationRepository combinations,
            com.schoolmanagement.backend.repo.classes.RoomRepository rooms,
            SemesterService semesterService) {
        this.classRooms = classRooms;
        this.users = users;
        this.enrollments = enrollments;
        this.combinations = combinations;
        this.rooms = rooms;
        this.semesterService = semesterService;
    }

    // ==================== CLASS ROOM MANAGEMENT ====================

    @Transactional
    public ClassRoomDto createClassRoom(School school, CreateClassRoomRequest req) {
        // Find Academic Year
        AcademicYear academicYear = semesterService.getAcademicYearByName(school, req.academicYear());
        if (academicYear == null) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy năm học: " + req.academicYear());
        }

        // Validation #3: Không cho tạo lớp trong năm học đã đóng
        if (academicYear.getStatus() == AcademicYearStatus.CLOSED) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Không thể tạo lớp trong năm học đã đóng: " + academicYear.getName());
        }

        // Kiểm tra trùng tên lớp trong cùng năm học
        if (classRooms.existsBySchoolAndNameAndAcademicYear(school, req.name(), academicYear)) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "Lớp '" + req.name() + "' đã tồn tại trong năm học " + academicYear.getName() + ".");
        }

        User teacher = null;
        if (req.homeroomTeacherId() != null) {
            teacher = users.findById(req.homeroomTeacherId())
                    .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy giáo viên."));
            if (teacher.getRole() != Role.TEACHER) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Người dùng này không phải giáo viên.");
            }
            // Kiểm tra giáo viên đã làm GVCN lớp khác trong năm học này chưa
            if (classRooms.existsByHomeroomTeacherAndAcademicYear(teacher, academicYear)) {
                throw new ApiException(HttpStatus.CONFLICT,
                        "Giáo viên này đã làm GVCN một lớp khác trong năm học " + academicYear.getName() + ".");
            }
        }

        com.schoolmanagement.backend.domain.entity.classes.Combination combination = null;
        if (req.combinationId() != null) {
            combination = combinations.findById(req.combinationId())
                    .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy tổ hợp môn."));
        }

        com.schoolmanagement.backend.domain.entity.classes.Room room = null;
        if (req.roomId() != null) {
            room = rooms.findById(req.roomId())
                    .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy phòng học."));
            if (!room.getSchool().getId().equals(school.getId())) {
                throw new ApiException(HttpStatus.FORBIDDEN, "Phòng học không thuộc trường này.");
            }
            // Validation #5: Không cho gán phòng đã được sử dụng bởi lớp khác trong cùng năm học
            if (classRooms.existsByRoomAndAcademicYear(room, academicYear)) {
                throw new ApiException(HttpStatus.CONFLICT,
                        "Phòng '" + room.getName() + "' đã được gán cho lớp khác trong năm học " + academicYear.getName() + ".");
            }
            // Validation #6: Sĩ số tối đa không được vượt quá sức chứa phòng
            if (req.maxCapacity() > room.getCapacity()) {
                throw new ApiException(HttpStatus.BAD_REQUEST,
                        "Sĩ số tối đa (" + req.maxCapacity() + ") không thể vượt quá sức chứa phòng học (" + room.getCapacity() + ").");
            }
        }

        ClassRoom classRoom = ClassRoom.builder()
                .name(req.name())
                .grade(req.grade())
                .academicYear(academicYear)
                .maxCapacity(req.maxCapacity())
                .room(room)
                .department(req.department() != null ? req.department()
                        : ClassDepartment.KHONG_PHAN_BAN)
                .session(req.session() != null ? req.session()
                        : SessionType.SANG)
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

        // Find Academic Year
        AcademicYear academicYear = semesterService.getAcademicYearByName(school, req.academicYear());
        if (academicYear == null) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy năm học: " + req.academicYear());
        }

        // Validation #3: Không cho sửa lớp trong năm học đã đóng
        if (academicYear.getStatus() == AcademicYearStatus.CLOSED) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Không thể chỉnh sửa lớp trong năm học đã đóng: " + academicYear.getName());
        }

        long currentStudentCount = enrollments.countByClassRoom(classRoom);

        // Validation #2: Không cho giảm sĩ số tối đa xuống thấp hơn số học sinh thực tế
        if (req.maxCapacity() < currentStudentCount) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "Sĩ số tối đa không thể nhỏ hơn số học sinh hiện tại (" + currentStudentCount + " học sinh).");
        }

        // Validation #4: Không cho đổi Khối hoặc Năm học khi lớp đã có học sinh
        if (currentStudentCount > 0) {
            if (classRoom.getGrade() != req.grade()) {
                throw new ApiException(HttpStatus.BAD_REQUEST,
                        "Không thể đổi khối lớp khi lớp đã có " + currentStudentCount + " học sinh theo học.");
            }
            if (classRoom.getAcademicYear() != null && !classRoom.getAcademicYear().getName().equals(req.academicYear())) {
                throw new ApiException(HttpStatus.BAD_REQUEST,
                        "Không thể đổi năm học khi lớp đã có " + currentStudentCount + " học sinh theo học.");
            }
        }

        // Check duplicate name (exclude current class)
        if (!classRoom.getName().equals(req.name()) &&
                classRooms.existsBySchoolAndNameAndAcademicYear(school, req.name(), academicYear)) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "Lớp '" + req.name() + "' đã tồn tại trong năm học " + academicYear.getName() + ".");
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
                    classRooms.existsByHomeroomTeacherAndAcademicYear(teacher, academicYear)) {
                throw new ApiException(HttpStatus.CONFLICT,
                        "Giáo viên này đã làm GVCN một lớp khác trong năm học " + academicYear.getName() + ".");
            }
        }

        com.schoolmanagement.backend.domain.entity.classes.Combination combination = null;
        if (req.combinationId() != null) {
            combination = combinations.findById(req.combinationId())
                    .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy tổ hợp môn."));
        }

        com.schoolmanagement.backend.domain.entity.classes.Room room = null;
        if (req.roomId() != null) {
            room = rooms.findById(req.roomId())
                    .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy phòng học."));
            if (!room.getSchool().getId().equals(school.getId())) {
                throw new ApiException(HttpStatus.FORBIDDEN, "Phòng học không thuộc trường này.");
            }
            // Validation #5: Phòng đã gán cho lớp khác (trừ lớp hiện tại)
            var existingRoomClass = classRooms.findByRoomAndAcademicYear(room, academicYear);
            if (existingRoomClass.isPresent() && !existingRoomClass.get().getId().equals(classRoom.getId())) {
                throw new ApiException(HttpStatus.CONFLICT,
                        "Phòng '" + room.getName() + "' đã được gán cho lớp khác trong năm học " + academicYear.getName() + ".");
            }
            // Validation #6: Sĩ số tối đa không được vượt quá sức chứa phòng
            if (req.maxCapacity() > room.getCapacity()) {
                throw new ApiException(HttpStatus.BAD_REQUEST,
                        "Sĩ số tối đa (" + req.maxCapacity() + ") không thể vượt quá sức chứa phòng học (" + room.getCapacity() + ").");
            }
        }

        classRoom.setName(req.name());
        classRoom.setGrade(req.grade());
        classRoom.setAcademicYear(academicYear);
        classRoom.setMaxCapacity(req.maxCapacity());
        classRoom.setRoom(room);
        classRoom.setDepartment(req.department() != null ? req.department()
                : ClassDepartment.KHONG_PHAN_BAN);
        classRoom.setSession(req.session() != null ? req.session()
                : SessionType.SANG);
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

        // Validation #1: Không cho xóa lớp đang có học sinh
        long studentCount = enrollments.countByClassRoom(classRoom);
        if (studentCount > 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "Không thể xóa lớp đang có " + studentCount + " học sinh. Hãy chuyển học sinh sang lớp khác trước.");
        }

        classRooms.delete(classRoom);
    }

    @Transactional(readOnly = true)
    public ClassRoom getClassRoom(UUID studentId, AcademicYear academicYear) {
        UUID classId = enrollments
                .findLatestClassroomId(studentId, academicYear)
                .stream()
                .findFirst()
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Học sinh không ở lớp học nào"));
        ClassRoom classRoom = classRooms.findById(classId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy lớp học"));

        return classRoom;
    }

    @Transactional(readOnly = true)
    public ClassRoom getClassRoomLegacy(UUID studentId, String academicYearName, School school) {
        AcademicYear academicYear = semesterService.getAcademicYearByName(school, academicYearName);
        return getClassRoom(studentId, academicYear);
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

    @Transactional(readOnly = true)
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
                classRoom.getAcademicYear() != null ? classRoom.getAcademicYear().getName() : "",
                classRoom.getMaxCapacity(),
                classRoom.getRoom() != null ? classRoom.getRoom().getId() : null,
                classRoom.getRoom() != null ? classRoom.getRoom().getName() : null,
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
