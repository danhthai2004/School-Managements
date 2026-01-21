package com.schoolmanagement.backend.service;

import com.schoolmanagement.backend.domain.Role;
import com.schoolmanagement.backend.domain.StudentStatus;
import com.schoolmanagement.backend.domain.entity.*;
import com.schoolmanagement.backend.dto.*;
import com.schoolmanagement.backend.dto.request.CreateClassRoomRequest;
import com.schoolmanagement.backend.dto.request.CreateStudentRequest;
import com.schoolmanagement.backend.exception.ApiException;
import com.schoolmanagement.backend.repo.*;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.*;

@Service
public class SchoolAdminService {

    private final UserRepository users;
    private final ClassRoomRepository classRooms;
    private final StudentRepository students;
    private final GuardianRepository guardians;
    private final ClassEnrollmentRepository enrollments;
    private final PasswordEncoder passwordEncoder;
    private final MailService mailService;

    public SchoolAdminService(UserRepository users, ClassRoomRepository classRooms,
            StudentRepository students, GuardianRepository guardians,
            ClassEnrollmentRepository enrollments,
            PasswordEncoder passwordEncoder, MailService mailService) {
        this.users = users;
        this.classRooms = classRooms;
        this.students = students;
        this.guardians = guardians;
        this.enrollments = enrollments;
        this.passwordEncoder = passwordEncoder;
        this.mailService = mailService;
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

        ClassRoom classRoom = ClassRoom.builder()
                .name(req.name())
                .grade(req.grade())
                .academicYear(req.academicYear())
                .maxCapacity(req.maxCapacity())
                .roomNumber(req.roomNumber())
                .department(req.department() != null ? req.department()
                        : com.schoolmanagement.backend.domain.ClassDepartment.KHONG_PHAN_BAN)
                .school(school)
                .homeroomTeacher(teacher)
                .build();

        classRoom = classRooms.save(classRoom);

        return toClassRoomDto(classRoom);
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

        classRoom.setName(req.name());
        classRoom.setGrade(req.grade());
        classRoom.setAcademicYear(req.academicYear());
        classRoom.setMaxCapacity(req.maxCapacity());
        classRoom.setRoomNumber(req.roomNumber());
        classRoom.setDepartment(req.department() != null ? req.department()
                : com.schoolmanagement.backend.domain.ClassDepartment.KHONG_PHAN_BAN);
        classRoom.setHomeroomTeacher(teacher);

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

    public List<ClassRoomDto> listClassRooms(School school) {
        return classRooms.findAllBySchoolOrderByGradeAscNameAsc(school)
                .stream()
                .map(this::toClassRoomDto)
                .toList();
    }

    public SchoolStatsDto getSchoolStats(School school) {
        long totalClasses = classRooms.countBySchool(school);
        long totalTeachers = users.countBySchoolAndRole(school, Role.TEACHER);
        long totalStudents = users.countBySchoolAndRole(school, Role.STUDENT);

        String currentAcademicYear = classRooms.findFirstBySchoolOrderByAcademicYearDesc(school)
                .map(ClassRoom::getAcademicYear)
                .orElseGet(() -> {
                    int year = java.time.LocalDate.now().getYear();
                    int month = java.time.LocalDate.now().getMonthValue();
                    if (month >= 9) {
                        return year + "-" + (year + 1);
                    } else {
                        return (year - 1) + "-" + year;
                    }
                });

        return new SchoolStatsDto(totalClasses, totalTeachers, totalStudents, currentAcademicYear);
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
                classRoom.getStatus().name(),
                teacher != null ? teacher.getId() : null,
                teacher != null ? teacher.getFullName() : null,
                0 // TODO: count students in class
        );
    }

    // ==================== USER MANAGEMENT ====================

    public UserDto createUserForSchool(School school, String email, String fullName, Role role) {
        if (role == Role.SYSTEM_ADMIN || role == Role.SCHOOL_ADMIN) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Role không hợp lệ cho trường.");
        }
        if (users.existsByEmailIgnoreCase(email)) {
            throw new ApiException(HttpStatus.CONFLICT, "Email đã tồn tại.");
        }
        String tempPassword = RandomUtil.generateTempPassword(12);

        User user = User.builder()
                .email(email)
                .fullName(fullName)
                .role(role)
                .school(school)
                .passwordHash(passwordEncoder.encode(tempPassword))
                .firstLogin(true)
                .enabled(true)
                .build();

        user = users.save(user);
        mailService.sendTempPasswordEmail(user.getEmail(), user.getFullName(), tempPassword);

        return new UserDto(user.getId(), user.getEmail(), user.getFullName(), user.getRole(), school.getId(),
                school.getCode());
    }

    public List<UserDto> listUsersInSchool(School school) {
        // naive: load all then filter. For small class demo OK.
        return users.findAll().stream()
                .filter(u -> u.getSchool() != null && u.getSchool().getId().equals(school.getId()))
                .map(u -> new UserDto(u.getId(), u.getEmail(), u.getFullName(), u.getRole(), school.getId(),
                        school.getCode()))
                .toList();
    }

    public List<UserDto> listTeachersInSchool(School school) {
        return users.findAll().stream()
                .filter(u -> u.getSchool() != null && u.getSchool().getId().equals(school.getId())
                        && u.getRole() == Role.TEACHER)
                .map(u -> new UserDto(u.getId(), u.getEmail(), u.getFullName(), u.getRole(), school.getId(),
                        school.getCode()))
                .toList();
    }

    public BulkImportResponse importCsv(School school, MultipartFile file, Role defaultRole) {
        if (file == null || file.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "File CSV rỗng.");
        }

        int created = 0;
        int skipped = 0;
        int emailed = 0;

        try (var reader = new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8);
                CSVParser parser = CSVFormat.DEFAULT
                        .builder()
                        .setHeader()
                        .setSkipHeaderRecord(true)
                        .setIgnoreEmptyLines(true)
                        .setTrim(true)
                        .build()
                        .parse(reader)) {

            for (CSVRecord record : parser) {
                String email = record.get("email");
                String fullName = record.isMapped("fullName") ? record.get("fullName") : "";
                String roleRaw = record.isMapped("role") ? record.get("role") : "";

                if (email == null || email.isBlank()) {
                    skipped++;
                    continue;
                }
                if (fullName == null || fullName.isBlank()) {
                    fullName = email;
                }

                if (users.existsByEmailIgnoreCase(email)) {
                    skipped++;
                    continue;
                }

                Role role = defaultRole;
                if (roleRaw != null && !roleRaw.isBlank()) {
                    try {
                        role = Role.valueOf(roleRaw.trim().toUpperCase(Locale.ROOT));
                    } catch (IllegalArgumentException ignored) {
                        // keep defaultRole
                    }
                }

                if (role == Role.SYSTEM_ADMIN || role == Role.SCHOOL_ADMIN) {
                    skipped++;
                    continue;
                }

                String tempPassword = RandomUtil.generateTempPassword(12);
                User user = User.builder()
                        .email(email)
                        .fullName(fullName)
                        .role(role)
                        .school(school)
                        .passwordHash(passwordEncoder.encode(tempPassword))
                        .firstLogin(true)
                        .enabled(true)
                        .build();

                users.save(user);
                created++;
                mailService.sendTempPasswordEmail(email, fullName, tempPassword);
                emailed++;
            }
        } catch (ApiException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "Không đọc được file CSV. Hãy kiểm tra header (email, fullName, role).");
        }

        return new BulkImportResponse(created, skipped, emailed);
    }

    // ==================== STUDENT MANAGEMENT ====================

    @Transactional
    public StudentDto createStudent(School school, CreateStudentRequest req) {
        // Auto-generate student code if not provided
        String studentCode = req.studentCode();
        if (studentCode == null || studentCode.isBlank()) {
            studentCode = generateNextStudentCode(school);
        }

        // Check duplicate student code
        if (students.existsBySchoolAndStudentCode(school, studentCode)) {
            throw new ApiException(HttpStatus.CONFLICT, "Mã học sinh đã tồn tại: " + studentCode);
        }

        // Validate date of birth must be in the past
        if (req.dateOfBirth() != null && !req.dateOfBirth().isBefore(java.time.LocalDate.now())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Ngày sinh phải nhỏ hơn ngày hiện tại");
        }

        // Create student
        Student student = Student.builder()
                .studentCode(studentCode)
                .fullName(req.fullName())
                .dateOfBirth(req.dateOfBirth())
                .gender(req.gender())
                .birthPlace(req.birthPlace())
                .address(req.address())
                .email(req.email())
                .phone(req.phone())
                .enrollmentDate(req.enrollmentDate() != null ? req.enrollmentDate() : java.time.LocalDate.now())
                .status(StudentStatus.ACTIVE)
                .school(school)
                .build();

        student = students.save(student);

        // Save guardians
        if (req.guardians() != null && !req.guardians().isEmpty()) {
            for (CreateStudentRequest.GuardianRequest g : req.guardians()) {
                Guardian guardian = Guardian.builder()
                        .student(student)
                        .fullName(g.fullName())
                        .phone(g.phone())
                        .email(g.email())
                        .relationship(g.relationship())
                        .build();
                guardians.save(guardian);
            }
        }

        // Enroll in class if provided
        if (req.classId() != null) {
            ClassRoom classRoom = classRooms.findById(req.classId())
                    .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy lớp học"));

            if (!classRoom.getSchool().getId().equals(school.getId())) {
                throw new ApiException(HttpStatus.FORBIDDEN, "Lớp học không thuộc trường này");
            }

            // Check class is active
            if (classRoom.getStatus() != com.schoolmanagement.backend.domain.ClassRoomStatus.ACTIVE) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Không thể thêm học sinh vào lớp không hoạt động");
            }

            // Check class capacity
            long currentEnrollment = enrollments.countByClassRoom(classRoom);
            if (currentEnrollment >= classRoom.getMaxCapacity()) {
                throw new ApiException(HttpStatus.BAD_REQUEST,
                        "Lớp đã đủ sĩ số (" + classRoom.getMaxCapacity() + " học sinh)");
            }

            String academicYear = req.academicYear() != null ? req.academicYear() : classRoom.getAcademicYear();

            ClassEnrollment enrollment = ClassEnrollment.builder()
                    .student(student)
                    .classRoom(classRoom)
                    .academicYear(academicYear)
                    .enrolledAt(Instant.now())
                    .build();
            enrollments.save(enrollment);
        }

        return toStudentDto(student);
    }

    @Transactional(readOnly = true)
    public List<StudentDto> listStudents(School school) {
        return students.findAllBySchoolOrderByFullNameAsc(school).stream()
                .map(this::toStudentDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public StudentDto getStudent(School school, UUID studentId) {
        Student student = students.findById(studentId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy học sinh"));

        if (!student.getSchool().getId().equals(school.getId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Học sinh không thuộc trường này");
        }

        return toStudentDto(student);
    }

    @Transactional
    public void deleteStudent(School school, UUID studentId) {
        Student student = students.findById(studentId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy học sinh"));

        if (!student.getSchool().getId().equals(school.getId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Học sinh không thuộc trường này");
        }

        // Delete related records
        enrollments.deleteAllByStudent(student);
        guardians.deleteAllByStudent(student);
        students.delete(student);
    }

    /**
     * Generate next student code in format HS0001, HS0002, etc.
     */
    private String generateNextStudentCode(School school) {
        // Find the highest student code in the school
        Optional<Student> latestStudent = students.findTopBySchoolOrderByStudentCodeDesc(school);

        if (latestStudent.isEmpty()) {
            // First student in the school
            return "HS0001";
        }

        String lastCode = latestStudent.get().getStudentCode();

        // Try to extract number from code (e.g., "HS0001" -> 1)
        try {
            // Remove "HS" prefix and parse the number
            if (lastCode.startsWith("HS")) {
                int lastNumber = Integer.parseInt(lastCode.substring(2));
                int nextNumber = lastNumber + 1;
                // Format with leading zeros (4 digits)
                return String.format("HS%04d", nextNumber);
            }
        } catch (NumberFormatException e) {
            // If parsing fails, fall through to default
        }

        // If we can't parse the last code, count students and use that
        long studentCount = students.countBySchool(school);
        return String.format("HS%04d", studentCount + 1);
    }

    private StudentDto toStudentDto(Student student) {
        List<Guardian> studentGuardians = guardians.findAllByStudent(student);
        List<StudentDto.GuardianDto> guardianDtos = studentGuardians.stream()
                .map(g -> new StudentDto.GuardianDto(g.getId(), g.getFullName(), g.getPhone(), g.getEmail(),
                        g.getRelationship()))
                .toList();

        // Get current class enrollment
        String currentClassName = null;
        UUID currentClassId = null;
        Optional<ClassEnrollment> currentEnrollment = enrollments.findByStudentAndAcademicYear(student,
                classRooms.findFirstBySchoolOrderByAcademicYearDesc(student.getSchool())
                        .map(ClassRoom::getAcademicYear).orElse(""));
        if (currentEnrollment.isPresent()) {
            currentClassName = currentEnrollment.get().getClassRoom().getName();
            currentClassId = currentEnrollment.get().getClassRoom().getId();
        }

        return new StudentDto(
                student.getId(),
                student.getStudentCode(),
                student.getFullName(),
                student.getDateOfBirth(),
                student.getGender() != null ? student.getGender().name() : null,
                student.getBirthPlace(),
                student.getAddress(),
                student.getEmail(),
                student.getPhone(),
                student.getAvatarUrl(),
                student.getStatus().name(),
                student.getEnrollmentDate(),
                currentClassName,
                currentClassId,
                guardianDtos);
    }

    // ==================== STUDENT ACCOUNT MANAGEMENT ====================

    /**
     * Get list of students eligible for account creation:
     * - Status is ACTIVE
     * - Has email
     * - No user linked yet
     */
    @Transactional(readOnly = true)
    public List<StudentDto> getStudentsEligibleForAccount(School school) {
        return students.findAllBySchoolAndStatusAndUserIsNullAndEmailIsNotNull(school, StudentStatus.ACTIVE)
                .stream()
                .map(this::toStudentDto)
                .toList();
    }

    /**
     * Create account for a single student
     */
    @Transactional
    public UserDto createAccountForStudent(School school, UUID studentId) {
        Student student = students.findById(studentId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy học sinh"));

        // Validate student belongs to school
        if (!student.getSchool().getId().equals(school.getId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Học sinh không thuộc trường này");
        }

        // Validate status
        if (student.getStatus() != StudentStatus.ACTIVE) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Chỉ có thể tạo tài khoản cho học sinh đang theo học");
        }

        // Validate email
        if (student.getEmail() == null || student.getEmail().isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Học sinh chưa có email");
        }

        // Validate no existing user
        if (student.getUser() != null) {
            throw new ApiException(HttpStatus.CONFLICT, "Học sinh đã có tài khoản");
        }

        // Check email unique in Users table
        if (users.existsByEmailIgnoreCase(student.getEmail())) {
            throw new ApiException(HttpStatus.CONFLICT,
                    "Email đã được sử dụng cho tài khoản khác: " + student.getEmail());
        }

        // Generate temp password
        String tempPassword = RandomUtil.generateTempPassword(12);

        // Create user
        User user = User.builder()
                .email(student.getEmail())
                .fullName(student.getFullName())
                .role(Role.STUDENT)
                .school(school)
                .passwordHash(passwordEncoder.encode(tempPassword))
                .firstLogin(true)
                .enabled(true)
                .build();

        user = users.save(user);

        // Link user to student
        student.setUser(user);
        students.save(student);

        // Send email with temp password
        mailService.sendTempPasswordEmail(user.getEmail(), user.getFullName(), tempPassword);

        return new UserDto(user.getId(), user.getEmail(), user.getFullName(), user.getRole(), school.getId(),
                school.getCode());
    }

    /**
     * Create accounts for multiple students (bulk)
     */
    @Transactional
    public BulkAccountCreationResponse createAccountsForStudents(School school, List<UUID> studentIds) {
        int created = 0;
        int skipped = 0;
        List<String> errors = new ArrayList<>();

        for (UUID studentId : studentIds) {
            try {
                createAccountForStudent(school, studentId);
                created++;
            } catch (ApiException e) {
                skipped++;
                errors.add(studentId + ": " + e.getMessage());
            }
        }

        return new BulkAccountCreationResponse(created, skipped, errors);
    }
}
