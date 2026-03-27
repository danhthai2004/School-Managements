package com.schoolmanagement.backend.service.teacher;

import com.schoolmanagement.backend.domain.student.Gender;
import com.schoolmanagement.backend.domain.entity.admin.School;
import com.schoolmanagement.backend.domain.entity.teacher.Teacher;
import com.schoolmanagement.backend.dto.teacher.ImportTeacherResult;
import com.schoolmanagement.backend.exception.ApiException;
import com.schoolmanagement.backend.repo.teacher.TeacherRepository;
import com.schoolmanagement.backend.repo.auth.UserRepository;
import com.schoolmanagement.backend.repo.student.StudentRepository;
import com.schoolmanagement.backend.repo.student.GuardianRepository;
import com.schoolmanagement.backend.domain.entity.auth.User;
import com.schoolmanagement.backend.domain.auth.Role;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.time.LocalDate;
import java.util.*;

@Service
public class TeacherImportService {

    private final TeacherRepository teachers;
    private final com.schoolmanagement.backend.repo.classes.SubjectRepository subjects;
    private final UserRepository users;
    private final StudentRepository students;
    private final GuardianRepository guardians;

    public TeacherImportService(TeacherRepository teachers,
            com.schoolmanagement.backend.repo.classes.SubjectRepository subjects,
            UserRepository users,
            StudentRepository students,
            GuardianRepository guardians) {
        this.teachers = teachers;
        this.subjects = subjects;
        this.users = users;
        this.students = students;
        this.guardians = guardians;
    }

    /**
     * Import teachers from Excel file
     * Required columns: fullName/Họ tên
     * Optional columns: dateOfBirth/Ngày sinh, gender/Giới tính, address/Địa chỉ,
     * email, phone/SĐT, specialization/Chuyên môn, degree/Bằng cấp
     */
    @Transactional
    public ImportTeacherResult importTeachersFromExcel(School school, MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "File Excel rỗng.");
        }

        String filename = file.getOriginalFilename();
        if (filename == null || (!filename.endsWith(".xlsx") && !filename.endsWith(".xls"))) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Vui lòng upload file Excel (.xlsx hoặc .xls)");
        }

        List<ImportTeacherResult.ImportError> errors = new ArrayList<>();
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
                String teacherName = "";

                try {
                    // Extract teacher data from row
                    teacherName = getValueFromRow(row, columnMap, "fullname", "họ tên", "hoten");
                    if (teacherName == null || teacherName.isBlank()) {
                        errors.add(new ImportTeacherResult.ImportError(rowNum + 1, "", "Thiếu họ tên"));
                        failedCount++;
                        continue;
                    }

                    // Parse date of birth
                    LocalDate dateOfBirth = parseDateFromRow(row, columnMap, "dateofbirth", "ngày sinh", "ngaysinh");

                    // Validate date of birth
                    if (dateOfBirth != null && !dateOfBirth.isBefore(LocalDate.now())) {
                        errors.add(new ImportTeacherResult.ImportError(rowNum + 1, teacherName,
                                "Ngày sinh phải nhỏ hơn ngày hiện tại"));
                        failedCount++;
                        continue;
                    }

                    // Parse gender
                    Gender gender = parseGenderFromRow(row, columnMap, "gender", "giới tính", "gioitinh");

                    // Other fields
                    String address = getValueFromRow(row, columnMap, "address", "địa chỉ", "diachi");
                    String email = getValueFromRow(row, columnMap, "email");
                    String phone = getValueFromRow(row, columnMap, "phone", "sđt", "số điện thoại", "sodienthoai");
                    String specialization = getValueFromRow(row, columnMap, "specialization", "chuyên môn",
                            "chuyenmon");
                    String degree = getValueFromRow(row, columnMap, "degree", "bằng cấp", "bangcap");

                    // Validate email uniqueness if provided
                    if (email != null && !email.isBlank()) {
                        String emailLower = email.trim().toLowerCase();
                        if (teachers.existsByEmailIgnoreCase(emailLower)) {
                            errors.add(new ImportTeacherResult.ImportError(rowNum + 1, teacherName,
                                    "Email đã tồn tại trong hệ thống (Giáo viên): " + email));
                            failedCount++;
                            continue;
                        }
                        if (students.existsByEmail(emailLower)) {
                            errors.add(new ImportTeacherResult.ImportError(rowNum + 1, teacherName,
                                    "Email trùng với Học sinh: " + email));
                            failedCount++;
                            continue;
                        }
                        if (!guardians.findByEmailIgnoreCase(emailLower).isEmpty()) {
                            errors.add(new ImportTeacherResult.ImportError(rowNum + 1, teacherName,
                                    "Email trùng với Phụ huynh: " + email));
                            failedCount++;
                            continue;
                        }
                        Optional<User> u = users.findByEmailIgnoreCase(emailLower);
                        if (u.isPresent() && u.get().getRole() != Role.TEACHER) {
                            errors.add(new ImportTeacherResult.ImportError(rowNum + 1, teacherName,
                                    "Email đã được sử dụng bởi tài khoản: " + u.get().getRole()));
                            failedCount++;
                            continue;
                        }
                    }

                    // Find subjects
                    java.util.Set<com.schoolmanagement.backend.domain.entity.classes.Subject> subjectEntities = new java.util.HashSet<>();
                    if (specialization != null && !specialization.isBlank()) {
                        String[] parts = specialization.split("[,;]");
                        for (String part : parts) {
                            String subName = part.trim();
                            if (!subName.isEmpty()) {
                                Optional<com.schoolmanagement.backend.domain.entity.classes.Subject> subjectOpt = subjects
                                        .findByNameIgnoreCase(subName);
                                if (subjectOpt.isPresent()) {
                                    subjectEntities.add(subjectOpt.get());
                                }
                            }
                        }
                    }

                    // Generate teacher code
                    String teacherCode = generateNextTeacherCode(school);

                    // Create teacher entity
                    Teacher teacher = Teacher.builder()
                            .teacherCode(teacherCode)
                            .fullName(teacherName.trim())
                            .dateOfBirth(dateOfBirth)
                            .gender(gender)
                            .address(address)
                            .email(email)
                            .phone(phone)
                            .degree(degree)
                            .school(school)
                            .status("ACTIVE")
                            .subjects(subjectEntities)
                            .build();

                    teachers.save(teacher);
                    successCount++;

                } catch (Exception e) {
                    errors.add(new ImportTeacherResult.ImportError(rowNum + 1, teacherName,
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

        return new ImportTeacherResult(totalRows, successCount, failedCount, errors);
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

        long count = teachers.countBySchool(school);
        return String.format("GV%04d", count + 1);
    }
}
