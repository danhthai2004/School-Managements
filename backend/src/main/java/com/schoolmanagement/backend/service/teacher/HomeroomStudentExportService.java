package com.schoolmanagement.backend.service.teacher;

import com.schoolmanagement.backend.domain.entity.auth.User;
import com.schoolmanagement.backend.domain.entity.classes.ClassEnrollment;
import com.schoolmanagement.backend.domain.entity.classes.ClassRoom;
import com.schoolmanagement.backend.domain.entity.student.Student;
import com.schoolmanagement.backend.repo.auth.UserRepository;
import com.schoolmanagement.backend.repo.classes.ClassEnrollmentRepository;
import com.schoolmanagement.backend.repo.classes.ClassRoomRepository;
import com.schoolmanagement.backend.util.StudentSortUtils;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFCellStyle;
import org.apache.poi.xssf.usermodel.XSSFColor;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class HomeroomStudentExportService {

    private final UserRepository userRepository;
    private final ClassRoomRepository classRoomRepository;
    private final ClassEnrollmentRepository classEnrollmentRepository;

    // --- Custom colors (RGB) ---
    private static final byte[] COLOR_HEADER_BG = { (byte) 30, (byte) 80, (byte) 160 }; // Deep blue
    private static final byte[] COLOR_INFO_BG = { (byte) 224, (byte) 235, (byte) 255 }; // Light blue-gray
    private static final byte[] COLOR_ROW_ALT = { (byte) 245, (byte) 248, (byte) 255 }; // Very light blue
    private static final byte[] COLOR_SUMMARY_BG = { (byte) 230, (byte) 245, (byte) 235 }; // Light green

    public Workbook exportHomeroomStudents(String teacherEmail) {
        User teacher = userRepository.findByEmailIgnoreCase(teacherEmail)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        Optional<ClassRoom> homeroomClass = classRoomRepository.findByHomeroomTeacher(teacher);
        if (homeroomClass.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only homeroom teachers can access student list");
        }

        ClassRoom homeroom = homeroomClass.get();
        List<ClassEnrollment> enrollments = classEnrollmentRepository
                .findAllByClassRoomAndAcademicYear(homeroom, homeroom.getAcademicYear());

        List<Student> students = enrollments.stream()
                .map(ClassEnrollment::getStudent)
                .sorted((s1, s2) -> StudentSortUtils.vietnameseNameComparator().compare(s1.getFullName(),
                        s2.getFullName()))
                .toList();

        // Build workbook
        XSSFWorkbook wb = new XSSFWorkbook();
        Sheet sheet = wb.createSheet("Danh sách học sinh");
        sheet.setDefaultColumnWidth(15);

        // ---- Styles ----
        XSSFCellStyle headerStyle = buildStyle(wb, COLOR_HEADER_BG, IndexedColors.WHITE.getIndex(), true,
                HorizontalAlignment.CENTER, BorderStyle.THIN);
        XSSFCellStyle infoLabelStyle = buildStyle(wb, COLOR_INFO_BG, IndexedColors.AUTOMATIC.getIndex(), true,
                HorizontalAlignment.LEFT, BorderStyle.NONE);
        XSSFCellStyle infoValueStyle = buildStyle(wb, COLOR_INFO_BG, IndexedColors.AUTOMATIC.getIndex(), false,
                HorizontalAlignment.LEFT, BorderStyle.NONE);
        XSSFCellStyle dataStyleCenter = buildStyle(wb, null, IndexedColors.AUTOMATIC.getIndex(), false,
                HorizontalAlignment.CENTER, BorderStyle.THIN);
        XSSFCellStyle dataStyleLeft = buildStyle(wb, null, IndexedColors.AUTOMATIC.getIndex(), false,
                HorizontalAlignment.LEFT, BorderStyle.THIN);
        XSSFCellStyle dataStyleAlt = buildStyle(wb, COLOR_ROW_ALT, IndexedColors.AUTOMATIC.getIndex(), false,
                HorizontalAlignment.CENTER, BorderStyle.THIN);
        XSSFCellStyle dataStyleAltLeft = buildStyle(wb, COLOR_ROW_ALT, IndexedColors.AUTOMATIC.getIndex(), false,
                HorizontalAlignment.LEFT, BorderStyle.THIN);
        XSSFCellStyle summaryStyle = buildStyle(wb, COLOR_SUMMARY_BG, IndexedColors.AUTOMATIC.getIndex(), true,
                HorizontalAlignment.LEFT, BorderStyle.THIN);

        int totalCols = 9; // STT, MSHS, Họ và tên, Giới tính, Ngày sinh, SĐT, Email, SĐT PH, Trạng thái

        // ---- ROW 0: Info header ----
        Row r0 = sheet.createRow(0);
        r0.setHeightInPoints(18);
        setCell(r0, 0, "Lớp:", infoLabelStyle);
        setCell(r0, 1, homeroom.getName(), infoValueStyle);
        setCell(r0, 2, "Giáo viên CN:", infoLabelStyle);
        setCell(r0, 3, teacher.getFullName(), infoValueStyle);
        setCell(r0, 4, "Năm học:", infoLabelStyle);
        setCell(r0, 5, homeroom.getAcademicYear() != null ? homeroom.getAcademicYear().getName() : "", infoValueStyle);

        for (int c = 6; c < totalCols; c++) {
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
        setCell(rHead, col++, "Giới tính", headerStyle);
        setCell(rHead, col++, "Ngày sinh", headerStyle);
        setCell(rHead, col++, "Điện thoại", headerStyle);
        setCell(rHead, col++, "Email", headerStyle);
        setCell(rHead, col++, "Điện thoại PH", headerStyle);
        setCell(rHead, col++, "Trạng thái", headerStyle);

        // Adjust column widths
        sheet.setColumnWidth(0, 5 * 256); // STT
        sheet.setColumnWidth(1, 12 * 256); // Mã HS
        sheet.setColumnWidth(2, 28 * 256); // Họ tên
        sheet.setColumnWidth(3, 10 * 256); // Giới tính
        sheet.setColumnWidth(4, 12 * 256); // Ngày sinh
        sheet.setColumnWidth(5, 15 * 256); // Điện thoại
        sheet.setColumnWidth(6, 25 * 256); // Email
        sheet.setColumnWidth(7, 15 * 256); // Điện thoại PH
        sheet.setColumnWidth(8, 15 * 256); // Trạng thái

        // ---- ROW 3+: data rows ----
        for (int i = 0; i < students.size(); i++) {
            Student st = students.get(i);
            boolean isAlt = (i % 2 == 1);
            Row row = sheet.createRow(i + 3);
            row.setHeightInPoints(18);

            col = 0;
            setCellNum(row, col++, i + 1, isAlt ? dataStyleAlt : dataStyleCenter);
            setCell(row, col++, st.getStudentCode(), isAlt ? dataStyleAlt : dataStyleCenter);
            setCell(row, col++, st.getFullName(), isAlt ? dataStyleAltLeft : dataStyleLeft);

            String genderStr = st.getGender() != null ? st.getGender().name() : "";
            if (genderStr.equals("MALE"))
                genderStr = "Nam";
            else if (genderStr.equals("FEMALE"))
                genderStr = "Nữ";
            else
                genderStr = "Khác";
            setCell(row, col++, genderStr, isAlt ? dataStyleAlt : dataStyleCenter);

            String dob = st.getDateOfBirth() != null ? st.getDateOfBirth().toString() : "";
            setCell(row, col++, dob, isAlt ? dataStyleAlt : dataStyleCenter);

            setCell(row, col++, st.getPhone(), isAlt ? dataStyleAlt : dataStyleCenter);
            setCell(row, col++, st.getEmail(), isAlt ? dataStyleAltLeft : dataStyleLeft);

            String parentPhone = "";
            if (st.getGuardian() != null && st.getGuardian().getPhone() != null) {
                parentPhone = st.getGuardian().getPhone();
            }
            setCell(row, col++, parentPhone, isAlt ? dataStyleAlt : dataStyleCenter);

            String statusStr = st.getStatus() != null ? st.getStatus().name() : "";
            if (statusStr.equals("ACTIVE"))
                statusStr = "Đang học";
            else if (statusStr.equals("SUSPENDED"))
                statusStr = "Tạm nghỉ";
            else if (statusStr.equals("TRANSFERRED"))
                statusStr = "Chuyển trường";
            else if (statusStr.equals("GRADUATED"))
                statusStr = "Đã tốt nghiệp";
            setCell(row, col++, statusStr, isAlt ? dataStyleAlt : dataStyleCenter);
        }

        // ---- Summary row ----
        int summaryRowIdx = students.size() + 3;
        Row sumRow = sheet.createRow(summaryRowIdx);
        sumRow.setHeightInPoints(18);
        setCell(sumRow, 0, "Tổng kết:", summaryStyle);
        setCell(sumRow, 1, "", summaryStyle);
        setCell(sumRow, 2, "Sĩ số: " + students.size() + " học sinh", summaryStyle);
        for (int c = 3; c < totalCols; c++) {
            setCell(sumRow, c, "", summaryStyle);
        }

        sheet.createFreezePane(0, 3);

        return wb;
    }

    private XSSFCellStyle buildStyle(XSSFWorkbook wb, byte[] bgRgb, short fontColorIdx, boolean bold,
            HorizontalAlignment align, BorderStyle border) {
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
        return style;
    }

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
}
