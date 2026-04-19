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
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDate;
import java.util.*;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;

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
        if (filename == null
                || (!filename.endsWith(".xlsx") && !filename.endsWith(".xls") && !filename.endsWith(".csv"))) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Vui lòng upload file Excel (.xlsx, .xls) hoặc CSV (.csv)");
        }

        List<ImportStudentResult.ImportError> errors = new ArrayList<>();
        Map<Student, Combination> studentCombinationMap = new LinkedHashMap<>();
        int totalRows = 0;
        int successCount = 0;
        int failedCount = 0;

        List<ParsedRow> parsedRows = new ArrayList<>();

        try {
            if (filename.toLowerCase().endsWith(".csv")) {
                try (InputStreamReader reader = new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8);
                        CSVParser csvParser = new CSVParser(reader,
                                CSVFormat.DEFAULT.builder().setHeader().setSkipHeaderRecord(true).build())) {

                    List<String> headers = csvParser.getHeaderNames();
                    for (CSVRecord record : csvParser) {
                        Map<String, String> data = new HashMap<>();
                        for (String h : headers) {
                            if (h != null)
                                data.put(h.toLowerCase().trim(), record.get(h));
                        }
                        parsedRows.add(new ParsedRow((int) record.getRecordNumber() + 1, data));
                    }
                }
            } else {
                try (InputStream is = file.getInputStream();
                        Workbook workbook = new XSSFWorkbook(is)) {

                    Sheet sheet = workbook.getSheetAt(0);
                    if (sheet == null)
                        throw new ApiException(HttpStatus.BAD_REQUEST, "File không có sheet nào.");

                    Row headerRow = sheet.getRow(0);
                    if (headerRow == null)
                        throw new ApiException(HttpStatus.BAD_REQUEST, "File không có header row.");

                    Map<Integer, String> colIndexToHeader = new HashMap<>();
                    for (int i = 0; i < headerRow.getLastCellNum(); i++) {
                        Cell cell = headerRow.getCell(i);
                        if (cell != null) {
                            colIndexToHeader.put(i, getCellStringValue(cell).toLowerCase().trim());
                        }
                    }

                    for (int rowNum = 1; rowNum <= sheet.getLastRowNum(); rowNum++) {
                        Row row = sheet.getRow(rowNum);
                        if (row == null)
                            continue;
                        Map<String, String> data = new HashMap<>();
                        for (Map.Entry<Integer, String> entry : colIndexToHeader.entrySet()) {
                            Cell cell = row.getCell(entry.getKey());
                            if (cell != null) {
                                data.put(entry.getValue(), getCellStringValue(cell));
                            }
                        }
                        parsedRows.add(new ParsedRow(rowNum + 1, data));
                    }
                }
            }

            if (!parsedRows.isEmpty()) {
                Set<String> headers = parsedRows.get(0).data.keySet();
                if (!headers.contains("fullname") && !headers.contains("họ tên") && !headers.contains("hoten")) {
                    throw new ApiException(HttpStatus.BAD_REQUEST, "File phải có cột 'fullName' hoặc 'Họ tên'");
                }
            }

            // === PRE-LOAD lookup data ONCE (avoids N+1 queries) ===
            List<Combination> allCombinations = combinations.findAllBySchool(school);
            List<Guardian> allGuardians = guardians.findAll();
            Map<String, Guardian> guardianEmailMap = new HashMap<>();
            for (Guardian g : allGuardians) {
                if (g.getEmail() != null) {
                    guardianEmailMap.put(g.getEmail().toLowerCase(), g);
                }
            }
            Set<String> existingGuardianEmails = guardianEmailMap.keySet();

            List<User> allUsers = users.findAll();
            Map<String, User> userEmailMap = new HashMap<>();
            for (User u : allUsers) {
                if (u.getEmail() != null) {
                    userEmailMap.put(u.getEmail().toLowerCase(), u);
                }
            }

            Set<String> existingStudentEmails = new HashSet<>();
            for (Student s : students.findAllBySchoolOrderByFullNameAsc(school)) {
                if (s.getEmail() != null)
                    existingStudentEmails.add(s.getEmail().toLowerCase());
            }

            // Pre-compute student code counter (avoid N queries)
            int nextCodeNumber = getNextStudentCodeNumber(school);

            // Process data rows
            for (ParsedRow row : parsedRows) {
                if (row.isEmpty())
                    continue;

                totalRows++;
                String studentName = "";

                try {
                    studentName = row.getValue("fullname", "họ tên", "hoten");
                    if (studentName == null || studentName.isBlank()) {
                        errors.add(new ImportStudentResult.ImportError(row.rowNum, "", "Thiếu họ tên"));
                        failedCount++;
                        continue;
                    }

                    LocalDate dateOfBirth = parseDateFromRow(row, "dateofbirth", "ngày sinh", "ngaysinh");
                    Gender gender = parseGenderFromRow(row, "gender", "giới tính", "gioitinh");
                    Combination combination = findCombinationFromList(row, allCombinations, "tổ hợp", "combination",
                            "mã tổ hợp", "tohop");

                    String birthPlace = row.getValue("birthplace", "nơi sinh", "noisinh");
                    String address = row.getValue("address", "địa chỉ", "diachi");
                    String email = row.getValue("email");
                    if (email != null && !email.isBlank()) {
                        email = email.trim().toLowerCase();

                        // 1. Kiểm tra xem Email có trùng với bất kỳ Phụ huynh nào đã tồn tại không
                        // (Dùng cache O(1))
                        if (existingGuardianEmails.contains(email)) {
                            errors.add(new ImportStudentResult.ImportError(row.rowNum, studentName,
                                    "Email trùng với một Phụ huynh đã tồn tại trong hệ thống: " + email));
                            failedCount++;
                            continue;
                        }

                        // 2. Kiểm tra tài khoản User (Dùng cache O(1))
                        User existingUser = userEmailMap.get(email);
                        if (existingUser != null) {
                            // Nếu email đã có tài khoản nhưng không phải role STUDENT
                            if (existingUser.getRole() != Role.STUDENT) {
                                errors.add(new ImportStudentResult.ImportError(row.rowNum, studentName,
                                        "Email đã được sử dụng bởi một tài khoản khác với vai trò: "
                                                + existingUser.getRole()));
                                failedCount++;
                                continue;
                            }
                            // Nếu là STUDENT rồi, nghĩa là học sinh này đã có tài khoản (Giống check 1 ở
                            // nhánh HEAD)
                            else {
                                errors.add(new ImportStudentResult.ImportError(row.rowNum, studentName,
                                        "Học sinh với email này đã có tài khoản trong hệ thống: " + email));
                                failedCount++;
                                continue;
                            }
                        }
                    }

                    String phone = row.getValue("phone", "sđt", "số điện thoại", "sodienthoai");

                    String guardianName = row.getValue("guardianname", "tên phụ huynh", "tenphuhuynh");
                    String guardianPhone = row.getValue("guardianphone", "sđt phụ huynh", "sdtphuhuynh");
                    String guardianRelationship = row.getValue("guardianrelationship", "quan hệ", "quanhe",
                            "mối quan hệ");

                    String guardianEmail = null;
                    String rawGuardianEmail = row.getValue("guardianemail", "email phụ huynh", "emailphuhuynh");
                    if (rawGuardianEmail != null && !rawGuardianEmail.isBlank()) {
                        guardianEmail = rawGuardianEmail.trim().toLowerCase();
                        // Validation: Guardian Email must not be used by Student
                        if (existingStudentEmails.contains(guardianEmail)) {
                            errors.add(new ImportStudentResult.ImportError(row.rowNum, studentName,
                                    "Email phụ huynh trùng với email của một Học sinh."));
                            failedCount++;
                            continue;
                        }
                        // Check collision with Student Email in THIS ROW
                        if (email != null && email.equals(guardianEmail)) {
                            errors.add(new ImportStudentResult.ImportError(row.rowNum, studentName,
                                    "Email học sinh và phụ huynh không được trùng nhau."));
                            failedCount++;
                            continue;
                        }

                        User existingGuardianUser = userEmailMap.get(guardianEmail);
                        if (existingGuardianUser != null && existingGuardianUser.getRole() != Role.GUARDIAN) {
                            errors.add(new ImportStudentResult.ImportError(row.rowNum, studentName,
                                    "Email phụ huynh đã được sử dụng bởi tài khoản " + existingGuardianUser.getRole()));
                            failedCount++;
                            continue;
                        }
                    }

                    // Generate student code from in-memory counter (no DB query)
                    String studentCode = String.format("HS%04d", nextCodeNumber++);
                    // Track new student email for intra-batch collision detection
                    if (email != null)
                        existingStudentEmails.add(email);

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

                        if (guardianEmail != null) {
                            // Case 1: Has Email -> Find from cache or Create
                            guardian = guardianEmailMap.get(guardianEmail);
                            if (guardian == null) {
                                guardian = Guardian.builder()
                                        .fullName(guardianName.trim())
                                        .phone(guardianPhone)
                                        .email(guardianEmail)
                                        .relationship(guardianRelationship)
                                        .build();
                                guardian = guardians.save(guardian);
                                guardianEmailMap.put(guardianEmail, guardian);
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

                        // Link directly to student (single save below)
                        student.setGuardian(guardian);
                        students.save(student);
                    }

                    successCount++;

                } catch (Exception e) {
                    errors.add(new ImportStudentResult.ImportError(row.rowNum, studentName, "Lỗi: " + e.getMessage()));
                    failedCount++;
                }
            }

        } catch (

        ApiException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Không đọc được file cấu trúc chung: " + ex.getMessage());
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

    private static class ParsedRow {
        final int rowNum;
        final Map<String, String> data;

        ParsedRow(int rowNum, Map<String, String> data) {
            this.rowNum = rowNum;
            this.data = data;
        }

        String getValue(String... possibleNames) {
            for (String name : possibleNames) {
                String val = data.get(name.toLowerCase());
                if (val != null && !val.isBlank())
                    return val.trim();
            }
            return null;
        }

        boolean isEmpty() {
            return data.values().stream().allMatch(v -> v == null || v.isBlank());
        }
    }

    private LocalDate parseDateFromRow(ParsedRow row, String... possibleNames) {
        String dateStr = row.getValue(possibleNames);
        return parseDate(dateStr);
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

    private Gender parseGenderFromRow(ParsedRow row, String... possibleNames) {
        String value = row.getValue(possibleNames);
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

    /**
     * Find combination from pre-loaded list (no DB query).
     */
    private Combination findCombinationFromList(ParsedRow row, List<Combination> allCombs, String... possibleNames) {
        String value = row.getValue(possibleNames);
        if (value == null || value.isBlank())
            return null;

        String searchVal = value.toLowerCase().trim();
        for (Combination combinationItem : allCombs) {
            String code = combinationItem.getCode() != null ? combinationItem.getCode().toLowerCase().trim() : "";
            String name = combinationItem.getName() != null ? combinationItem.getName().toLowerCase().trim() : "";
            if (code.equals(searchVal) || name.equals(searchVal) || name.contains(searchVal)) {
                return combinationItem;
            }
        }

        return null;
    }

    /**
     * Get the next student code number for in-memory counter.
     * Called ONCE before import loop, not per-row.
     */
    private int getNextStudentCodeNumber(School school) {
        Optional<Student> latestStudent = students.findTopBySchoolOrderByStudentCodeDesc(school);
        if (latestStudent.isEmpty())
            return 1;

        String lastCode = latestStudent.get().getStudentCode();
        try {
            if (lastCode.startsWith("HS")) {
                return Integer.parseInt(lastCode.substring(2)) + 1;
            }
        } catch (NumberFormatException e) {
            // fall through
        }
        return (int) students.countBySchool(school) + 1;
    }
}
