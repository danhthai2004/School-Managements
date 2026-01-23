package com.schoolmanagement.backend.service;

import com.schoolmanagement.backend.domain.ClassDepartment;
import com.schoolmanagement.backend.domain.ClassRoomStatus;
import com.schoolmanagement.backend.domain.Gender;
import com.schoolmanagement.backend.domain.Role;
import com.schoolmanagement.backend.domain.StudentStatus;
import com.schoolmanagement.backend.domain.entity.*;
import com.schoolmanagement.backend.dto.*;
import com.schoolmanagement.backend.dto.request.CreateClassRoomRequest;
import com.schoolmanagement.backend.dto.request.CreateStudentRequest;
import com.schoolmanagement.backend.dto.request.UpdateStudentRequest;
import com.schoolmanagement.backend.dto.request.CreateTeacherRequest;
import com.schoolmanagement.backend.exception.ApiException;
import com.schoolmanagement.backend.repo.*;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDate;
import java.util.*;

@Service
public class SchoolAdminService {

    private final UserRepository users;
    private final ClassRoomRepository classRooms;
    private final StudentRepository students;
    private final GuardianRepository guardians;
    private final ClassEnrollmentRepository enrollments;
    private final TeacherRepository teachers;
    private final PasswordEncoder passwordEncoder;
    private final MailService mailService;

    public SchoolAdminService(UserRepository users, ClassRoomRepository classRooms,
            StudentRepository students, GuardianRepository guardians,
            ClassEnrollmentRepository enrollments, TeacherRepository teachers,
            PasswordEncoder passwordEncoder, MailService mailService) {
        this.users = users;
        this.classRooms = classRooms;
        this.students = students;
        this.guardians = guardians;
        this.enrollments = enrollments;
        this.passwordEncoder = passwordEncoder;
        this.mailService = mailService;
        this.teachers = teachers;
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

    @Transactional
    public StudentDto updateStudent(School school, UUID studentId, UpdateStudentRequest req) {
        Student student = students.findById(studentId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy học sinh"));

        if (!student.getSchool().getId().equals(school.getId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Học sinh không thuộc trường này");
        }

        // Validate date of birth must be in the past
        if (req.dateOfBirth() != null && !req.dateOfBirth().isBefore(java.time.LocalDate.now())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Ngày sinh phải nhỏ hơn ngày hiện tại");
        }

        // Update basic info
        student.setFullName(req.fullName());
        student.setDateOfBirth(req.dateOfBirth());
        student.setGender(req.gender());
        student.setBirthPlace(req.birthPlace());
        student.setAddress(req.address());
        student.setEmail(req.email());
        student.setPhone(req.phone());

        // Update status if provided
        if (req.status() != null) {
            student.setStatus(req.status());
        }

        student = students.save(student);

        // Update guardians - replace all existing guardians with new ones
        if (req.guardians() != null) {
            // Delete existing guardians
            guardians.deleteAllByStudent(student);

            // Create new guardians
            for (UpdateStudentRequest.GuardianRequest g : req.guardians()) {
                if (g.fullName() != null && !g.fullName().isBlank()) {
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
        }

        // Handle class enrollment change
        if (req.classId() != null) {
            // Get current enrollment for this academic year
            String academicYear = req.academicYear() != null ? req.academicYear()
                    : classRooms.findFirstBySchoolOrderByAcademicYearDesc(school)
                            .map(ClassRoom::getAcademicYear)
                            .orElse("");

            Optional<ClassEnrollment> currentEnrollment = enrollments.findByStudentAndAcademicYear(student,
                    academicYear);

            // Check if the class is changing
            boolean needsNewEnrollment = currentEnrollment.isEmpty() ||
                    !currentEnrollment.get().getClassRoom().getId().equals(req.classId());

            if (needsNewEnrollment) {
                ClassRoom newClass = classRooms.findById(req.classId())
                        .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy lớp học"));

                if (!newClass.getSchool().getId().equals(school.getId())) {
                    throw new ApiException(HttpStatus.FORBIDDEN, "Lớp học không thuộc trường này");
                }

                // Check class is active
                if (newClass.getStatus() != ClassRoomStatus.ACTIVE) {
                    throw new ApiException(HttpStatus.BAD_REQUEST, "Không thể chuyển học sinh vào lớp không hoạt động");
                }

                // Check class capacity (excluding current student if already in this class)
                long currentCount = enrollments.countByClassRoom(newClass);
                if (currentEnrollment.isPresent()
                        && currentEnrollment.get().getClassRoom().getId().equals(req.classId())) {
                    currentCount--; // Don't count current student
                }
                if (currentCount >= newClass.getMaxCapacity()) {
                    throw new ApiException(HttpStatus.BAD_REQUEST,
                            "Lớp đã đủ sĩ số (" + newClass.getMaxCapacity() + " học sinh)");
                }

                // Remove old enrollment if exists
                currentEnrollment.ifPresent(enrollments::delete);

                // Create new enrollment
                ClassEnrollment newEnrollment = ClassEnrollment.builder()
                        .student(student)
                        .classRoom(newClass)
                        .academicYear(academicYear)
                        .enrolledAt(Instant.now())
                        .build();
                enrollments.save(newEnrollment);
            }
        }

        return toStudentDto(student);
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

    // ==================== EXCEL IMPORT ====================

    /**
     * Import students from Excel file with optional auto class assignment
     */
    @Transactional
    public ImportStudentResult importStudentsFromExcel(School school, MultipartFile file,
            String academicYear, int grade, boolean autoAssign) {
        if (file == null || file.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "File Excel rỗng.");
        }

        String filename = file.getOriginalFilename();
        if (filename == null || (!filename.endsWith(".xlsx") && !filename.endsWith(".xls"))) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Vui lòng upload file Excel (.xlsx hoặc .xls)");
        }

        List<ImportStudentResult.ImportError> errors = new ArrayList<>();
        List<Student> createdStudents = new ArrayList<>();
        int totalRows = 0;
        int successCount = 0;
        int failedCount = 0;

        try (InputStream is = file.getInputStream();
                Workbook workbook = new XSSFWorkbook(is)) {

            Sheet sheet = workbook.getSheetAt(0);
            if (sheet == null) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "File Excel không có sheet nào.");
            }

            // Get header row to map column names
            Row headerRow = sheet.getRow(0);
            if (headerRow == null) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "File Excel không có header row.");
            }

            Map<String, Integer> columnMap = new HashMap<>();
            for (int i = 0; i < headerRow.getLastCellNum(); i++) {
                Cell cell = headerRow.getCell(i);
                if (cell != null) {
                    String header = getCellStringValue(cell).toLowerCase().trim();
                    columnMap.put(header, i);
                }
            }

            // Validate required columns
            if (!columnMap.containsKey("fullname") && !columnMap.containsKey("họ tên")
                    && !columnMap.containsKey("hoten")) {
                throw new ApiException(HttpStatus.BAD_REQUEST,
                        "File Excel phải có cột 'fullName' hoặc 'Họ tên'");
            }

            // Process data rows
            for (int rowNum = 1; rowNum <= sheet.getLastRowNum(); rowNum++) {
                Row row = sheet.getRow(rowNum);
                if (row == null || isRowEmpty(row)) {
                    continue;
                }

                totalRows++;
                String studentName = "";

                try {
                    // Extract student data from row
                    studentName = getValueFromRow(row, columnMap, "fullname", "họ tên", "hoten");
                    if (studentName == null || studentName.isBlank()) {
                        errors.add(new ImportStudentResult.ImportError(rowNum + 1, "", "Thiếu họ tên"));
                        failedCount++;
                        continue;
                    }

                    // Parse date of birth
                    LocalDate dateOfBirth = parseDateFromRow(row, columnMap, "dateofbirth", "ngày sinh", "ngaysinh");

                    // Parse gender
                    Gender gender = parseGenderFromRow(row, columnMap, "gender", "giới tính", "gioitinh");

                    // Parse department
                    ClassDepartment department = parseDepartmentFromRow(row, columnMap, "department", "ban",
                            "phân ban");

                    // Other fields
                    String birthPlace = getValueFromRow(row, columnMap, "birthplace", "nơi sinh", "noisinh");
                    String address = getValueFromRow(row, columnMap, "address", "địa chỉ", "diachi");
                    String email = getValueFromRow(row, columnMap, "email");
                    String phone = getValueFromRow(row, columnMap, "phone", "sđt", "số điện thoại", "sodienthoai");

                    // Guardian info
                    String guardianName = getValueFromRow(row, columnMap, "guardianname", "tên phụ huynh",
                            "tenphuhuynh");
                    String guardianPhone = getValueFromRow(row, columnMap, "guardianphone", "sđt phụ huynh",
                            "sdtphuhuynh");
                    String guardianRelationship = getValueFromRow(row, columnMap, "guardianrelationship", "quan hệ",
                            "quanhe");

                    // Generate student code
                    String studentCode = generateNextStudentCode(school);

                    // Create student entity
                    Student student = Student.builder()
                            .studentCode(studentCode)
                            .fullName(studentName.trim())
                            .dateOfBirth(dateOfBirth)
                            .gender(gender)
                            .birthPlace(birthPlace)
                            .address(address)
                            .email(email)
                            .phone(phone)
                            .enrollmentDate(LocalDate.now())
                            .status(StudentStatus.ACTIVE)
                            .school(school)
                            .build();

                    student = students.save(student);
                    createdStudents.add(student);

                    // Save guardian if provided
                    if (guardianName != null && !guardianName.isBlank()) {
                        Guardian guardian = Guardian.builder()
                                .student(student)
                                .fullName(guardianName.trim())
                                .phone(guardianPhone)
                                .relationship(guardianRelationship)
                                .build();
                        guardians.save(guardian);
                    }

                    successCount++;

                } catch (Exception e) {
                    errors.add(new ImportStudentResult.ImportError(rowNum + 1, studentName,
                            "Lỗi: " + e.getMessage()));
                    failedCount++;
                }
            }

        } catch (ApiException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "Không đọc được file Excel: " + ex.getMessage());
        }

        // Auto assign students to classes if requested
        int assignedCount = 0;
        if (autoAssign && !createdStudents.isEmpty()) {
            assignedCount = autoAssignStudentsToClasses(school, createdStudents, academicYear, grade);
        }

        return new ImportStudentResult(totalRows, successCount, failedCount, assignedCount, errors);
    }

    /**
     * Auto-assign students to classes based on department
     * Uses round-robin distribution to balance class sizes
     */
    private int autoAssignStudentsToClasses(School school, List<Student> studentsToAssign,
            String academicYear, int grade) {
        int assignedCount = 0;

        // Group students by department (extracted during import, we'll need to store it
        // temporarily)
        // For now, assign to any available class in the grade
        List<ClassRoom> availableClasses = classRooms.findAllBySchoolAndGradeAndAcademicYearAndStatus(
                school, grade, academicYear, ClassRoomStatus.ACTIVE);

        if (availableClasses.isEmpty()) {
            return 0; // No classes available
        }

        // Get current enrollment counts for each class
        Map<UUID, Long> classEnrollmentCounts = new HashMap<>();
        for (ClassRoom classRoom : availableClasses) {
            classEnrollmentCounts.put(classRoom.getId(), enrollments.countByClassRoom(classRoom));
        }

        // Sort classes by current enrollment (ascending) to balance
        availableClasses.sort(Comparator.comparingLong(c -> classEnrollmentCounts.get(c.getId())));

        int classIndex = 0;
        for (Student student : studentsToAssign) {
            // Find next available class with capacity
            int attempts = 0;
            while (attempts < availableClasses.size()) {
                ClassRoom classRoom = availableClasses.get(classIndex % availableClasses.size());
                long currentCount = classEnrollmentCounts.get(classRoom.getId());

                if (currentCount < classRoom.getMaxCapacity()) {
                    // Assign student to this class
                    ClassEnrollment enrollment = ClassEnrollment.builder()
                            .student(student)
                            .classRoom(classRoom)
                            .academicYear(academicYear)
                            .enrolledAt(Instant.now())
                            .build();
                    enrollments.save(enrollment);

                    // Update count
                    classEnrollmentCounts.put(classRoom.getId(), currentCount + 1);
                    assignedCount++;
                    classIndex++;
                    break;
                }

                classIndex++;
                attempts++;
            }
        }

        return assignedCount;
    }

    // ==================== EXCEL HELPER METHODS ====================

    private String getCellStringValue(Cell cell) {
        if (cell == null)
            return "";

        return switch (cell.getCellType()) {
            case STRING -> cell.getStringCellValue();
            case NUMERIC -> {
                if (DateUtil.isCellDateFormatted(cell)) {
                    yield cell.getLocalDateTimeCellValue().toLocalDate().toString();
                }
                double value = cell.getNumericCellValue();
                if (value == Math.floor(value)) {
                    yield String.valueOf((long) value);
                }
                yield String.valueOf(value);
            }
            case BOOLEAN -> String.valueOf(cell.getBooleanCellValue());
            case FORMULA -> {
                try {
                    yield cell.getStringCellValue();
                } catch (Exception e) {
                    yield String.valueOf(cell.getNumericCellValue());
                }
            }
            default -> "";
        };
    }

    private boolean isRowEmpty(Row row) {
        for (int i = 0; i < row.getLastCellNum(); i++) {
            Cell cell = row.getCell(i);
            if (cell != null && !getCellStringValue(cell).isBlank()) {
                return false;
            }
        }
        return true;
    }

    private String getValueFromRow(Row row, Map<String, Integer> columnMap, String... possibleNames) {
        for (String name : possibleNames) {
            Integer colIndex = columnMap.get(name.toLowerCase());
            if (colIndex != null) {
                Cell cell = row.getCell(colIndex);
                if (cell != null) {
                    String value = getCellStringValue(cell);
                    if (!value.isBlank()) {
                        return value.trim();
                    }
                }
            }
        }
        return null;
    }

    private LocalDate parseDateFromRow(Row row, Map<String, Integer> columnMap, String... possibleNames) {
        for (String name : possibleNames) {
            Integer colIndex = columnMap.get(name.toLowerCase());
            if (colIndex != null) {
                Cell cell = row.getCell(colIndex);
                if (cell != null) {
                    if (cell.getCellType() == CellType.NUMERIC && DateUtil.isCellDateFormatted(cell)) {
                        return cell.getLocalDateTimeCellValue().toLocalDate();
                    } else {
                        String dateStr = getCellStringValue(cell);
                        if (!dateStr.isBlank()) {
                            return parseDate(dateStr);
                        }
                    }
                }
            }
        }
        return null;
    }

    private LocalDate parseDate(String dateStr) {
        if (dateStr == null || dateStr.isBlank())
            return null;

        // Try different date formats
        String[] formats = { "dd/MM/yyyy", "d/M/yyyy", "yyyy-MM-dd", "dd-MM-yyyy" };

        for (String format : formats) {
            try {
                java.time.format.DateTimeFormatter formatter = java.time.format.DateTimeFormatter.ofPattern(format);
                return LocalDate.parse(dateStr, formatter);
            } catch (Exception ignored) {
            }
        }

        return null;
    }

    private Gender parseGenderFromRow(Row row, Map<String, Integer> columnMap, String... possibleNames) {
        String value = getValueFromRow(row, columnMap, possibleNames);
        if (value == null)
            return null;

        value = value.toLowerCase().trim();
        if (value.equals("nam") || value.equals("male") || value.equals("m")) {
            return Gender.MALE;
        } else if (value.equals("nữ") || value.equals("nu") || value.equals("female") || value.equals("f")) {
            return Gender.FEMALE;
        } else if (value.equals("khác") || value.equals("khac") || value.equals("other")) {
            return Gender.OTHER;
        }
        return null;
    }

    private ClassDepartment parseDepartmentFromRow(Row row, Map<String, Integer> columnMap, String... possibleNames) {
        String value = getValueFromRow(row, columnMap, possibleNames);
        if (value == null)
            return ClassDepartment.KHONG_PHAN_BAN;

        value = value.toLowerCase().trim();
        if (value.contains("tự nhiên") || value.contains("tu nhien") || value.equals("tn") || value.equals("a")) {
            return ClassDepartment.TU_NHIEN;
        } else if (value.contains("xã hội") || value.contains("xa hoi") || value.equals("xh") || value.equals("c")) {
            return ClassDepartment.XA_HOI;
        }
        return ClassDepartment.KHONG_PHAN_BAN;
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
    // ==================== TEACHER MANAGEMENT ====================

    @Transactional
    public TeacherDto createTeacher(School school, CreateTeacherRequest req) {
        // Auto-generate teacher code if not provided
        String teacherCode = req.teacherCode();
        if (teacherCode == null || teacherCode.isBlank()) {
            teacherCode = generateNextTeacherCode(school);
        }

        // Check duplicate teacher code
        if (teachers.existsBySchoolAndTeacherCode(school, teacherCode)) {
            throw new ApiException(HttpStatus.CONFLICT, "Mã giáo viên đã tồn tại: " + teacherCode);
        }

        // Validate date of birth
        if (req.dateOfBirth() != null && !req.dateOfBirth().isBefore(java.time.LocalDate.now())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Ngày sinh phải nhỏ hơn ngày hiện tại");
        }

        // Validate email uniqueness if provided
        if (req.email() != null && !req.email().isBlank()) {
            if (teachers.existsByEmailIgnoreCase(req.email())) {
                throw new ApiException(HttpStatus.CONFLICT, "Email giáo viên đã tồn tại trong hệ thống");
            }
        }

        // Create teacher
        Teacher teacher = Teacher.builder()
                .teacherCode(teacherCode)
                .fullName(req.fullName())
                .dateOfBirth(req.dateOfBirth())
                .gender(req.gender())
                .address(req.address())
                .email(req.email())
                .phone(req.phone())
                .specialization(req.specialization())
                .degree(req.degree())
                .school(school)
                .status("ACTIVE")
                .build();

        teacher = teachers.save(teacher);

        // Create account if requested
        if (req.createAccount() && req.email() != null && !req.email().isBlank()) {
            // Check if email already used for an account
            if (users.existsByEmailIgnoreCase(req.email())) {
                // If user exists, we might want to link it (if role is TEACHER), or error.
                // For simplicity, error if email conflict.
                throw new ApiException(HttpStatus.CONFLICT, "Email đã được sử dụng cho một tài khoản khác");
            }

            String tempPassword = RandomUtil.generateTempPassword(12);
            User user = User.builder()
                    .email(req.email())
                    .fullName(req.fullName())
                    .role(Role.TEACHER)
                    .school(school)
                    .passwordHash(passwordEncoder.encode(tempPassword))
                    .firstLogin(true)
                    .enabled(true)
                    .build();

            user = users.save(user);
            teacher.setUser(user);
            teachers.save(teacher);

            mailService.sendTempPasswordEmail(user.getEmail(), user.getFullName(), tempPassword);
        }

        return toTeacherDto(teacher);
    }

    @Transactional(readOnly = true)
    public List<TeacherDto> listTeachersProfile(School school) {
        return teachers.findAllBySchoolOrderByTeacherCodeAsc(school).stream()
                .map(this::toTeacherDto)
                .toList();
    }

    @Transactional
    public TeacherDto updateTeacher(School school, UUID teacherId, CreateTeacherRequest req) {
        Teacher teacher = teachers.findById(teacherId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy giáo viên"));

        if (!teacher.getSchool().getId().equals(school.getId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Giáo viên không thuộc trường này");
        }

        // Validate date of birth
        if (req.dateOfBirth() != null && !req.dateOfBirth().isBefore(java.time.LocalDate.now())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Ngày sinh phải nhỏ hơn ngày hiện tại");
        }

        // Validate email uniqueness if changed
        if (req.email() != null && !req.email().isBlank()) {
            if (!req.email().equalsIgnoreCase(teacher.getEmail()) && teachers.existsByEmailIgnoreCase(req.email())) {
                throw new ApiException(HttpStatus.CONFLICT, "Email giáo viên đã tồn tại trong hệ thống");
            }
        }

        // Update fields
        teacher.setFullName(req.fullName());
        teacher.setDateOfBirth(req.dateOfBirth());
        teacher.setGender(req.gender());
        teacher.setAddress(req.address());
        teacher.setEmail(req.email());
        teacher.setPhone(req.phone());
        teacher.setSpecialization(req.specialization());
        teacher.setDegree(req.degree());

        teacher = teachers.save(teacher);
        return toTeacherDto(teacher);
    }

    @Transactional
    public void deleteTeacher(School school, UUID teacherId) {
        Teacher teacher = teachers.findById(teacherId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy giáo viên"));

        if (!teacher.getSchool().getId().equals(school.getId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Giáo viên không thuộc trường này");
        }

        // Check if teacher is homeroom teacher of any class
        if (teacher.getUser() != null) {
            var homeroomClass = classRooms.findByHomeroomTeacher(teacher.getUser());
            if (homeroomClass.isPresent()) {
                throw new ApiException(HttpStatus.CONFLICT,
                        "Không thể xóa giáo viên đang chủ nhiệm lớp " + homeroomClass.get().getName());
            }
        }

        teachers.delete(teacher);
    }

    private String generateNextTeacherCode(School school) {
        Optional<Teacher> latestTeacher = teachers.findTopBySchoolOrderByTeacherCodeDesc(school);
        if (latestTeacher.isEmpty()) {
            return "GV0001";
        }
        String lastCode = latestTeacher.get().getTeacherCode();
        try {
            if (lastCode.startsWith("GV")) {
                int lastNumber = Integer.parseInt(lastCode.substring(2));
                return String.format("GV%04d", lastNumber + 1);
            }
        } catch (NumberFormatException ignored) {
        }

        long count = teachers.count(); // fallback
        return String.format("GV%04d", count + 1);
    }

    private TeacherDto toTeacherDto(Teacher teacher) {
        // Find homeroom class for this teacher
        UUID homeroomClassId = null;
        String homeroomClassName = null;

        if (teacher.getUser() != null) {
            var homeroomClass = classRooms.findByHomeroomTeacher(teacher.getUser());
            if (homeroomClass.isPresent()) {
                homeroomClassId = homeroomClass.get().getId();
                homeroomClassName = homeroomClass.get().getName();
            }
        }

        return new TeacherDto(
                teacher.getId(),
                teacher.getTeacherCode(),
                teacher.getFullName(),
                teacher.getDateOfBirth(),
                teacher.getGender() != null ? teacher.getGender().name() : null,
                teacher.getAddress(),
                teacher.getEmail(),
                teacher.getPhone(),
                teacher.getSpecialization(),
                teacher.getDegree(),
                teacher.getStatus(),
                homeroomClassId,
                homeroomClassName,
                null);
    }
}
