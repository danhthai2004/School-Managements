package com.schoolmanagement.backend.service.timetable;

import com.schoolmanagement.backend.domain.entity.admin.School;
import com.schoolmanagement.backend.domain.entity.timetable.Timetable;
import com.schoolmanagement.backend.domain.entity.timetable.TimetableDetail;
import com.schoolmanagement.backend.domain.entity.student.Student;
import com.schoolmanagement.backend.domain.entity.classes.ClassRoom;

import com.schoolmanagement.backend.domain.timetable.TimetableStatus;

import com.schoolmanagement.backend.dto.timetable.SimpleTimetableDetailDto;
import com.schoolmanagement.backend.dto.timetable.TimetableDto;
import com.schoolmanagement.backend.dto.timetable.TimetableDetailDto;
import com.schoolmanagement.backend.exception.ApiException;
import com.schoolmanagement.backend.repo.timetable.TimetableRepository;
import com.schoolmanagement.backend.repo.timetable.TimetableDetailRepository;
import jakarta.persistence.EntityNotFoundException;
import org.apache.poi.ss.usermodel.*;
import java.util.Map;
import java.util.HashMap;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.ZoneId;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class TimetableService {

  private final TimetableRepository timetables;
  private final TimetableDetailRepository timetableDetailRepository;
  private final com.schoolmanagement.backend.service.admin.SemesterService semesterService;

  @Transactional(readOnly = true)
  public List<TimetableDto> getTimetables(School school, UUID semesterId) {
    if (semesterId != null) {
      com.schoolmanagement.backend.domain.entity.admin.Semester semester = semesterService.getSemester(semesterId);
      return timetables.findAllBySchoolAndSemester(school, semester)
          .stream()
          .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
          .map(this::toDto).toList();
    }
    return timetables.findAllBySchoolOrderByCreatedAtDesc(school)
        .stream().map(this::toDto).toList();
  }

  @Transactional(readOnly = true)
  public TimetableDto getTimetable(School school, UUID id) {
    Timetable timetable = timetables.findById(id)
        .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy thời khóa biểu."));
    if (!timetable.getSchool().getId().equals(school.getId())) {
      throw new ApiException(HttpStatus.FORBIDDEN, "Bạn không có quyền xem thời khóa biểu này.");
    }
    return toDto(timetable);
  }

  public Timetable getTimetableByStatusAndName(TimetableStatus status, School school, String className) {
    return timetables.findByStatusAndSchoolAndNameContains(status, school, className)
        .orElseThrow(() -> new EntityNotFoundException("Timetable not found"));
  }

  @Transactional
  public TimetableDto createTimetable(School school, String name, UUID semesterId) {
    com.schoolmanagement.backend.domain.entity.admin.Semester semester = semesterService.getSemester(semesterId);
    Timetable timetable = Timetable.builder()
        .school(school)
        .name(name)
        .semester(semester)
        .status(TimetableStatus.DRAFT)
        .createdAt(Instant.now())
        .build();
    timetable = timetables.save(timetable);
    return toDto(timetable);
  }

  private TimetableDto toDto(Timetable timetable) {
    String academicYearName = "";
    if (timetable.getSemester() != null && timetable.getSemester().getAcademicYear() != null) {
      academicYearName = timetable.getSemester().getAcademicYear().getName();
    }

    int semesterNumber = 0;
    if (timetable.getSemester() != null) {
      semesterNumber = timetable.getSemester().getSemesterNumber();
    }

    return new TimetableDto(
        timetable.getId(),
        timetable.getName(),
        academicYearName,
        semesterNumber,
        timetable.getStatus().name(),
        timetable.getCreatedAt());
  }

  // OVERLOADING
  public List<SimpleTimetableDetailDto> getTimetableDetailsOfStudent(Student student, ClassRoom classRoom, LocalDate targetDate) {
    School school = student.getSchool();
    LocalDate dateToUse = targetDate != null ? targetDate : LocalDate.now(ZoneId.of("Asia/Ho_Chi_Minh"));
    Timetable studentTimetable = timetables
        .findTimetableAtDate(school, dateToUse)
        .orElseThrow(() -> new EntityNotFoundException("Timetable not found"));
    return timetableDetailRepository.findAllByTimetableAndClassRoom(studentTimetable, classRoom)
        .stream()
        .map(d -> new SimpleTimetableDetailDto(
            d.getClassRoom().getName(),
            d.getSlotIndex(),
            d.getDayOfWeek().name(),
            d.getSubject().getName(),
            d.getTeacher() != null ? d.getTeacher().getFullName() : null,
            d.getClassRoom().getRoom() != null ? d.getClassRoom().getRoom().getName() : "N/A"))
        .toList();
  }

  public List<TimetableDetailDto> getTimetableDetails(UUID timetableId,
      Integer grade, String className) {
    Timetable timetable = timetables.findById(timetableId)
        .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy thời khóa biểu."));
    return timetableDetailRepository
        .findAllByTimetable(timetable).stream()
        .filter(d -> {
          if (grade != null && d.getClassRoom().getGrade() != grade)
            return false;
          if (className != null && !className.isBlank()
              && !d.getClassRoom().getName().toLowerCase().contains(className.toLowerCase()))
            return false;
          return true;
        })
        .map(d -> new TimetableDetailDto(
            d.getId(),
            d.getClassRoom().getId(),
            d.getClassRoom().getName(),
            d.getSubject().getId(),
            d.getSubject().getName(),
            d.getSubject().getCode(),
            d.getTeacher() != null ? d.getTeacher().getId() : null,
            d.getTeacher() != null ? d.getTeacher().getFullName() : null,
            d.getDayOfWeek().name(),
            d.getSlotIndex(),
            d.isFixed()))
        .toList();
  }

  @Transactional
  public void deleteTimetable(UUID id) {
    timetables.deleteById(id);
  }

  @Transactional
  public void applyTimetable(UUID id) {
    Timetable timetable = timetables.findById(id)
        .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy thời khóa biểu."));

    // Set today as the start date for this timetable
    timetable.setAppliedDate(LocalDate.now());
    timetable.setStatus(TimetableStatus.OFFICIAL);
    timetables.save(timetable);

    // Archive all other currently OFFICIAL timetables of this school
    List<Timetable> schoolTimetables = timetables
        .findAllBySchoolOrderByCreatedAtDesc(timetable.getSchool());
    for (Timetable item : schoolTimetables) {
      if (!item.getId().equals(id) && item.getStatus() == TimetableStatus.OFFICIAL) {
        item.setStatus(TimetableStatus.ARCHIVED); // Archive previously active TKB
        timetables.save(item);
      }
    }
  }

  public byte[] exportTimetableToExcel(UUID timetableId, Integer grade, String className) throws java.io.IOException {
    Timetable timetable = timetables.findById(timetableId)
        .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy thời khóa biểu."));
    List<com.schoolmanagement.backend.domain.entity.timetable.TimetableDetail> details = timetableDetailRepository
        .findAllByTimetable(timetable).stream()
        .filter(d -> {
          if (grade != null && d.getClassRoom().getGrade() != grade)
            return false;
          if (className != null && !className.isBlank()
              && !d.getClassRoom().getName().toLowerCase().contains(className.toLowerCase()))
            return false;
          return true;
        })
        .toList();

    // Group by Class, then Day, then Slot
    // Map<ClassName, Map<DayOfWeek, Map<Slot, Detail>>>
    java.util.Map<String, Map<DayOfWeek, Map<Integer, TimetableDetail>>> matrix = new java.util.HashMap<>();

    for (TimetableDetail d : details) {
      matrix.computeIfAbsent(d.getClassRoom().getName(), k -> new HashMap<>())
          .computeIfAbsent(d.getDayOfWeek(), k -> new HashMap<>())
          .put(d.getSlotIndex(), d);
    }

    try (org.apache.poi.xssf.usermodel.XSSFWorkbook workbook = new org.apache.poi.xssf.usermodel.XSSFWorkbook()) {
      org.apache.poi.ss.usermodel.Sheet sheet = workbook.createSheet("Timetable");

      // Styles
      org.apache.poi.ss.usermodel.CellStyle headerStyle = workbook.createCellStyle();
      org.apache.poi.ss.usermodel.Font headerFont = workbook.createFont();
      headerFont.setBold(true);
      headerStyle.setFont(headerFont);
      headerStyle.setAlignment(HorizontalAlignment.CENTER);
      headerStyle.setVerticalAlignment(VerticalAlignment.CENTER);
      headerStyle.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
      headerStyle.setFillPattern(FillPatternType.SOLID_FOREGROUND);
      headerStyle.setBorderBottom(BorderStyle.THIN);
      headerStyle.setBorderTop(BorderStyle.THIN);
      headerStyle.setBorderLeft(BorderStyle.THIN);
      headerStyle.setBorderRight(BorderStyle.THIN);

      CellStyle cellStyle = workbook.createCellStyle();
      cellStyle.setVerticalAlignment(VerticalAlignment.CENTER);
      cellStyle.setAlignment(HorizontalAlignment.CENTER);
      cellStyle.setWrapText(true);
      cellStyle.setBorderBottom(BorderStyle.THIN);
      cellStyle.setBorderTop(BorderStyle.THIN);
      cellStyle.setBorderLeft(BorderStyle.THIN);
      cellStyle.setBorderRight(BorderStyle.THIN);

      // Header Row
      org.apache.poi.ss.usermodel.Row header = sheet.createRow(0);
      String[] columns = { "Lớp", "Tiết", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy", "Chủ Nhật" };
      for (int i = 0; i < columns.length; i++) {
        org.apache.poi.ss.usermodel.Cell cell = header.createCell(i);
        cell.setCellValue(columns[i]);
        cell.setCellStyle(headerStyle);
      }

      int rowIdx = 1;
      // Sort classes alphabetically
      List<String> sortedClasses = new java.util.ArrayList<>(matrix.keySet());
      sortedClasses.sort((a, b) -> {
        // Manual natural sort for Java
        String[] aParts = a.split("(?<=\\D)(?=\\d)|(?<=\\d)(?=\\D)");
        String[] bParts = b.split("(?<=\\D)(?=\\d)|(?<=\\d)(?=\\D)");
        int len = Math.min(aParts.length, bParts.length);
        for (int i = 0; i < len; i++) {
          if (Character.isDigit(aParts[i].charAt(0)) && Character.isDigit(bParts[i].charAt(0))) {
            int aInt = Integer.parseInt(aParts[i]);
            int bInt = Integer.parseInt(bParts[i]);
            if (aInt != bInt)
              return aInt - bInt;
          } else {
            int r = aParts[i].compareTo(bParts[i]);
            if (r != 0)
              return r;
          }
        }
        return a.length() - b.length();
      });

      DayOfWeek[] days = {
          DayOfWeek.MONDAY,
          DayOfWeek.TUESDAY,
          DayOfWeek.WEDNESDAY,
          DayOfWeek.THURSDAY,
          DayOfWeek.FRIDAY,
          DayOfWeek.SATURDAY,
          DayOfWeek.SUNDAY
      };

      for (String clsName : sortedClasses) {
        var classData = matrix.get(clsName);

        // For each slot 1 to 10 (Morning + Afternoon)
        for (int slot = 1; slot <= 10; slot++) {
          org.apache.poi.ss.usermodel.Row row = sheet.createRow(rowIdx++);
          row.setHeightInPoints(40); // Taller rows for wrapped text

          // Class Name (only on first slot, but we'll merge later)
          org.apache.poi.ss.usermodel.Cell classCell = row.createCell(0);
          classCell.setCellValue(clsName);
          classCell.setCellStyle(cellStyle);

          // Slot
          org.apache.poi.ss.usermodel.Cell slotCell = row.createCell(1);
          slotCell.setCellValue("Tiết " + slot);
          slotCell.setCellStyle(cellStyle);

          // Days
          for (int i = 0; i < days.length; i++) {
            java.time.DayOfWeek day = days[i];
            org.apache.poi.ss.usermodel.Cell dayCell = row.createCell(i + 2);
            dayCell.setCellStyle(cellStyle);

            if (classData.containsKey(day) && classData.get(day).containsKey(slot)) {
              var d = classData.get(day).get(slot);
              String text = d.getSubject().getName();
              if (d.getTeacher() != null) {
                text += "\n(" + d.getTeacher().getFullName() + ")";
              }
              dayCell.setCellValue(text);
            } else {
              dayCell.setCellValue("-");
            }
          }
        }

        // Merge Class Cells: (startRow, endRow, colIndex, colIndex)
        // rowIdx is currently at the next class's start. So current class range is
        // [rowIdx - 10, rowIdx - 1]
        sheet.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(rowIdx - 10, rowIdx - 1, 0, 0));
      }

      // Autosize columns
      sheet.setColumnWidth(0, 2500); // Class
      sheet.setColumnWidth(1, 2000); // Slot
      for (int i = 2; i < 9; i++) {
        sheet.setColumnWidth(i, 5000); // Days
      }

      java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream();
      workbook.write(out);
      return out.toByteArray();
    }
  }
}
