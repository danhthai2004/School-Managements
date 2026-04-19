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
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.*;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVParser;
import org.apache.commons.csv.CSVRecord;

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
        if (filename == null || (!filename.endsWith(".xlsx") && !filename.endsWith(".xls") && !filename.endsWith(".csv"))) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Vui lòng upload file Excel (.xlsx, .xls) hoặc CSV (.csv)");
        }

        List<ImportTeacherResult.ImportError> errors = new ArrayList<>();
        int totalRows = 0;
        int successCount = 0;
        int failedCount = 0;

        List<ParsedRow> parsedRows = new ArrayList<>();

        try {
            if (filename.toLowerCase().endsWith(".csv")) {
                try (InputStreamReader reader = new InputStreamReader(file.getInputStream(), StandardCharsets.UTF_8);
                     CSVParser csvParser = new CSVParser(reader, CSVFormat.DEFAULT.builder().setHeader().setSkipHeaderRecord(true).build())) {
                     
                     List<String> headers = csvParser.getHeaderNames();
                     for (CSVRecord record : csvParser) {
                         Map<String, String> data = new HashMap<>();
                         for (String h : headers) {
                             if (h != null) data.put(h.toLowerCase().trim(), record.get(h));
                         }
                         parsedRows.add(new ParsedRow((int) record.getRecordNumber() + 1, data));
                     }
                }
            } else {
                try (InputStream is = file.getInputStream();
                     Workbook workbook = new XSSFWorkbook(is)) {
                     
                    Sheet sheet = workbook.getSheetAt(0);
                    if (sheet == null) throw new ApiException(HttpStatus.BAD_REQUEST, "File không có sheet nào.");
                    
                    Row headerRow = sheet.getRow(0);
                    if (headerRow == null) throw new ApiException(HttpStatus.BAD_REQUEST, "File không có header row.");
                    
                    Map<Integer, String> colIndexToHeader = new HashMap<>();
                    for (int i = 0; i < headerRow.getLastCellNum(); i++) {
                        Cell cell = headerRow.getCell(i);
                        if (cell != null) {
                            colIndexToHeader.put(i, getCellStringValue(cell).toLowerCase().trim());
                        }
                    }
                    
                    for (int rowNum = 1; rowNum <= sheet.getLastRowNum(); rowNum++) {
                        Row row = sheet.getRow(rowNum);
                        if (row == null) continue;
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
            // Teachers
            Set<String> existingTeacherEmails = new HashSet<>();
            for (Teacher t : teachers.findAllBySchoolOrderByFullNameAsc(school)) {
                if (t.getEmail() != null) existingTeacherEmails.add(t.getEmail().toLowerCase());
            }
            // Students
            Set<String> existingStudentEmails = new HashSet<>();
            for (com.schoolmanagement.backend.domain.entity.student.Student s : students.findAllBySchoolOrderByFullNameAsc(school)) {
                if (s.getEmail() != null) existingStudentEmails.add(s.getEmail().toLowerCase());
            }
            // Guardians
            Set<String> existingGuardianEmails = new HashSet<>();
            for (com.schoolmanagement.backend.domain.entity.student.Guardian g : guardians.findAll()) {
                if (g.getEmail() != null) existingGuardianEmails.add(g.getEmail().toLowerCase());
            }
            // Users
            Map<String, User> userEmailMap = new HashMap<>();
            for (User u : users.findAll()) {
                if (u.getEmail() != null) userEmailMap.put(u.getEmail().toLowerCase(), u);
            }
            // Subjects
            List<com.schoolmanagement.backend.domain.entity.classes.Subject> allSubjects = subjects.findAll();
            Map<String, com.schoolmanagement.backend.domain.entity.classes.Subject> subjectNameMap = new HashMap<>();
            for (com.schoolmanagement.backend.domain.entity.classes.Subject s : allSubjects) {
                subjectNameMap.put(s.getName().toLowerCase().trim(), s);
            }
            // Teacher code counter
            int nextCodeNumber = getNextTeacherCodeNumber(school);

            // Process data rows
            for (ParsedRow row : parsedRows) {
                if (row.isEmpty()) continue;

                totalRows++;
                String teacherName = "";

                try {
                    teacherName = row.getValue("fullname", "họ tên", "hoten");
                    if (teacherName == null || teacherName.isBlank()) {
                        errors.add(new ImportTeacherResult.ImportError(row.rowNum, "", "Thiếu họ tên"));
                        failedCount++;
                        continue;
                    }

                    LocalDate dateOfBirth = parseDateFromRow(row, "dateofbirth", "ngày sinh", "ngaysinh");

                    if (dateOfBirth != null && !dateOfBirth.isBefore(LocalDate.now())) {
                        errors.add(new ImportTeacherResult.ImportError(row.rowNum, teacherName,
                                "Ngày sinh phải nhỏ hơn ngày hiện tại"));
                        failedCount++;
                        continue;
                    }

                    Gender gender = parseGenderFromRow(row, "gender", "giới tính", "gioitinh");

                    String address = row.getValue("address", "địa chỉ", "diachi");
                    String email = row.getValue("email");
                    String phone = row.getValue("phone", "sđt", "số điện thoại", "sodienthoai");
                    String specialization = row.getValue("specialization", "chuyên môn", "chuyenmon");
                    String degree = row.getValue("degree", "bằng cấp", "bangcap");

                    // Validate email uniqueness using pre-loaded data
                    if (email != null && !email.isBlank()) {
                        String emailLower = email.trim().toLowerCase();
                        if (existingTeacherEmails.contains(emailLower)) {
                            errors.add(new ImportTeacherResult.ImportError(row.rowNum, teacherName,
                                    "Email đã tồn tại (Giáo viên): " + email));
                            failedCount++;
                            continue;
                        }
                        if (existingStudentEmails.contains(emailLower)) {
                            errors.add(new ImportTeacherResult.ImportError(row.rowNum, teacherName,
                                    "Email trùng với Học sinh: " + email));
                            failedCount++;
                            continue;
                        }
                        if (existingGuardianEmails.contains(emailLower)) {
                            errors.add(new ImportTeacherResult.ImportError(row.rowNum, teacherName,
                                    "Email trùng với Phụ huynh: " + email));
                            failedCount++;
                            continue;
                        }
                        User existingUser = userEmailMap.get(emailLower);
                        if (existingUser != null && existingUser.getRole() != Role.TEACHER) {
                            errors.add(new ImportTeacherResult.ImportError(row.rowNum, teacherName,
                                    "Email đã được sử dụng bởi tài khoản: " + existingUser.getRole()));
                            failedCount++;
                            continue;
                        }
                    }

                    // Find subjects from pre-loaded map
                    java.util.Set<com.schoolmanagement.backend.domain.entity.classes.Subject> subjectEntities = new java.util.HashSet<>();
                    if (specialization != null && !specialization.isBlank()) {
                        String[] parts = specialization.split("[,;]");
                        for (String part : parts) {
                            String subName = part.trim().toLowerCase();
                            if (!subName.isEmpty()) {
                                com.schoolmanagement.backend.domain.entity.classes.Subject found = subjectNameMap.get(subName);
                                if (found != null) {
                                    subjectEntities.add(found);
                                }
                            }
                        }
                    }

                    // Generate teacher code from in-memory counter
                    String teacherCode = String.format("GV%04d", nextCodeNumber++);
                    // Track new email for intra-batch collision detection
                    if (email != null && !email.isBlank()) existingTeacherEmails.add(email.trim().toLowerCase());

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
                    errors.add(new ImportTeacherResult.ImportError(row.rowNum, teacherName, "Lỗi: " + e.getMessage()));
                    failedCount++;
                }
            }

        } catch (ApiException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Không đọc được file cấu trúc chung: " + ex.getMessage());
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
                if (val != null && !val.isBlank()) return val.trim();
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
        if (value == null) return null;

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

    private int getNextTeacherCodeNumber(School school) {
        Optional<Teacher> latestTeacher = teachers.findTopBySchoolOrderByTeacherCodeDesc(school);
        if (latestTeacher.isEmpty()) return 1;
        String lastCode = latestTeacher.get().getTeacherCode();
        try {
            if (lastCode.startsWith("GV")) {
                return Integer.parseInt(lastCode.substring(2)) + 1;
            }
        } catch (NumberFormatException ignored) {
        }
        return (int) teachers.countBySchool(school) + 1;
    }
}
