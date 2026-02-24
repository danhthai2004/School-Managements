package com.schoolmanagement.backend.dto;

public record SimpleTimetableDetailDto(
  String className,
  int slot,
  String dayOfWeek,
  String subjectName
) {}

