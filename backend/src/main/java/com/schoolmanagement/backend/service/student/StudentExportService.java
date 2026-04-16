package com.schoolmanagement.backend.service.student;

import com.schoolmanagement.backend.domain.entity.admin.School;
import com.schoolmanagement.backend.domain.entity.classes.ClassEnrollment;
import com.schoolmanagement.backend.domain.entity.classes.ClassRoom;
import com.schoolmanagement.backend.domain.entity.student.Student;
import com.schoolmanagement.backend.repo.classes.ClassEnrollmentRepository;
import com.schoolmanagement.backend.repo.classes.ClassRoomRepository;
import com.schoolmanagement.backend.repo.student.StudentRepository;
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
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class StudentExportService {

    private final StudentRepository studentRepository;
    private final ClassRoomRepository classRoomRepository;
    private final ClassEnrollmentRepository enrollmentRepository;

    // --- Custom colors (RGB) ---
    private static final byte[] COLOR_HEADER_BG = { (byte) 30, (byte) 80, (byte) 160 }; // Deep blue
    private static final byte[] COLOR_ROW_ALT = { (byte) 245, (byte) 248, (byte) 255 }; // Very light blue

    public Workbook exportStudents(School school, UUID classId) {
        List<Student> studentsList;

        if (classId != null) {
            ClassRoom classRoom = classRoomRepository.findById(classId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Không tìm thấy lớp học"));
            if (!classRoom.getSchool().getId().equals(school.getId())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Lớp học không thuộc trường này");
            }
            studentsList = enrollmentRepository.findAllByClassRoom(classRoom).stream()
                    .map(ClassEnrollment::getStudent)
                    .sorted((s1, s2) -> StudentSortUtils.vietnameseNameComparator().compare(s1.getFullName(),
                            s2.getFullName()))
                    .toList();
        } else {
            studentsList = studentRepository.findAllBySchoolOrderByFullNameAsc(school);
            // Re-sort using Vietnamese comparator
            studentsList = new java.util.ArrayList<>(studentsList);
            studentsList.sort((s1, s2) -> StudentSortUtils.vietnameseNameComparator().compare(s1.getFullName(),
                    s2.getFullName()));
        }

        Workbook workbook = new XSSFWorkbook();
        Sheet sheet = workbook.createSheet("Danh sách học sinh");

        // --- STYLES ---
        // 1. Header Style
        XSSFCellStyle headerStyle = (XSSFCellStyle) workbook.createCellStyle();
        headerStyle.setFillForegroundColor(new XSSFColor(COLOR_HEADER_BG, null));
        headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
        headerStyle.setAlignment(HorizontalAlignment.CENTER);
        headerStyle.setVerticalAlignment(VerticalAlignment.CENTER);
        headerStyle.setBorderBottom(BorderStyle.THIN);
        headerStyle.setBorderTop(BorderStyle.THIN);
        headerStyle.setBorderLeft(BorderStyle.THIN);
        headerStyle.setBorderRight(BorderStyle.THIN);

        Font headerFont = workbook.createFont();
        headerFont.setColor(IndexedColors.WHITE.getIndex());
        headerFont.setBold(true);
        headerFont.setFontHeightInPoints((short) 11);
        headerStyle.setFont(headerFont);

        // 2. Data Style (Normal)
        CellStyle dataStyleCenter = workbook.createCellStyle();
        dataStyleCenter.setAlignment(HorizontalAlignment.CENTER);
        dataStyleCenter.setBorderBottom(BorderStyle.THIN);
        dataStyleCenter.setBorderLeft(BorderStyle.THIN);
        dataStyleCenter.setBorderRight(BorderStyle.THIN);

        CellStyle dataStyleLeft = workbook.createCellStyle();
        dataStyleLeft.setAlignment(HorizontalAlignment.LEFT);
        dataStyleLeft.setBorderBottom(BorderStyle.THIN);
        dataStyleLeft.setBorderLeft(BorderStyle.THIN);
        dataStyleLeft.setBorderRight(BorderStyle.THIN);

        // 3. Alt Row Style
        XSSFCellStyle dataStyleAlt = (XSSFCellStyle) workbook.createCellStyle();
        dataStyleAlt.cloneStyleFrom(dataStyleCenter);
        dataStyleAlt.setFillForegroundColor(new XSSFColor(COLOR_ROW_ALT, null));
        dataStyleAlt.setFillPattern(FillPatternType.SOLID_FOREGROUND);

        XSSFCellStyle dataStyleAltLeft = (XSSFCellStyle) workbook.createCellStyle();
        dataStyleAltLeft.cloneStyleFrom(dataStyleLeft);
        dataStyleAltLeft.setFillForegroundColor(new XSSFColor(COLOR_ROW_ALT, null));
        dataStyleAltLeft.setFillPattern(FillPatternType.SOLID_FOREGROUND);

        // 4. Title Style
        CellStyle titleStyle = workbook.createCellStyle();
        Font titleFont = workbook.createFont();
        titleFont.setBold(true);
        titleFont.setFontHeightInPoints((short) 16);
        titleFont.setColor(new XSSFColor(COLOR_HEADER_BG, null).getIndex());
        titleStyle.setFont(titleFont);
        titleStyle.setAlignment(HorizontalAlignment.CENTER);

        // --- CONTENT ---
        // Title
        Row rTitle = sheet.createRow(0);
        String titleText = "DANH SÁCH HỌC SINH";
        if (classId != null) {
            ClassRoom cr = classRoomRepository.findById(classId).orElse(null);
            if (cr != null)
                titleText += " - LỚP " + cr.getName().toUpperCase();
        }
        Cell cTitle = rTitle.createCell(0);
        cTitle.setCellValue(titleText);
        cTitle.setCellStyle(titleStyle);
        sheet.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(0, 0, 0, 9));

        // School Name
        Row rSchool = sheet.createRow(1);
        Cell cSchool = rSchool.createCell(0);
        cSchool.setCellValue("Trường: " + school.getName());
        CellStyle schoolStyle = workbook.createCellStyle();
        Font schoolFont = workbook.createFont();
        schoolFont.setItalic(true);
        schoolStyle.setFont(schoolFont);
        cSchool.setCellStyle(schoolStyle);

        // Header
        Row rHead = sheet.createRow(3);
        rHead.setHeightInPoints(25);
        String[] headers = { "STT", "Mã HS", "Họ và tên", "Giới tính", "Ngày sinh", "Lớp", "Điện thoại", "Email",
                "Điện thoại PH", "Trạng thái" };
        for (int i = 0; i < headers.length; i++) {
            Cell cell = rHead.createCell(i);
            cell.setCellValue(headers[i]);
            cell.setCellStyle(headerStyle);
        }

        // Column widths
        int[] widths = { 5, 12, 28, 10, 15, 12, 15, 25, 15, 15 };
        for (int i = 0; i < widths.length; i++) {
            sheet.setColumnWidth(i, widths[i] * 256);
        }

        // Data
        for (int i = 0; i < studentsList.size(); i++) {
            Student st = studentsList.get(i);
            boolean isAlt = (i % 2 == 1);
            Row row = sheet.createRow(i + 4);
            row.setHeightInPoints(20);

            CellStyle center = isAlt ? dataStyleAlt : dataStyleCenter;
            CellStyle left = isAlt ? dataStyleAltLeft : dataStyleLeft;

            int col = 0;
            setCell(row, col++, String.valueOf(i + 1), center);
            setCell(row, col++, st.getStudentCode(), center);
            setCell(row, col++, st.getFullName(), left);
            setCell(row, col++, translateGender(st.getGender()), center);
            setCell(row, col++, st.getDateOfBirth() != null ? st.getDateOfBirth().toString() : "", center);

            // Current class
            String className = "";
            List<ClassEnrollment> enrs = enrollmentRepository.findAllByStudent(st);
            if (enrs != null && !enrs.isEmpty()) {
                className = enrs.get(0).getClassRoom().getName();
            }
            setCell(row, col++, className, center);

            setCell(row, col++, st.getPhone(), center);
            setCell(row, col++, st.getEmail(), left);
            setCell(row, col++, st.getGuardian() != null ? st.getGuardian().getPhone() : "", center);
            setCell(row, col++, translateStatus(st.getStatus()), center);
        }

        return workbook;
    }

    private void setCell(Row row, int col, String val, CellStyle style) {
        Cell cell = row.createCell(col);
        cell.setCellValue(val != null ? val : "");
        cell.setCellStyle(style);
    }

    private String translateGender(com.schoolmanagement.backend.domain.student.Gender gender) {
        if (gender == null)
            return "";
        return switch (gender) {
            case MALE -> "Nam";
            case FEMALE -> "Nữ";
            default -> "Khác";
        };
    }

    private String translateStatus(com.schoolmanagement.backend.domain.student.StudentStatus status) {
        if (status == null)
            return "";
        return switch (status) {
            case ACTIVE -> "Đang học";
            case SUSPENDED -> "Tạm nghỉ";
            case GRADUATED -> "Đã tốt nghiệp";
            case TRANSFERRED -> "Chuyển trường";
            default -> status.name();
        };
    }
}
