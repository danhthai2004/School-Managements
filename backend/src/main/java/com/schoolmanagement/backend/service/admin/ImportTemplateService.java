package com.schoolmanagement.backend.service.admin;

import org.springframework.stereotype.Service;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.OutputStreamWriter;
import java.nio.charset.StandardCharsets;

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
        return createCsvTemplate(headers, sample);
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
        return createCsvTemplate(headers, sample);
    }

    private byte[] createCsvTemplate(String[] headers, String[] sampleRow) throws IOException {
        try (ByteArrayOutputStream out = new ByteArrayOutputStream();
             OutputStreamWriter writer = new OutputStreamWriter(out, StandardCharsets.UTF_8)) {

            // Write UTF-8 BOM so Excel opens the file correctly
            out.write(new byte[]{(byte) 0xEF, (byte) 0xBB, (byte) 0xBF});

            // Write header row
            writer.write(toCsvRow(headers));
            writer.write("\r\n");

            // Write sample data row
            writer.write(toCsvRow(sampleRow));
            writer.write("\r\n");

            writer.flush();
            return out.toByteArray();
        }
    }

    private String toCsvRow(String[] values) {
        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < values.length; i++) {
            if (i > 0) sb.append(",");
            sb.append(escapeCsv(values[i]));
        }
        return sb.toString();
    }

    private String escapeCsv(String value) {
        if (value == null) return "";
        // Quote the field if it contains comma, double-quote, or newline
        if (value.contains(",") || value.contains("\"") || value.contains("\n") || value.contains("\r")) {
            return "\"" + value.replace("\"", "\"\"") + "\"";
        }
        return value;
    }
}
