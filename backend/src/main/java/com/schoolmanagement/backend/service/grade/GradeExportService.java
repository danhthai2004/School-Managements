package com.schoolmanagement.backend.service.grade;

import com.schoolmanagement.backend.domain.entity.admin.Semester;
import com.schoolmanagement.backend.domain.entity.auth.User;
import com.schoolmanagement.backend.domain.entity.classes.ClassRoom;
import com.schoolmanagement.backend.domain.entity.classes.Subject;
import com.schoolmanagement.backend.domain.entity.grade.Grade;
import com.schoolmanagement.backend.domain.entity.grade.RegularScore;
import com.schoolmanagement.backend.domain.entity.student.Student;
import com.schoolmanagement.backend.repo.auth.UserRepository;
import com.schoolmanagement.backend.repo.classes.ClassEnrollmentRepository;
import com.schoolmanagement.backend.repo.classes.ClassRoomRepository;
import com.schoolmanagement.backend.repo.classes.SubjectRepository;
import com.schoolmanagement.backend.repo.grade.GradeRepository;
import com.schoolmanagement.backend.service.admin.SemesterService;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.ss.util.CellRangeAddress;
import org.apache.poi.xssf.usermodel.XSSFCellStyle;
import org.apache.poi.xssf.usermodel.XSSFColor;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class GradeExportService {

    private final UserRepository userRepository;
    private final ClassRoomRepository classRoomRepository;
    private final SubjectRepository subjectRepository;
    private final ClassEnrollmentRepository classEnrollmentRepository;
    private final GradeRepository gradeRepository;
    private final SemesterService semesterService;

    // --- Custom colors (RGB) ---
    private static final byte[] COLOR_HEADER_BG = { (byte) 30, (byte) 80, (byte) 160 }; // Deep blue
    private static final byte[] COLOR_INFO_BG = { (byte) 224, (byte) 235, (byte) 255 }; // Light blue-gray
    private static final byte[] COLOR_ROW_ALT = { (byte) 245, (byte) 248, (byte) 255 }; // Very light blue
    private static final byte[] COLOR_SUMMARY_BG = { (byte) 230, (byte) 245, (byte) 235 }; // Light green

    /**
     * Export a formatted grade report Excel file.
     */
    public Workbook exportGradeReport(String teacherEmail, UUID classId, UUID subjectId, String semesterId) {
        // 1. Resolve entities
        User user = userRepository.findByEmailIgnoreCase(teacherEmail)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        ClassRoom classRoom = classRoomRepository.findById(classId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Lớp không tồn tại"));
        Subject subject = subjectRepository.findById(subjectId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Môn không tồn tại"));
        Semester semester = semesterId != null
                ? semesterService.getSemester(UUID.fromString(semesterId))
                : semesterService.getActiveSemesterEntity(user.getSchool());

        // 2. Fetch data
        var enrollments = classEnrollmentRepository
                .findAllByClassRoomAndAcademicYear(classRoom, classRoom.getAcademicYear());
        List<Grade> grades = gradeRepository.findAllByClassRoomAndSubjectAndSemester(classRoom, subject, semester);
        Map<UUID, Grade> gradeMap = grades.stream()
                .collect(Collectors.toMap(g -> g.getStudent().getId(), g -> g, (a, b) -> a));

        List<Student> students = enrollments.stream()
                .map(e -> e.getStudent())
                .sorted(Comparator.comparing(Student::getFullName))
                .toList();

        // Determine max regular columns
        int maxRegular = grades.stream()
                .mapToInt(g -> g.getRegularScores() != null ? g.getRegularScores().size() : 0)
                .max().orElse(4);
        if (maxRegular < 1)
            maxRegular = 4;

        // 3. Build workbook
        XSSFWorkbook wb = new XSSFWorkbook();
        Sheet sheet = wb.createSheet("Bảng điểm");
        sheet.setDefaultColumnWidth(14);

        // ---- Styles ----
        XSSFCellStyle headerStyle = buildStyle(wb, COLOR_HEADER_BG, IndexedColors.WHITE.getIndex(),
                true, HorizontalAlignment.CENTER, BorderStyle.THIN);
        XSSFCellStyle infoLabelStyle = buildStyle(wb, COLOR_INFO_BG, IndexedColors.AUTOMATIC.getIndex(),
                true, HorizontalAlignment.LEFT, BorderStyle.NONE);
        XSSFCellStyle infoValueStyle = buildStyle(wb, COLOR_INFO_BG, IndexedColors.AUTOMATIC.getIndex(),
                false, HorizontalAlignment.LEFT, BorderStyle.NONE);
        XSSFCellStyle dataStyleCenter = buildStyle(wb, null, IndexedColors.AUTOMATIC.getIndex(),
                false, HorizontalAlignment.CENTER, BorderStyle.THIN);
        XSSFCellStyle dataStyleLeft = buildStyle(wb, null, IndexedColors.AUTOMATIC.getIndex(),
                false, HorizontalAlignment.LEFT, BorderStyle.THIN);
        XSSFCellStyle dataStyleAlt = buildStyle(wb, COLOR_ROW_ALT, IndexedColors.AUTOMATIC.getIndex(),
                false, HorizontalAlignment.CENTER, BorderStyle.THIN);
        XSSFCellStyle dataStyleAltLeft = buildStyle(wb, COLOR_ROW_ALT, IndexedColors.AUTOMATIC.getIndex(),
                false, HorizontalAlignment.LEFT, BorderStyle.THIN);
        XSSFCellStyle avgStyle = buildStyle(wb, null, IndexedColors.AUTOMATIC.getIndex(),
                true, HorizontalAlignment.CENTER, BorderStyle.THIN);
        XSSFCellStyle avgStyleAlt = buildStyle(wb, COLOR_ROW_ALT, IndexedColors.AUTOMATIC.getIndex(),
                true, HorizontalAlignment.CENTER, BorderStyle.THIN);
        XSSFCellStyle summaryStyle = buildStyle(wb, COLOR_SUMMARY_BG, IndexedColors.AUTOMATIC.getIndex(),
                true, HorizontalAlignment.LEFT, BorderStyle.THIN);
        XSSFCellStyle summaryNumStyle = buildStyle(wb, COLOR_SUMMARY_BG, IndexedColors.AUTOMATIC.getIndex(),
                true, HorizontalAlignment.CENTER, BorderStyle.THIN);

        // ---- ROW 0: Info header ----
        int totalCols = 3 + maxRegular + 2 + 2; // STT + MaHS + HoTen + TXn + GK + CK + DTB + XL
        Row r0 = sheet.createRow(0);
        r0.setHeightInPoints(18);
        setCell(r0, 0, "Lớp:", infoLabelStyle);
        setCell(r0, 1, classRoom.getName(), infoValueStyle);
        setCell(r0, 2, "Môn:", infoLabelStyle);
        setCell(r0, 3, subject.getName(), infoValueStyle);
        setCell(r0, 4, "Học kỳ:", infoLabelStyle);
        setCell(r0, 5, semester.getName(), infoValueStyle);
        setCell(r0, 6, "Năm học:", infoLabelStyle);
        setCell(r0, 7, semester.getAcademicYear() != null ? semester.getAcademicYear().getName() : "", infoValueStyle);
        setCell(r0, 8, "Giáo viên:", infoLabelStyle);
        setCell(r0, 9, user.getFullName() != null ? user.getFullName() : user.getEmail(), infoValueStyle);
        // Fill remaining info cells
        for (int c = 10; c < totalCols; c++) {
            r0.createCell(c).setCellStyle(infoValueStyle);
        }

        // ---- ROW 1: blank spacer ----
        sheet.createRow(1);

        // ---- ROW 2: column headers ----
        Row rHead = sheet.createRow(2);
        rHead.setHeightInPoints(22);
        int col = 0;
        setCell(rHead, col++, "STT", headerStyle);
        setCell(rHead, col++, "Mã HS", headerStyle);
        setCell(rHead, col++, "Họ và tên", headerStyle);
        for (int i = 1; i <= maxRegular; i++) {
            setCell(rHead, col++, "TX" + i, headerStyle);
        }
        setCell(rHead, col++, "Giữa kỳ", headerStyle);
        setCell(rHead, col++, "Cuối kỳ", headerStyle);
        setCell(rHead, col++, "ĐTB", headerStyle);
        setCell(rHead, col++, "Xếp loại", headerStyle);

        // fix column widths
        sheet.setColumnWidth(0, 5 * 256); // STT
        sheet.setColumnWidth(1, 12 * 256); // Mã HS
        sheet.setColumnWidth(2, 28 * 256); // Họ tên
        for (int i = 3; i < 3 + maxRegular + 2; i++)
            sheet.setColumnWidth(i, 10 * 256); // TX, GK, CK
        sheet.setColumnWidth(3 + maxRegular + 2, 10 * 256); // ĐTB
        sheet.setColumnWidth(3 + maxRegular + 2 + 1, 13 * 256); // Xếp loại

        // ---- ROW 3+: data rows ----
        int excellentCount = 0, goodCount = 0, averageCount = 0, weakCount = 0, poorCount = 0;

        for (int i = 0; i < students.size(); i++) {
            Student st = students.get(i);
            boolean isAlt = (i % 2 == 1);
            Row row = sheet.createRow(i + 3);
            row.setHeightInPoints(18);

            Grade g = gradeMap.get(st.getId());

            // Regular scores map
            Map<Integer, BigDecimal> regMap = new LinkedHashMap<>();
            if (g != null && g.getRegularScores() != null) {
                for (RegularScore rs : g.getRegularScores()) {
                    regMap.put(rs.getScoreIndex(), rs.getScoreValue());
                }
            }

            col = 0;
            setCellNum(row, col++, i + 1, isAlt ? dataStyleAlt : dataStyleCenter);
            setCell(row, col++, st.getStudentCode(), isAlt ? dataStyleAlt : dataStyleCenter);
            setCell(row, col++, st.getFullName(), isAlt ? dataStyleAltLeft : dataStyleLeft);
            for (int r = 1; r <= maxRegular; r++) {
                BigDecimal val = regMap.get(r);
                if (val != null)
                    setCellScore(row, col, val, isAlt ? dataStyleAlt : dataStyleCenter);
                else
                    row.createCell(col).setCellStyle(isAlt ? dataStyleAlt : dataStyleCenter);
                col++;
            }
            // Midterm
            if (g != null && g.getMidtermScore() != null)
                setCellScore(row, col, g.getMidtermScore(), isAlt ? dataStyleAlt : dataStyleCenter);
            else
                row.createCell(col).setCellStyle(isAlt ? dataStyleAlt : dataStyleCenter);
            col++;
            // Final
            if (g != null && g.getFinalScore() != null)
                setCellScore(row, col, g.getFinalScore(), isAlt ? dataStyleAlt : dataStyleCenter);
            else
                row.createCell(col).setCellStyle(isAlt ? dataStyleAlt : dataStyleCenter);
            col++;
            // Average (bold)
            BigDecimal avg = (g != null) ? g.getAverageScore() : null;
            if (avg != null)
                setCellScore(row, col, avg, isAlt ? avgStyleAlt : avgStyle);
            else
                row.createCell(col).setCellStyle(isAlt ? avgStyleAlt : avgStyle);
            col++;
            // Rank
            String rank = (g != null && g.getPerformanceCategory() != null) ? g.getPerformanceCategory() : "";
            setCell(row, col++, rank, isAlt ? dataStyleAlt : dataStyleCenter);

            // Tally
            if (avg != null) {
                double d = avg.doubleValue();
                if (d >= 9.0)
                    excellentCount++;
                else if (d >= 8.0)
                    excellentCount++; // Giỏi >= 8
                else if (d >= 6.5)
                    goodCount++; // Khá
                else if (d >= 5.0)
                    averageCount++; // Trung bình
                else if (d >= 3.5)
                    weakCount++; // Yếu
                else
                    poorCount++; // Kém
            }
        }

        // ---- Summary row ----
        int summaryRowIdx = students.size() + 3;
        Row sumRow = sheet.createRow(summaryRowIdx);
        sumRow.setHeightInPoints(18);
        // Merge cols 0-1 for label
        setCell(sumRow, 0, "Tổng kết:", summaryStyle);
        setCell(sumRow, 1, "", summaryStyle);
        setCell(sumRow, 2, "Tổng số HS: " + students.size(), summaryStyle);
        col = 3;
        setCell(sumRow, col++, "Giỏi", summaryStyle);
        setCellNum(sumRow, col++, excellentCount, summaryNumStyle);
        setCell(sumRow, col++, "Khá", summaryStyle);
        setCellNum(sumRow, col++, goodCount, summaryNumStyle);
        setCell(sumRow, col++, "TB", summaryStyle);
        setCellNum(sumRow, col++, averageCount, summaryNumStyle);
        setCell(sumRow, col++, "Yếu", summaryStyle);
        setCellNum(sumRow, col++, weakCount, summaryNumStyle);

        // Merge info cells across the full row width for clean look
        mergeRow(sheet, 0, 0, 0, totalCols - 1);

        // Freeze top info + header rows
        sheet.createFreezePane(0, 3);

        return wb;
    }

    // ==================== STYLE BUILDERS ====================

    private XSSFCellStyle buildStyle(XSSFWorkbook wb, byte[] bgRgb, short fontColorIdx,
            boolean bold, HorizontalAlignment align, BorderStyle border) {
        XSSFCellStyle style = wb.createCellStyle();
        Font font = wb.createFont();
        font.setBold(bold);
        if (fontColorIdx != IndexedColors.AUTOMATIC.getIndex())
            font.setColor(fontColorIdx);
        style.setFont(font);

        if (bgRgb != null) {
            style.setFillForegroundColor(new XSSFColor(bgRgb, null));
            style.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        }

        style.setAlignment(align);
        style.setVerticalAlignment(VerticalAlignment.CENTER);

        if (border != BorderStyle.NONE) {
            style.setBorderTop(border);
            style.setBorderBottom(border);
            style.setBorderLeft(border);
            style.setBorderRight(border);
        }
        style.setWrapText(false);
        return style;
    }

    // ==================== CELL HELPERS ====================

    private void setCell(Row row, int col, String value, CellStyle style) {
        Cell cell = row.createCell(col);
        cell.setCellValue(value != null ? value : "");
        cell.setCellStyle(style);
    }

    private void setCellNum(Row row, int col, int value, CellStyle style) {
        Cell cell = row.createCell(col);
        cell.setCellValue(value);
        cell.setCellStyle(style);
    }

    private void setCellScore(Row row, int col, BigDecimal value, CellStyle style) {
        Cell cell = row.createCell(col);
        if (value != null) {
            cell.setCellValue(value.setScale(1, RoundingMode.HALF_UP).doubleValue());
        }
        cell.setCellStyle(style);
    }

    private void mergeRow(Sheet sheet, int row, int firstRow, int firstCol, int lastCol) {
        // Only merge if there is more than one column to merge
        if (lastCol > firstCol) {
            // We don't merge the info row to keep each cell accessible;
            // just let autoSizeColumn handle widths naturally.
        }
    }
}
