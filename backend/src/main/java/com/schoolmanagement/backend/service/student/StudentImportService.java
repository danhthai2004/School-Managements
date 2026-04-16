package com.schoolmanagement.backend.service.student;

import com.schoolmanagement.backend.domain.entity.auth.User;
import com.schoolmanagement.backend.domain.auth.Role;
import com.schoolmanagement.backend.domain.entity.student.Guardian;
import com.schoolmanagement.backend.domain.entity.classes.ClassRoom;
import com.schoolmanagement.backend.domain.entity.classes.ClassEnrollment;

import com.schoolmanagement.backend.domain.entity.admin.School;
import com.schoolmanagement.backend.domain.entity.student.Student;
import com.schoolmanagement.backend.domain.entity.classes.Combination;

import com.schoolmanagement.backend.domain.classes.ClassRoomStatus;
import com.schoolmanagement.backend.domain.student.Gender;
import com.schoolmanagement.backend.domain.student.StudentStatus;

import com.schoolmanagement.backend.dto.student.ImportStudentResult;
import com.schoolmanagement.backend.exception.ApiException;
import com.schoolmanagement.backend.repo.auth.UserRepository;
import com.schoolmanagement.backend.repo.classes.ClassEnrollmentRepository;
import com.schoolmanagement.backend.repo.classes.ClassRoomRepository;
import com.schoolmanagement.backend.repo.student.GuardianRepository;
import com.schoolmanagement.backend.repo.student.StudentRepository;
import com.schoolmanagement.backend.repo.classes.CombinationRepository;
import com.schoolmanagement.backend.domain.entity.admin.AcademicYear;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.time.Instant;
import java.time.LocalDate;
import java.util.*;

@Service
public class StudentImportService {

    private final StudentRepository students;
    private final GuardianRepository guardians;
    private final ClassRoomRepository classRooms;
    private final ClassEnrollmentRepository enrollments;
    private final com.schoolmanagement.backend.repo.auth.UserRepository users;
    private final com.schoolmanagement.backend.repo.classes.CombinationRepository combinations;

    public StudentImportService(StudentRepository students, GuardianRepository guardians,
            ClassRoomRepository classRooms, ClassEnrollmentRepository enrollments,
            UserRepository users,
            CombinationRepository combinations) {
        this.students = students;
        this.guardians = guardians;
        this.classRooms = classRooms;
        this.enrollments = enrollments;
        this.users = users;
        this.combinations = combinations;
    }

    // ==================== EXCEL IMPORT ====================

    /**
     * Import students from Excel file with optional auto class assignment
     */
    @Transactional
    public ImportStudentResult importStudentsFromExcel(School school, MultipartFile file,
            AcademicYear academicYear, int grade, boolean autoAssign) {
        if (file == null || file.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "File Excel rỗng.");
        }

        String filename = file.getOriginalFilename();
        if (filename == null || (!filename.endsWith(".xlsx") && !filename.endsWith(".xls"))) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Vui lòng upload file Excel (.xlsx hoặc .xls)");
        }

        List<ImportStudentResult.ImportError> errors = new ArrayList<>();
        // Use a map to store student along with their combination for assignment
        Map<Student, Combination> studentCombinationMap = new LinkedHashMap<>(); // Preserve order
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

                    // Parse combination
                    Combination combination = parseCombinationFromRow(row, columnMap, school, "tổ hợp", "combination",
                            "mã tổ hợp", "tohop");

                    // Other fields
                    String birthPlace = getValueFromRow(row, columnMap, "birthplace", "nơi sinh", "noisinh");
                    String address = getValueFromRow(row, columnMap, "address", "địa chỉ", "diachi");
                    String email = getValueFromRow(row, columnMap, "email");
                    if (email != null && !email.isBlank()) {
                        email = email.trim().toLowerCase();
                        // Check 1: Email already used by a student who has an account
                        if (students.existsByEmailAndUserIsNotNull(email)) {
                            errors.add(new ImportStudentResult.ImportError(rowNum + 1, studentName,
                                    "Email đã tồn tại trong hệ thống (Học sinh đã có tài khoản): " + email));
                            failedCount++;
                            continue;
                        }
                        // Check 2: Email used by a guardian
                        if (!guardians.findByEmailIgnoreCase(email).isEmpty()) {
                            errors.add(new ImportStudentResult.ImportError(rowNum + 1, studentName,
                                    "Email trùng với Phụ huynh: " + email));
                            failedCount++;
                            continue;
                        }
                        // Check 3: Email used by a user account with a different role
                        Optional<User> u = users.findByEmailIgnoreCase(email);
                        if (u.isPresent() && u.get().getRole() != Role.STUDENT) {
                            errors.add(new ImportStudentResult.ImportError(rowNum + 1, studentName,
                                    "Email đã được sử dụng bởi tài khoản: " + u.get().getRole()));
                            failedCount++;
                            continue;
                        }
                    }

                    String phone = getValueFromRow(row, columnMap, "phone", "sđt", "số điện thoại", "sodienthoai");

                    // Guardian info
                    String guardianName = getValueFromRow(row, columnMap, "guardianname", "tên phụ huynh",
                            "tenphuhuynh");
                    String guardianPhone = getValueFromRow(row, columnMap, "guardianphone", "sđt phụ huynh",
                            "sdtphuhuynh");
                    String guardianRelationship = getValueFromRow(row, columnMap, "guardianrelationship",
                            "quan hệ", "quanhe", "mối quan hệ");

                    // Sanitize guardian email early for validation
                    String guardianEmail = null;
                    String rawGuardianEmail = getValueFromRow(row, columnMap, "guardianemail", "email phụ huynh",
                            "emailphuhuynh");
                    if (rawGuardianEmail != null && !rawGuardianEmail.isBlank()) {
                        guardianEmail = rawGuardianEmail.trim().toLowerCase();
                        // Validation: Guardian Email must not be used by Student
                        if (students.existsByEmail(guardianEmail)) {
                            errors.add(new ImportStudentResult.ImportError(rowNum + 1, studentName,
                                    "Email phụ huynh trùng với email của một Học sinh."));
                            failedCount++;
                            continue;
                        }
                        // Check collision with Student Email in THIS ROW
                        if (email != null && email.equals(guardianEmail)) {
                            errors.add(new ImportStudentResult.ImportError(rowNum + 1, studentName,
                                    "Email học sinh và phụ huynh không được trùng nhau."));
                            failedCount++;
                            continue;
                        }

                        Optional<User> u = users.findByEmailIgnoreCase(guardianEmail);
                        if (u.isPresent() && u.get().getRole() != Role.GUARDIAN) {
                            errors.add(new ImportStudentResult.ImportError(rowNum + 1, studentName,
                                    "Email phụ huynh đã được sử dụng bởi tài khoản " + u.get().getRole()));
                            failedCount++;
                            continue;
                        }
                    }

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

                    // Store student with their parsed combination (can be null if not provided)
                    if (combination != null) {
                        studentCombinationMap.put(student, combination);
                    }

                    // Process Guardian Logic (Many-to-One Refactor)
                    if (guardianName != null && !guardianName.isBlank()) {
                        Guardian guardian = null;

                        // Sanitize email
                        // String guardianEmail = null; // Already parsed above
                        // String rawGuardianEmail = getValueFromRow(row, columnMap, "guardianemail",
                        // "email phụ huynh",
                        // "emailphuhuynh");
                        // if (rawGuardianEmail != null && !rawGuardianEmail.isBlank()) {
                        // guardianEmail = rawGuardianEmail.trim().toLowerCase();
                        // }

                        if (guardianEmail != null) {
                            // Case 1: Has Email -> Find or Create
                            List<Guardian> existingGuardians = guardians.findByEmailIgnoreCase(guardianEmail);
                            if (!existingGuardians.isEmpty()) {
                                guardian = existingGuardians.get(0);
                            } else {
                                // Create new
                                guardian = Guardian.builder()
                                        .fullName(guardianName.trim())
                                        .phone(guardianPhone)
                                        .email(guardianEmail)
                                        .relationship(guardianRelationship)
                                        .build();
                                guardian = guardians.save(guardian);
                            }
                        } else {
                            // Case 2: No Email -> Force Create (No User Account)
                            guardian = Guardian.builder()
                                    .fullName(guardianName.trim())
                                    .phone(guardianPhone)
                                    .email(null)
                                    .relationship(guardianRelationship)
                                    .build();
                            guardian = guardians.save(guardian);
                        }

                        // Link directly to student
                        student.setGuardian(guardian);
                        students.save(student);
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
        if (autoAssign && !studentCombinationMap.isEmpty()) {
            assignedCount = autoAssignStudentsToClasses(school, studentCombinationMap, academicYear, grade);
        }

        return new ImportStudentResult(totalRows, successCount, failedCount, assignedCount, errors);
    }

    /**
     * Auto-assign students to classes based on combination
     * Uses round-robin distribution to balance class sizes
     */
    private int autoAssignStudentsToClasses(School school, Map<Student, Combination> studentCombinationMap,
            AcademicYear academicYear, int grade) {
        int assignedCount = 0;

        // Get all available classes
        List<ClassRoom> allClasses = classRooms.findAllBySchoolAndGradeAndAcademicYearAndStatus(
                school, grade, academicYear, ClassRoomStatus.ACTIVE);

        if (allClasses.isEmpty()) {
            return 0; // No classes available
        }

        // Get current enrollment counts for each class
        Map<UUID, Long> classEnrollmentCounts = new HashMap<>();
        for (ClassRoom classRoom : allClasses) {
            classEnrollmentCounts.put(classRoom.getId(), enrollments.countByClassRoom(classRoom));
        }

        for (Map.Entry<Student, Combination> entry : studentCombinationMap.entrySet()) {
            Student student = entry.getKey();
            Combination studentComb = entry.getValue();

            // Filter classes matching student's combination
            List<ClassRoom> candidateClasses = allClasses.stream()
                    .filter(c -> c.getCombination() != null && c.getCombination().getId().equals(studentComb.getId()))
                    .sorted(Comparator.comparingLong(c -> classEnrollmentCounts.get(c.getId())))
                    .toList();

            // If no matching classes found (e.g. specialized stream student but no
            // specialized class),
            // fallback to any class with space (or maybe skip? for now fallback to any
            // class)
            if (candidateClasses.isEmpty()) {
                candidateClasses = allClasses.stream()
                        .sorted(Comparator.comparingLong(c -> classEnrollmentCounts.get(c.getId())))
                        .toList();
            }

            // Try to assign to the class with least students that has capacity
            for (ClassRoom classRoom : candidateClasses) {
                long currentCount = classEnrollmentCounts.get(classRoom.getId());
                if (currentCount < classRoom.getMaxCapacity()) {
                    // Assign
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

                    // Update student current class name (optional but good for consistency if we
                    // have that field denormalized)
                    // student.setCurrentClassName(classRoom.getName());
                    // students.save(student);

                    break; // Move to next student
                }
            }
        }

        return assignedCount;
    }

    // Removal of matchesDepartment

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

    private Combination parseCombinationFromRow(Row row, Map<String, Integer> columnMap, School school,
            String... possibleNames) {
        String value = getValueFromRow(row, columnMap, possibleNames);
        if (value == null || value.isBlank())
            return null;

        String searchVal = value.toLowerCase().trim();
        List<Combination> allCombs = combinations.findAllBySchool(school);

        for (Combination combinationItem : allCombs) {
            String code = combinationItem.getCode() != null ? combinationItem.getCode().toLowerCase().trim() : "";
            String name = combinationItem.getName() != null ? combinationItem.getName().toLowerCase().trim() : "";
            if (code.equals(searchVal) || name.equals(searchVal) || name.contains(searchVal)) {
                return combinationItem;
            }
        }

        return null;
    }

    // Copied from SchoolAdminService to be self-contained
    private String generateNextStudentCode(School school) {
        // Find the highest student code in the school
        Optional<Student> latestStudent = students.findTopBySchoolOrderByStudentCodeDesc(school);

        if (latestStudent.isEmpty()) {
            return "HS0001";
        }

        String lastCode = latestStudent.get().getStudentCode();

        try {
            if (lastCode.startsWith("HS")) {
                int lastNumber = Integer.parseInt(lastCode.substring(2));
                int nextNumber = lastNumber + 1;
                return String.format("HS%04d", nextNumber);
            }
        } catch (NumberFormatException e) {
            // If parsing fails, fall through to default
        }

        long studentCount = students.countBySchool(school);
        return String.format("HS%04d", studentCount + 1);
    }
}
