package com.schoolmanagement.backend.service.admin;

import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;

@Service
public class ImportTemplateService {

    public byte[] generateStudentTemplate() throws IOException {
        String[] headers = {
                "Họ tên", "Ngày sinh", "Giới tính", "Nơi sinh", "Địa chỉ", "Email", "Số điện thoại",
                "Mã tổ hợp", "Tên phụ huynh", "SĐT phụ huynh", "Mối quan hệ", "Email phụ huynh"
        };
        String[] sample = {
                "Nguyễn Văn A", "01/01/2008", "Nam", "Hà Nội", "123 Đường ABC", "hocsinh@email.com", "0901234567",
                "A00", "Nguyễn Văn B", "0912345678", "Cha", "phuhuynh@email.com"
        };
        return createExcelTemplate("Danh sách học sinh", headers, sample);
    }

    public byte[] generateTeacherTemplate() throws IOException {
        String[] headers = {
                "Họ tên", "Ngày sinh", "Giới tính", "Địa chỉ", "Email", "Số điện thoại",
                "Chuyên môn", "Bằng cấp"
        };
        String[] sample = {
                "Trần Thị B", "15/05/1985", "Nữ", "456 Đường XYZ", "giaovien@email.com", "0987654321",
                "Toán", "Thạc sĩ"
        };
        return createExcelTemplate("Danh sách giáo viên", headers, sample);
    }

    private byte[] createExcelTemplate(String sheetName, String[] headers, String[] sampleRow) throws IOException {
        try (Workbook workbook = new XSSFWorkbook();
             ByteArrayOutputStream out = new ByteArrayOutputStream()) {

            Sheet sheet = workbook.createSheet(sheetName);

            // Create styles
            CellStyle headerStyle = workbook.createCellStyle();
            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerFont.setColor(IndexedColors.WHITE.getIndex());
            headerStyle.setFont(headerFont);
            headerStyle.setFillForegroundColor(IndexedColors.GREY_50_PERCENT.getIndex());
            headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
            headerStyle.setAlignment(HorizontalAlignment.CENTER);
            headerStyle.setBorderBottom(BorderStyle.THIN);
            headerStyle.setBorderTop(BorderStyle.THIN);
            headerStyle.setBorderLeft(BorderStyle.THIN);
            headerStyle.setBorderRight(BorderStyle.THIN);

            CellStyle dataStyle = workbook.createCellStyle();
            dataStyle.setBorderBottom(BorderStyle.THIN);
            dataStyle.setBorderTop(BorderStyle.THIN);
            dataStyle.setBorderLeft(BorderStyle.THIN);
            dataStyle.setBorderRight(BorderStyle.THIN);
            dataStyle.setAlignment(HorizontalAlignment.LEFT);

            // Write header row
            Row rowHeader = sheet.createRow(0);
            for (int i = 0; i < headers.length; i++) {
                Cell cell = rowHeader.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
            }

            // Write sample data row
            Row rowData = sheet.createRow(1);
            for (int i = 0; i < sampleRow.length; i++) {
                Cell cell = rowData.createCell(i);
                cell.setCellValue(sampleRow[i]);
                cell.setCellStyle(dataStyle);
            }

            // Auto-size columns
            for (int i = 0; i < headers.length; i++) {
                sheet.autoSizeColumn(i);
                // Add a little padding to the auto-sized column
                int currentWidth = sheet.getColumnWidth(i);
                sheet.setColumnWidth(i, currentWidth + 1024);
            }

            workbook.write(out);
            return out.toByteArray();
        }
    }
}
