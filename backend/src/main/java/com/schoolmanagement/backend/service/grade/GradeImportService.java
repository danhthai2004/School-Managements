package com.schoolmanagement.backend.service.grade;

import com.schoolmanagement.backend.domain.entity.admin.Semester;
import com.schoolmanagement.backend.domain.entity.auth.User;
import com.schoolmanagement.backend.domain.entity.classes.ClassRoom;
import com.schoolmanagement.backend.domain.entity.classes.Subject;
import com.schoolmanagement.backend.domain.entity.grade.Grade;
import com.schoolmanagement.backend.domain.entity.grade.RegularScore;
import com.schoolmanagement.backend.domain.entity.student.Student;
import com.schoolmanagement.backend.domain.entity.teacher.Teacher;
import com.schoolmanagement.backend.domain.entity.teacher.TeacherAssignment;
import com.schoolmanagement.backend.dto.grade.GradeImportResultDto;
import com.schoolmanagement.backend.exception.ApiException;
import com.schoolmanagement.backend.repo.auth.UserRepository;
import com.schoolmanagement.backend.repo.classes.ClassEnrollmentRepository;
import com.schoolmanagement.backend.repo.classes.ClassRoomRepository;
import com.schoolmanagement.backend.repo.classes.SubjectRepository;
import com.schoolmanagement.backend.repo.grade.GradeRepository;
import com.schoolmanagement.backend.repo.student.StudentRepository;
import com.schoolmanagement.backend.repo.teacher.TeacherAssignmentRepository;
import com.schoolmanagement.backend.repo.teacher.TeacherRepository;
import com.schoolmanagement.backend.service.admin.SemesterService;
import com.schoolmanagement.backend.util.StudentSortUtils;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.InputStream;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class GradeImportService {

    private final GradeRepository gradeRepository;
    private final StudentRepository studentRepository;
    private final ClassRoomRepository classRoomRepository;
    private final SubjectRepository subjectRepository;
    private final TeacherRepository teacherRepository;
    private final TeacherAssignmentRepository teacherAssignmentRepository;
    private final ClassEnrollmentRepository classEnrollmentRepository;
    private final UserRepository userRepository;
    private final SemesterService semesterService;

    /**
     * Import grades from an Excel file for a specific class, subject and semester.
     * 
     * Expected Excel format:
     * Row 0 (Header): Mã HS | Họ tên | TX1 | TX2 | ... | Giữa kỳ | Cuối kỳ
     * Row 1+: Data rows
     * 
     * The number of "TX" (regular assessment) columns is dynamic (auto-detected).
     */
    @Transactional
    public GradeImportResultDto importGradesFromExcel(
            String teacherEmail, MultipartFile file,
            UUID classId, UUID subjectId, String semesterId, boolean preview) {

        // 1. Validate file
        if (file == null || file.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "File Excel rỗng.");
        }
        String filename = file.getOriginalFilename();
        if (filename == null || (!filename.endsWith(".xlsx") && !filename.endsWith(".xls"))) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Vui lòng upload file Excel (.xlsx hoặc .xls)");
        }

        // 2. Resolve teacher, class, subject, semester
        User user = userRepository.findByEmailIgnoreCase(teacherEmail)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        Teacher teacher = teacherRepository.findByUser(user)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Teacher profile not found"));

        ClassRoom classRoom = classRoomRepository.findById(classId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Lớp học không tồn tại"));

        Subject subject = subjectRepository.findById(subjectId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Môn học không tồn tại"));

        Semester semesterEntity = semesterId != null
                ? semesterService.getSemester(UUID.fromString(semesterId))
                : semesterService.getActiveSemesterEntity(user.getSchool());

        // 3. Verify teacher is assigned to this class-subject
        Optional<TeacherAssignment> assignment = teacherAssignmentRepository
                .findFirstByClassRoomAndSubject(classRoom, subject);
        if (assignment.isEmpty() || assignment.get().getTeacher() == null
                || !assignment.get().getTeacher().getId().equals(teacher.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Bạn không được phân công dạy lớp-môn này.");
        }

        // 4. Verify semester is not closed
        if (semesterEntity.getStatus() == com.schoolmanagement.backend.domain.admin.SemesterStatus.CLOSED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Học kỳ đã chốt sổ, không thể nhập điểm.");
        }
        if (semesterEntity.getStatus() == com.schoolmanagement.backend.domain.admin.SemesterStatus.UPCOMING) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Học kỳ chưa bắt đầu, không thể nhập điểm.");
        }

        // 5. Get existing grades for this class-subject-semester
        List<Grade> existingGrades = gradeRepository.findAllByClassRoomAndSubjectAndSemester(
                classRoom, subject, semesterEntity);
        Map<UUID, Grade> gradeByStudentId = existingGrades.stream()
                .collect(Collectors.toMap(g -> g.getStudent().getId(), g -> g, (a, b) -> a));

        // 6. Parse the Excel file
        List<GradeImportResultDto.ImportError> errors = new ArrayList<>();
        List<com.schoolmanagement.backend.dto.grade.GradeBookDto.StudentGradeDto> previewData = new ArrayList<>();
        int totalRows = 0;
        int successCount = 0;
        int updatedCount = 0;
        int failedCount = 0;

        try (InputStream is = file.getInputStream();
                Workbook workbook = new XSSFWorkbook(is)) {

            Sheet sheet = workbook.getSheetAt(0);
            if (sheet == null) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "File Excel không có sheet nào.");
            }

            // Try row 0 first; if it looks like an info row (no "Mã HS" match) try row 2
            Row headerRow = sheet.getRow(0);
            // The exported template has info on row 0 and actual headers on row 2
            if (headerRow != null) {
                boolean hasStudentCodeHeader = false;
                for (int ci = 0; ci < headerRow.getLastCellNum(); ci++) {
                    Cell c = headerRow.getCell(ci);
                    if (c == null)
                        continue;
                    String h = getCellStringValue(c).toLowerCase().trim();
                    if (h.equals("mã hs") || h.equals("mã học sinh") || h.equals("mahs") || h.equals("studentcode")) {
                        hasStudentCodeHeader = true;
                        break;
                    }
                }
                if (!hasStudentCodeHeader) {
                    headerRow = sheet.getRow(2); // skip info row + empty row
                }
            }
            if (headerRow == null) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "File Excel không có header row.");
            }

            // Parse header to detect column layout
            Map<String, Integer> columnMap = new LinkedHashMap<>();
            List<Integer> regularColumns = new ArrayList<>(); // indices of TX columns
            int midtermCol = -1;
            int finalCol = -1;
            int studentCodeCol = -1;

            for (int i = 0; i < headerRow.getLastCellNum(); i++) {
                Cell cell = headerRow.getCell(i);
                if (cell == null)
                    continue;
                String header = getCellStringValue(cell).toLowerCase().trim();
                columnMap.put(header, i);

                if (header.equals("mã hs") || header.equals("mã học sinh") || header.equals("mahs")
                        || header.equals("studentcode") || header.equals("student_code")) {
                    studentCodeCol = i;
                } else if (header.startsWith("tx") || header.startsWith("điểm tx")
                        || header.startsWith("thường xuyên") || header.matches("tx\\s*\\d+")) {
                    regularColumns.add(i);
                } else if (header.equals("giữa kỳ") || header.equals("gk") || header.equals("midterm")
                        || header.equals("điểm gk")) {
                    midtermCol = i;
                } else if (header.equals("cuối kỳ") || header.equals("ck") || header.equals("finalterm")
                        || header.equals("final") || header.equals("điểm ck")) {
                    finalCol = i;
                }
            }

            if (studentCodeCol == -1) {
                throw new ApiException(HttpStatus.BAD_REQUEST,
                        "File Excel phải có cột 'Mã HS' hoặc 'Mã học sinh'.");
            }

            // Sort regular columns by their detected order (TX1, TX2, ...)
            log.info("Import grades: detected {} regular columns, midterm={}, final={}",
                    regularColumns.size(), midtermCol >= 0, finalCol >= 0);

            // 7. Process each data row (start after header; if header was at row 2, start
            // from row 3)
            int dataStartRow = (headerRow.getRowNum() == 2) ? 3 : 1;
            for (int rowNum = dataStartRow; rowNum <= sheet.getLastRowNum(); rowNum++) {
                Row row = sheet.getRow(rowNum);
                if (row == null || isRowEmpty(row))
                    continue;

                totalRows++;
                String studentCode = "";

                try {
                    // Get student code
                    Cell codeCell = row.getCell(studentCodeCol);
                    studentCode = codeCell != null ? getCellStringValue(codeCell).trim() : "";
                    if (studentCode.isBlank()) {
                        errors.add(new GradeImportResultDto.ImportError(rowNum + 1, "", "Thiếu mã học sinh"));
                        failedCount++;
                        continue;
                    }

                    // Find student by code
                    Student student = studentRepository.findBySchoolAndStudentCode(
                            classRoom.getSchool(), studentCode).orElse(null);
                    if (student == null) {
                        errors.add(new GradeImportResultDto.ImportError(rowNum + 1, studentCode,
                                "Không tìm thấy học sinh với mã: " + studentCode));
                        failedCount++;
                        continue;
                    }

                    // Check student belongs to this enrollment
                    boolean enrolled = classEnrollmentRepository
                            .existsByStudentAndClassRoomAndAcademicYear(student, classRoom,
                                    classRoom.getAcademicYear());
                    if (!enrolled) {
                        errors.add(new GradeImportResultDto.ImportError(rowNum + 1, studentCode,
                                "Học sinh không thuộc lớp " + classRoom.getName()));
                        failedCount++;
                        continue;
                    }

                    // Get or create grade entity
                    Grade grade = gradeByStudentId.get(student.getId());
                    boolean isUpdate = (grade != null);

                    boolean rowValid = true;
                    Map<Integer, Double> regularScoresMap = new HashMap<>(); // temporary

                    // Parse regular scores
                    for (int colIdx = 0; colIdx < regularColumns.size(); colIdx++) {
                        Double val = getNumericCellValue(row, regularColumns.get(colIdx));
                        if (val != null) {
                            if (val < 0 || val > 10) {
                                errors.add(new GradeImportResultDto.ImportError(rowNum + 1, studentCode,
                                        "Điểm TX" + (colIdx + 1) + " không hợp lệ (0-10): " + val));
                                failedCount++;
                                rowValid = false;
                                break;
                            }
                            regularScoresMap.put(colIdx + 1, val);
                        }
                    }

                    if (!rowValid)
                        continue;

                    Double midVal = null;
                    if (midtermCol >= 0) {
                        midVal = getNumericCellValue(row, midtermCol);
                        if (midVal != null) {
                            if (midVal < 0 || midVal > 10) {
                                errors.add(new GradeImportResultDto.ImportError(rowNum + 1, studentCode,
                                        "Điểm Giữa kỳ không hợp lệ (0-10): " + midVal));
                                failedCount++;
                                rowValid = false;
                            }
                        }
                    }

                    if (!rowValid)
                        continue;

                    Double finalVal = null;
                    if (finalCol >= 0) {
                        finalVal = getNumericCellValue(row, finalCol);
                        if (finalVal != null) {
                            if (finalVal < 0 || finalVal > 10) {
                                errors.add(new GradeImportResultDto.ImportError(rowNum + 1, studentCode,
                                        "Điểm Cuối kỳ không hợp lệ (0-10): " + finalVal));
                                failedCount++;
                                rowValid = false;
                            }
                        }
                    }

                    if (!rowValid)
                        continue;

                    if (preview) {
                        List<com.schoolmanagement.backend.dto.grade.GradeBookDto.GradeValueDto> gradeValues = new ArrayList<>();

                        // Regular scores (completely replaced if any regular column is in the excel)
                        // Wait, if Excel has TX, it completely overwrites existing in normal import. So
                        // preview must match.
                        for (int colIdx = 0; colIdx < regularColumns.size(); colIdx++) {
                            Double val = regularScoresMap.get(colIdx + 1);
                            gradeValues.add(com.schoolmanagement.backend.dto.grade.GradeBookDto.GradeValueDto.builder()
                                    .type("REGULAR")
                                    .index(colIdx + 1)
                                    .value(val)
                                    .build());
                        }

                        // For Midterm/Final, if not in excel, we USE EXISTING DB VALUE.
                        // If in excel but empty, normal import DOES NOT OVERWRITE. So we USE EXISTING
                        // DB VALUE.
                        Double finalMidVal = midVal;
                        if (finalMidVal == null && grade != null && grade.getMidtermScore() != null) {
                            finalMidVal = grade.getMidtermScore().doubleValue();
                        }
                        gradeValues.add(com.schoolmanagement.backend.dto.grade.GradeBookDto.GradeValueDto.builder()
                                .type("MIDTERM")
                                .value(finalMidVal)
                                .build());

                        Double finalFinalVal = finalVal;
                        if (finalFinalVal == null && grade != null && grade.getFinalScore() != null) {
                            finalFinalVal = grade.getFinalScore().doubleValue();
                        }
                        gradeValues.add(com.schoolmanagement.backend.dto.grade.GradeBookDto.GradeValueDto.builder()
                                .type("FINAL")
                                .value(finalFinalVal)
                                .build());

                        previewData.add(com.schoolmanagement.backend.dto.grade.GradeBookDto.StudentGradeDto.builder()
                                .studentId(student.getId().toString())
                                .studentCode(student.getStudentCode())
                                .fullName(student.getFullName())
                                .grades(gradeValues)
                                .build());

                        if (isUpdate) {
                            updatedCount++;
                        } else {
                            successCount++; // count this as "will be created" or "success"
                        }

                    } else {
                        // NORMAL SAVE
                        if (grade == null) {
                            grade = Grade.builder()
                                    .student(student)
                                    .subject(subject)
                                    .classRoom(classRoom)
                                    .teacher(teacher)
                                    .semester(semesterEntity)
                                    .recordedBy(user)
                                    .recordedAt(Instant.now())
                                    .build();
                            grade = gradeRepository.save(grade);
                        }

                        // Clear existing regular scores and rebuild from Excel
                        grade.getRegularScores().clear();
                        for (Map.Entry<Integer, Double> entry : regularScoresMap.entrySet()) {
                            grade.getRegularScores().add(RegularScore.builder()
                                    .grade(grade)
                                    .scoreIndex(entry.getKey())
                                    .scoreValue(BigDecimal.valueOf(entry.getValue()))
                                    .build());
                        }

                        if (midVal != null) {
                            grade.setMidtermScore(BigDecimal.valueOf(midVal));
                        }
                        if (finalVal != null) {
                            grade.setFinalScore(BigDecimal.valueOf(finalVal));
                        }

                        // Calculate average
                        grade.setAverageScore(calculateAverage(grade));
                        grade.setUpdatedAt(Instant.now());
                        grade.setUpdatedBy(user);
                        gradeRepository.save(grade);

                        if (isUpdate) {
                            updatedCount++;
                        } else {
                            successCount++;
                        }
                    }
                } catch (Exception e) {
                    errors.add(new GradeImportResultDto.ImportError(rowNum + 1, studentCode,
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

        return new GradeImportResultDto(totalRows, successCount, failedCount, updatedCount, errors, previewData);
    }

    /**
     * Generate an Excel template for grade import.
     * Teachers download this, fill it in, and re-upload.
     */
    @jakarta.transaction.Transactional
    public Workbook generateTemplate(String teacherEmail, UUID classId, UUID subjectId, String semesterId) {
        User user = userRepository.findByEmailIgnoreCase(teacherEmail)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        ClassRoom classRoom = classRoomRepository.findById(classId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Lớp không tồn tại"));

        Subject subject = subjectRepository.findById(subjectId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Môn không tồn tại"));

        Semester semesterEntity = (semesterId != null && !semesterId.isBlank() && !semesterId.equals("null")
                && !semesterId.equals("undefined"))
                        ? semesterService.getSemester(UUID.fromString(semesterId))
                        : semesterService.getActiveSemesterEntity(user.getSchool());

        // Get enrolled students
        var enrollments = classEnrollmentRepository
                .findAllByClassRoomAndAcademicYear(classRoom, classRoom.getAcademicYear());

        // Get existing grades (so we can pre-fill)
        List<Grade> existingGrades = gradeRepository.findAllByClassRoomAndSubjectAndSemester(
                classRoom, subject, semesterEntity);
        Map<UUID, Grade> gradeByStudentId = existingGrades.stream()
                .collect(Collectors.toMap(g -> g.getStudent().getId(), g -> g, (a, b) -> a));

        // Determine how many regular columns
        int maxRegularCount = existingGrades.stream()
                .mapToInt(g -> g.getRegularScores() != null ? g.getRegularScores().size() : 0)
                .max().orElse(4);
        if (maxRegularCount < 1)
            maxRegularCount = 4;

        // Create workbook
        Workbook workbook = new XSSFWorkbook();
        Sheet sheet = workbook.createSheet("Bảng điểm");

        // Header Style (Dark Gray background, White text)
        CellStyle headerStyle = workbook.createCellStyle();
        Font headerFont = workbook.createFont();
        headerFont.setBold(true);
        headerFont.setColor(IndexedColors.WHITE.getIndex());
        headerStyle.setFont(headerFont);
        headerStyle.setFillForegroundColor(IndexedColors.GREY_80_PERCENT.getIndex());
        headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        headerStyle.setAlignment(HorizontalAlignment.CENTER);
        headerStyle.setBorderBottom(BorderStyle.THIN);
        headerStyle.setBorderTop(BorderStyle.THIN);
        headerStyle.setBorderLeft(BorderStyle.THIN);
        headerStyle.setBorderRight(BorderStyle.THIN);

        // Data Style
        CellStyle dataStyle = workbook.createCellStyle();
        dataStyle.setBorderBottom(BorderStyle.THIN);
        dataStyle.setBorderTop(BorderStyle.THIN);
        dataStyle.setBorderLeft(BorderStyle.THIN);
        dataStyle.setBorderRight(BorderStyle.THIN);
        dataStyle.setAlignment(HorizontalAlignment.CENTER);

        // Left-aligned data style for names
        CellStyle leftDataStyle = workbook.createCellStyle();
        leftDataStyle.cloneStyleFrom(dataStyle);
        leftDataStyle.setAlignment(HorizontalAlignment.LEFT);

        // Info Row 0: each field in its own labelled cell
        CellStyle infoLabelStyle = workbook.createCellStyle();
        Font infoLabelFont = workbook.createFont();
        infoLabelFont.setBold(true);
        infoLabelStyle.setFont(infoLabelFont);

        Row infoRow = sheet.createRow(0);
        // Col 0-1: Lớp
        Cell lblLop = infoRow.createCell(0);
        lblLop.setCellValue("Lớp:");
        lblLop.setCellStyle(infoLabelStyle);
        infoRow.createCell(1).setCellValue(classRoom.getName());
        // Col 2-3: Môn
        Cell lblMon = infoRow.createCell(2);
        lblMon.setCellValue("Môn:");
        lblMon.setCellStyle(infoLabelStyle);
        infoRow.createCell(3).setCellValue(subject.getName());
        // Col 4-5: Học kỳ
        Cell lblHk = infoRow.createCell(4);
        lblHk.setCellValue("Học kỳ:");
        lblHk.setCellStyle(infoLabelStyle);
        infoRow.createCell(5).setCellValue(semesterEntity.getName());
        // Col 6-7: Năm học
        Cell lblNamHoc = infoRow.createCell(6);
        lblNamHoc.setCellValue("Năm học:");
        lblNamHoc.setCellStyle(infoLabelStyle);
        infoRow.createCell(7).setCellValue(
                semesterEntity.getAcademicYear() != null ? semesterEntity.getAcademicYear().getName() : "");

        // Header Row (at index 2 for a bit of spacing)
        Row headerRow = sheet.createRow(2);
        int colIdx = 0;
        createCell(headerRow, colIdx++, "STT", headerStyle);
        createCell(headerRow, colIdx++, "Mã HS", headerStyle);
        createCell(headerRow, colIdx++, "Họ và tên", headerStyle);
        for (int i = 1; i <= maxRegularCount; i++) {
            createCell(headerRow, colIdx++, "TX" + i, headerStyle);
        }
        createCell(headerRow, colIdx++, "Giữa kỳ", headerStyle);
        createCell(headerRow, colIdx++, "Cuối kỳ", headerStyle);
        createCell(headerRow, colIdx++, "Trung bình", headerStyle);
        createCell(headerRow, colIdx++, "Xếp loại", headerStyle);

        // Data rows
        List<Student> students = enrollments.stream()
                .map(e -> e.getStudent())
                .sorted((s1, s2) -> StudentSortUtils.vietnameseNameComparator().compare(s1.getFullName(),
                        s2.getFullName()))
                .toList();

        for (int i = 0; i < students.size(); i++) {
            Student student = students.get(i);
            Row row = sheet.createRow(i + 3);
            colIdx = 0;

            createCell(row, colIdx++, String.valueOf(i + 1), dataStyle);
            createCell(row, colIdx++, student.getStudentCode(), dataStyle);

            Cell nameCell = row.createCell(colIdx++);
            nameCell.setCellValue(student.getFullName());
            nameCell.setCellStyle(leftDataStyle);

            Grade existingGrade = gradeByStudentId.get(student.getId());
            Map<Integer, BigDecimal> regularMap = new HashMap<>();
            if (existingGrade != null && existingGrade.getRegularScores() != null) {
                for (RegularScore rs : existingGrade.getRegularScores()) {
                    regularMap.put(rs.getScoreIndex(), rs.getScoreValue());
                }
            }

            // Regular scores
            for (int r = 1; r <= maxRegularCount; r++) {
                BigDecimal val = regularMap.get(r);
                if (val != null) {
                    Cell cell = row.createCell(colIdx);
                    cell.setCellValue(val.doubleValue());
                    cell.setCellStyle(dataStyle);
                } else {
                    createCell(row, colIdx, "", dataStyle);
                }
                colIdx++;
            }

            // Midterm
            if (existingGrade != null && existingGrade.getMidtermScore() != null) {
                Cell cell = row.createCell(colIdx);
                cell.setCellValue(existingGrade.getMidtermScore().doubleValue());
                cell.setCellStyle(dataStyle);
            } else {
                createCell(row, colIdx, "", dataStyle);
            }
            colIdx++;

            // Final
            if (existingGrade != null && existingGrade.getFinalScore() != null) {
                Cell cell = row.createCell(colIdx);
                cell.setCellValue(existingGrade.getFinalScore().doubleValue());
                cell.setCellStyle(dataStyle);
            } else {
                createCell(row, colIdx, "", dataStyle);
            }
            colIdx++;

            // Average
            if (existingGrade != null && existingGrade.getAverageScore() != null) {
                Cell cell = row.createCell(colIdx);
                cell.setCellValue(existingGrade.getAverageScore().doubleValue());
                cell.setCellStyle(dataStyle);
            } else {
                createCell(row, colIdx, "", dataStyle);
            }
            colIdx++;

            // Rank
            createCell(row, colIdx++, (existingGrade != null && existingGrade.getPerformanceCategory() != null)
                    ? existingGrade.getPerformanceCategory()
                    : "", dataStyle);
        }

        // Auto-size columns
        for (int i = 0; i < colIdx + 1; i++) {
            sheet.autoSizeColumn(i);
        }

        return workbook;
    }

    // ==================== HELPERS ====================

    private BigDecimal calculateAverage(Grade grade) {
        double total = 0;
        int weight = 0;

        if (grade.getRegularScores() != null) {
            for (RegularScore rs : grade.getRegularScores()) {
                if (rs.getScoreValue() != null) {
                    total += rs.getScoreValue().doubleValue();
                    weight += 1;
                }
            }
        }

        if (grade.getMidtermScore() != null) {
            total += grade.getMidtermScore().doubleValue() * 2;
            weight += 2;
        }
        if (grade.getFinalScore() != null) {
            total += grade.getFinalScore().doubleValue() * 3;
            weight += 3;
        }

        if (weight == 0)
            return null;
        return BigDecimal.valueOf(Math.round((total / weight) * 10.0) / 10.0);
    }

    private String getCellStringValue(Cell cell) {
        if (cell == null)
            return "";
        return switch (cell.getCellType()) {
            case STRING -> cell.getStringCellValue();
            case NUMERIC -> {
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

    private Double getNumericCellValue(Row row, int colIndex) {
        Cell cell = row.getCell(colIndex);
        if (cell == null)
            return null;

        return switch (cell.getCellType()) {
            case NUMERIC -> cell.getNumericCellValue();
            case STRING -> {
                String val = cell.getStringCellValue().trim();
                if (val.isBlank())
                    yield null;
                try {
                    yield Double.parseDouble(val.replace(",", "."));
                } catch (NumberFormatException e) {
                    yield null;
                }
            }
            case FORMULA -> {
                try {
                    yield cell.getNumericCellValue();
                } catch (Exception e) {
                    yield null;
                }
            }
            default -> null;
        };
    }

    private boolean isRowEmpty(Row row) {
        for (int i = 0; i < row.getLastCellNum(); i++) {
            Cell cell = row.getCell(i);
            if (cell != null && !getCellStringValue(cell).isBlank())
                return false;
        }
        return true;
    }

    private void createCell(Row row, int colIndex, String value, CellStyle style) {
        Cell cell = row.createCell(colIndex);
        cell.setCellValue(value);
        cell.setCellStyle(style);
    }
}
