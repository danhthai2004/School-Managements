package com.schoolmanagement.backend.service.timetable;

import com.schoolmanagement.backend.domain.entity.admin.School;
import com.schoolmanagement.backend.domain.entity.timetable.Timetable;
import com.schoolmanagement.backend.domain.entity.student.Student;
import com.schoolmanagement.backend.domain.entity.classes.ClassRoom;

import com.schoolmanagement.backend.domain.timetable.TimetableStatus;

import com.schoolmanagement.backend.dto.timetable.SimpleTimetableDetailDto;
import com.schoolmanagement.backend.dto.timetable.TimetableDto;
import com.schoolmanagement.backend.exception.ApiException;
import com.schoolmanagement.backend.repo.timetable.TimetableRepository;
import com.schoolmanagement.backend.repo.timetable.TimetableDetailRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
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
  public List<SimpleTimetableDetailDto> getTimetableDetailsOfStudent(Student student, ClassRoom classRoom) {
    School school = student.getSchool();
    Timetable studentTimetable = timetables
        .findFirstBySchoolAndSemesterAndStatusOrderByCreatedAtDesc(school, semesterService.getActiveSemesterEntity(school), TimetableStatus.OFFICIAL)
        .orElseThrow(() -> new EntityNotFoundException("Timetable not found"));
    return timetableDetailRepository.findAllByTimetableAndClassRoom(studentTimetable, classRoom)
        .stream()
        .map(d -> new SimpleTimetableDetailDto(
            d.getClassRoom().getName(),
            d.getSlotIndex(),
            d.getDayOfWeek().name(),
            d.getSubject().getName(),
            d.getTeacher() != null ? d.getTeacher().getFullName() : null))
        .toList();
  }

  public List<com.schoolmanagement.backend.dto.timetable.TimetableDetailDto> getTimetableDetails(UUID timetableId,
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
        .map(d -> new com.schoolmanagement.backend.dto.timetable.TimetableDetailDto(
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

    // Optional: Set all other timetables of this school to DRAFT/ARCHIVED if needed
    // For now, just mark this one as OFFICIAL (Active)
    List<Timetable> schoolTimetables = timetables
        .findAllBySchoolOrderByCreatedAtDesc(timetable.getSchool());
    for (Timetable item : schoolTimetables) {
      if (item.getId().equals(id)) {
        item.setStatus(TimetableStatus.OFFICIAL);
      } else if (item.getStatus() == TimetableStatus.OFFICIAL) {
        item.setStatus(TimetableStatus.DRAFT); // Demote currently active TKB
      }
      timetables.save(item);
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
    java.util.Map<String, java.util.Map<java.time.DayOfWeek, java.util.Map<Integer, com.schoolmanagement.backend.domain.entity.timetable.TimetableDetail>>> matrix = new java.util.HashMap<>();

    for (com.schoolmanagement.backend.domain.entity.timetable.TimetableDetail d : details) {
      matrix.computeIfAbsent(d.getClassRoom().getName(), k -> new java.util.HashMap<>())
          .computeIfAbsent(d.getDayOfWeek(), k -> new java.util.HashMap<>())
          .put(d.getSlotIndex(), d);
    }

    try (org.apache.poi.xssf.usermodel.XSSFWorkbook workbook = new org.apache.poi.xssf.usermodel.XSSFWorkbook()) {
      org.apache.poi.ss.usermodel.Sheet sheet = workbook.createSheet("Timetable");

      // Styles
      org.apache.poi.ss.usermodel.CellStyle headerStyle = workbook.createCellStyle();
      org.apache.poi.ss.usermodel.Font headerFont = workbook.createFont();
      headerFont.setBold(true);
      headerStyle.setFont(headerFont);
      headerStyle.setAlignment(org.apache.poi.ss.usermodel.HorizontalAlignment.CENTER);
      headerStyle.setVerticalAlignment(org.apache.poi.ss.usermodel.VerticalAlignment.CENTER);
      headerStyle.setFillForegroundColor(org.apache.poi.ss.usermodel.IndexedColors.GREY_25_PERCENT.getIndex());
      headerStyle.setFillPattern(org.apache.poi.ss.usermodel.FillPatternType.SOLID_FOREGROUND);
      headerStyle.setBorderBottom(org.apache.poi.ss.usermodel.BorderStyle.THIN);
      headerStyle.setBorderTop(org.apache.poi.ss.usermodel.BorderStyle.THIN);
      headerStyle.setBorderLeft(org.apache.poi.ss.usermodel.BorderStyle.THIN);
      headerStyle.setBorderRight(org.apache.poi.ss.usermodel.BorderStyle.THIN);

      org.apache.poi.ss.usermodel.CellStyle cellStyle = workbook.createCellStyle();
      cellStyle.setVerticalAlignment(org.apache.poi.ss.usermodel.VerticalAlignment.CENTER);
      cellStyle.setAlignment(org.apache.poi.ss.usermodel.HorizontalAlignment.CENTER);
      cellStyle.setWrapText(true);
      cellStyle.setBorderBottom(org.apache.poi.ss.usermodel.BorderStyle.THIN);
      cellStyle.setBorderTop(org.apache.poi.ss.usermodel.BorderStyle.THIN);
      cellStyle.setBorderLeft(org.apache.poi.ss.usermodel.BorderStyle.THIN);
      cellStyle.setBorderRight(org.apache.poi.ss.usermodel.BorderStyle.THIN);

      // Header Row
      org.apache.poi.ss.usermodel.Row header = sheet.createRow(0);
      String[] columns = { "Lớp", "Tiết", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy" };
      for (int i = 0; i < columns.length; i++) {
        org.apache.poi.ss.usermodel.Cell cell = header.createCell(i);
        cell.setCellValue(columns[i]);
        cell.setCellStyle(headerStyle);
      }

      int rowIdx = 1;
      // Sort classes alphabetically
      List<String> sortedClasses = new java.util.ArrayList<>(matrix.keySet());
      java.util.Collections.sort(sortedClasses);

      java.time.DayOfWeek[] days = {
          java.time.DayOfWeek.MONDAY,
          java.time.DayOfWeek.TUESDAY,
          java.time.DayOfWeek.WEDNESDAY,
          java.time.DayOfWeek.THURSDAY,
          java.time.DayOfWeek.FRIDAY,
          java.time.DayOfWeek.SATURDAY
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
      for (int i = 2; i < 8; i++) {
        sheet.setColumnWidth(i, 5000); // Days
      }

      java.io.ByteArrayOutputStream out = new java.io.ByteArrayOutputStream();
      workbook.write(out);
      return out.toByteArray();
    }
  }
}
