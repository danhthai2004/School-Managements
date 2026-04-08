package com.schoolmanagement.backend.util;

public class TimeUtils {
  /**
   * @deprecated Dùng SemesterService.getActiveAcademicYearName(school) thay thế.
   */
  @Deprecated(forRemoval = true)
  public static String getCurrentAcademicYear() {
    int year = java.time.LocalDate.now().getYear();
    int month = java.time.LocalDate.now().getMonthValue();

    String currentAcademicYear;
    if (month >= 9) {
      currentAcademicYear = year + "-" + (year + 1);
    } else {
      currentAcademicYear = (year - 1) + "-" + year;
    }

    return currentAcademicYear;
  }
}
