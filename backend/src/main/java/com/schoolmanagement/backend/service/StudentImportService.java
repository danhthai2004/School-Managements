package com.schoolmanagement.backend.service;

import com.schoolmanagement.backend.domain.ClassDepartment;
import com.schoolmanagement.backend.domain.ClassRoomStatus;
import com.schoolmanagement.backend.domain.Gender;
import com.schoolmanagement.backend.domain.StudentStatus;
import com.schoolmanagement.backend.domain.entity.*;
import com.schoolmanagement.backend.dto.ImportStudentResult;
import com.schoolmanagement.backend.exception.ApiException;
import com.schoolmanagement.backend.repo.ClassEnrollmentRepository;
import com.schoolmanagement.backend.repo.ClassRoomRepository;
import com.schoolmanagement.backend.repo.GuardianRepository;
import com.schoolmanagement.backend.repo.StudentRepository;
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

    public StudentImportService(StudentRepository students, GuardianRepository guardians,
            ClassRoomRepository classRooms, ClassEnrollmentRepository enrollments) {
        this.students = students;
        this.guardians = guardians;
        this.classRooms = classRooms;
        this.enrollments = enrollments;
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
        // Use a map to store student along with their department for assignment
        Map<Student, ClassDepartment> studentDepartmentMap = new LinkedHashMap<>(); // Preserve order
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

                    // Store student with their parsed department (can be null if not provided)
                    studentDepartmentMap.put(student, department);

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
        if (autoAssign && !studentDepartmentMap.isEmpty()) {
            assignedCount = autoAssignStudentsToClasses(school, studentDepartmentMap, academicYear, grade);
        }

        return new ImportStudentResult(totalRows, successCount, failedCount, assignedCount, errors);
    }

    /**
     * Auto-assign students to classes based on department
     * Uses round-robin distribution to balance class sizes
     */
    private int autoAssignStudentsToClasses(School school, Map<Student, ClassDepartment> studentDepartmentMap,
            String academicYear, int grade) {
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

        for (Map.Entry<Student, ClassDepartment> entry : studentDepartmentMap.entrySet()) {
            Student student = entry.getKey();
            ClassDepartment studentDept = entry.getValue();

            // Filter classes matching student's department
            List<ClassRoom> candidateClasses = allClasses.stream()
                    .filter(c -> matchesDepartment(c, studentDept))
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

    private boolean matchesDepartment(ClassRoom classRoom, ClassDepartment studentDept) {
        // If student has no department or is KHONG_PHAN_BAN, they can go to any class
        // BUT ideally we prefer KHONG_PHAN_BAN classes if any.
        // For simplicity: if student dept is null/NONE, return true (can be assigned
        // anywhere,
        // sorting logic will prefer emptier classes)
        if (studentDept == null || studentDept == ClassDepartment.KHONG_PHAN_BAN) {
            return true;
        }

        // Check combination stream first (stronger link)
        if (classRoom.getCombination() != null && classRoom.getCombination().getStream() != null) {
            String streamName = classRoom.getCombination().getStream().name();
            // Assuming StreamType names match ClassDepartment names (TU_NHIEN, XA_HOI)
            if (streamName.equals(studentDept.name())) {
                return true;
            }
        }

        // Check class department as fallback
        if (classRoom.getDepartment() == studentDept) {
            return true;
        }

        return false;
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
