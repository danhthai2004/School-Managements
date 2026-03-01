package com.schoolmanagement.backend.service;

import com.schoolmanagement.backend.domain.TimetableStatus;
import com.schoolmanagement.backend.domain.entity.School;
import com.schoolmanagement.backend.domain.entity.Timetable;
import com.schoolmanagement.backend.dto.TimetableScheduleSummaryDto.SlotTimeDto;
import com.schoolmanagement.backend.repo.TimetableRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TimetableService {

    private final TimetableRepository timetableRepository;
    private final com.schoolmanagement.backend.repo.TimetableDetailRepository timetableDetailRepository;
    private final com.schoolmanagement.backend.repo.ClassRoomRepository classRoomRepository;
    private final com.schoolmanagement.backend.repo.SubjectRepository subjectRepository;
    private final com.schoolmanagement.backend.repo.TeacherRepository teacherRepository;
    private final SchoolTimetableSettingsService settingsService;

    public List<Timetable> getTimetables(School school) {
        return timetableRepository.findAllBySchoolOrderByCreatedAtDesc(school);
    }

    public Timetable getTimetable(UUID id) {
        return timetableRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Timetable not found"));
    }

    @Transactional
    public Timetable createTimetable(School school, String name, String academicYear, int semester) {
        Timetable timetable = Timetable.builder()
                .school(school)
                .name(name)
                .academicYear(academicYear)
                .semester(semester)
                .status(TimetableStatus.DRAFT)
                .createdAt(Instant.now())
                .build();
        return timetableRepository.save(timetable);
    }

    public List<com.schoolmanagement.backend.dto.TimetableDetailDto> getTimetableDetails(UUID timetableId,
            Integer grade, String className) {
        Timetable timetable = getTimetable(timetableId);

        // Get slot times for this school
        List<SlotTimeDto> slotTimes = settingsService.getAllSlotTimes(timetable.getSchool());
        Map<Integer, SlotTimeDto> slotTimeMap = slotTimes.stream()
                .collect(Collectors.toMap(SlotTimeDto::getSlotIndex, s -> s));

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
                .map(d -> {
                    SlotTimeDto slotTime = slotTimeMap.get(d.getSlotIndex());
                    return new com.schoolmanagement.backend.dto.TimetableDetailDto(
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
                            d.isFixed(),
                            d.getClassRoom().getGrade(),
                            slotTime != null ? slotTime.getStartTime() : null,
                            slotTime != null ? slotTime.getEndTime() : null);
                })
                .toList();
    }

    @Transactional
    public void deleteTimetable(UUID id) {
        timetableRepository.deleteById(id);
    }

    @Transactional
    public void applyTimetable(UUID id) {
        Timetable timetable = getTimetable(id);

        // Optional: Set all other timetables of this school to DRAFT/ARCHIVED if needed
        // For now, just mark this one as OFFICIAL (Active)
        List<Timetable> schoolTimetables = timetableRepository
                .findAllBySchoolOrderByCreatedAtDesc(timetable.getSchool());
        for (Timetable t : schoolTimetables) {
            if (t.getId().equals(id)) {
                t.setStatus(TimetableStatus.OFFICIAL);
            } else if (t.getStatus() == TimetableStatus.OFFICIAL) {
                t.setStatus(TimetableStatus.DRAFT); // Demote currently active TKB
            }
            timetableRepository.save(t);
        }
    }

    @Transactional
    public void updateGlobalSlot(UUID timetableId, java.time.DayOfWeek day, int slotIndex, UUID subjectId,
            List<Integer> grades) {
        Timetable timetable = getTimetable(timetableId);

        com.schoolmanagement.backend.domain.entity.Subject subject = null;
        if (subjectId != null) {
            subject = subjectRepository.findById(subjectId)
                    .orElseThrow(() -> new IllegalArgumentException("Subject not found"));
        }

        List<Integer> finalGrades;
        if (grades == null || grades.isEmpty()) {
            finalGrades = List.of(10, 11, 12);
        } else {
            finalGrades = grades;
        }

        // Get all classes for these grades
        var classrooms = classRoomRepository.findAllBySchoolOrderByGradeAscNameAsc(timetable.getSchool()).stream()
                .filter(c -> finalGrades.contains(c.getGrade()))
                .filter(c -> c.getAcademicYear().equals(timetable.getAcademicYear()))
                .toList();

        for (var classroom : classrooms) {
            updateSlotForClass(timetable, classroom, day, slotIndex, subject, null, true);
        }
    }

    @Transactional
    public void updateClassSlot(UUID timetableId, UUID classId, java.time.DayOfWeek day, int slotIndex, UUID subjectId,
            UUID teacherId) {
        Timetable timetable = getTimetable(timetableId);
        var classroom = classRoomRepository.findById(classId)
                .orElseThrow(() -> new IllegalArgumentException("Classroom not found"));

        com.schoolmanagement.backend.domain.entity.Subject subject = null;
        if (subjectId != null) {
            subject = subjectRepository.findById(subjectId)
                    .orElseThrow(() -> new IllegalArgumentException("Subject not found"));
        }

        com.schoolmanagement.backend.domain.entity.Teacher teacher = null;
        if (teacherId != null) {
            teacher = teacherRepository.findById(teacherId)
                    .orElseThrow(() -> new IllegalArgumentException("Teacher not found"));
        }

        updateSlotForClass(timetable, classroom, day, slotIndex, subject, teacher, true);
    }

    private void updateSlotForClass(Timetable timetable, com.schoolmanagement.backend.domain.entity.ClassRoom classroom,
            java.time.DayOfWeek day, int slotIndex, com.schoolmanagement.backend.domain.entity.Subject subject,
            com.schoolmanagement.backend.domain.entity.Teacher teacher, boolean isFixed) {

        // Find existing detail
        var existingOpt = timetableDetailRepository.findByTimetableAndClassRoomAndDayOfWeekAndSlotIndex(
                timetable, classroom, day, slotIndex);

        if (subject == null) {
            // Delete if subject is null (Clear slot)
            existingOpt.ifPresent(timetableDetailRepository::delete);
            return;
        }

        var detail = existingOpt.orElse(com.schoolmanagement.backend.domain.entity.TimetableDetail.builder()
                .timetable(timetable)
                .classRoom(classroom)
                .dayOfWeek(day)
                .slotIndex(slotIndex)
                .build());

        detail.setSubject(subject);
        detail.setTeacher(teacher);
        detail.setFixed(isFixed);

        timetableDetailRepository.save(detail);
    }

    public byte[] exportTimetableToExcel(UUID timetableId, Integer grade, String className) throws java.io.IOException {
        Timetable timetable = getTimetable(timetableId);
        List<com.schoolmanagement.backend.domain.entity.TimetableDetail> details = timetableDetailRepository
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
        java.util.Map<String, java.util.Map<java.time.DayOfWeek, java.util.Map<Integer, com.schoolmanagement.backend.domain.entity.TimetableDetail>>> matrix = new java.util.HashMap<>();

        for (com.schoolmanagement.backend.domain.entity.TimetableDetail d : details) {
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

                // For each slot 1 to 5
                for (int slot = 1; slot <= 5; slot++) {
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
                // [rowIdx - 5, rowIdx - 1]
                sheet.addMergedRegion(new org.apache.poi.ss.util.CellRangeAddress(rowIdx - 5, rowIdx - 1, 0, 0));
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
