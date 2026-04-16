package com.schoolmanagement.backend.service.admin;

import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;

@Service
public class ImportTemplateService {

    public byte[] generateStudentTemplate() throws IOException {
        String[] columns = {
                "Họ tên", "Ngày sinh", "Giới tính", "Nơi sinh", "Địa chỉ", "Email", "Số điện thoại",
                "Mã tổ hợp", "Tên phụ huynh", "SĐT phụ huynh", "Mối quan hệ", "Email phụ huynh"
        };

        return createExcelTemplate("Template_HocSinh", columns);
    }

    public byte[] generateTeacherTemplate() throws IOException {
        String[] columns = {
                "Họ tên", "Ngày sinh", "Giới tính", "Địa chỉ", "Email", "Số điện thoại",
                "Chuyên môn", "Bằng cấp"
        };

        return createExcelTemplate("Template_GiaoVien", columns);
    }

    private byte[] createExcelTemplate(String sheetName, String[] columns) throws IOException {
        try (Workbook workbook = new XSSFWorkbook(); ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet(sheetName);

            // Create header font & style
            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerFont.setColor(IndexedColors.WHITE.getIndex());

            CellStyle headerCellStyle = workbook.createCellStyle();
            headerCellStyle.setFont(headerFont);
            headerCellStyle.setFillForegroundColor(IndexedColors.BLUE_GREY.getIndex());
            headerCellStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            headerCellStyle.setAlignment(HorizontalAlignment.CENTER);
            headerCellStyle.setBorderBottom(BorderStyle.THIN);
            headerCellStyle.setBorderTop(BorderStyle.THIN);
            headerCellStyle.setBorderLeft(BorderStyle.THIN);
            headerCellStyle.setBorderRight(BorderStyle.THIN);

            // Create header row
            Row headerRow = sheet.createRow(0);
            for (int i = 0; i < columns.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(columns[i]);
                cell.setCellStyle(headerCellStyle);
                sheet.setColumnWidth(i, 20 * 256); // Set Default width
            }

            // Add sample data row
            Row sampleRow = sheet.createRow(1);
            CellStyle sampleStyle = workbook.createCellStyle();
            Font sampleFont = workbook.createFont();
            sampleFont.setItalic(true);
            sampleFont.setColor(IndexedColors.GREY_40_PERCENT.getIndex());
            sampleStyle.setFont(sampleFont);

            for (int i = 0; i < columns.length; i++) {
                Cell cell = sampleRow.createCell(i);
                cell.setCellValue("(Dữ liệu mẫu)");
                cell.setCellStyle(sampleStyle);
            }

            workbook.write(out);
            return out.toByteArray();
        }
    }
}
