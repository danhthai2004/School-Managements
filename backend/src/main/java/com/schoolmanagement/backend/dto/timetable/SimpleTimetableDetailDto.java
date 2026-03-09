package com.schoolmanagement.backend.dto.timetable;

public record SimpleTimetableDetailDto(
  String className,
  int slot,
  String dayOfWeek,
  String subjectName
) {}

