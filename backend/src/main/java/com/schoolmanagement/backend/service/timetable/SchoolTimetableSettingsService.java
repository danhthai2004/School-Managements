package com.schoolmanagement.backend.service.timetable;

import com.schoolmanagement.backend.domain.entity.admin.School;
import com.schoolmanagement.backend.domain.entity.timetable.SchoolTimetableSettings;
import com.schoolmanagement.backend.dto.timetable.TimetableScheduleSummaryDto;
import com.schoolmanagement.backend.dto.timetable.TimetableScheduleSummaryDto.SlotTimeDto;
import com.schoolmanagement.backend.dto.timetable.TimetableSettingsDto;
import com.schoolmanagement.backend.repo.timetable.SchoolTimetableSettingsRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class SchoolTimetableSettingsService {

    private final SchoolTimetableSettingsRepository settingsRepository;
    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm");

    /**
     * Get settings for a school. Returns default settings if none exist.
     */
    public TimetableSettingsDto getSettings(School school) {
        SchoolTimetableSettings settings = settingsRepository.findBySchoolId(school.getId())
                .orElse(createDefaultSettings(school));
        return toDto(settings);
    }

    /**
     * Get or create settings entity for a school.
     */
    public SchoolTimetableSettings getOrCreateSettingsEntity(School school) {
        return settingsRepository.findBySchoolId(school.getId())
                .orElseGet(() -> {
                    SchoolTimetableSettings defaultSettings = createDefaultSettings(school);
                    return settingsRepository.save(defaultSettings);
                });
    }

    /**
     * Update settings for a school.
     */
    @Transactional
    public TimetableSettingsDto updateSettings(School school, TimetableSettingsDto dto) {
        SchoolTimetableSettings settings = settingsRepository.findBySchoolId(school.getId())
                .orElse(createDefaultSettings(school));

        // Validate constraints
        validateSettings(dto);

        // Update fields
        settings.setPeriodsPerMorning(dto.getPeriodsPerMorning());
        settings.setPeriodsPerAfternoon(dto.getPeriodsPerAfternoon());
        settings.setPeriodDurationMinutes(dto.getPeriodDurationMinutes());
        settings.setMorningStartTime(dto.getMorningStartTime());
        settings.setAfternoonStartTime(dto.getAfternoonStartTime());
        settings.setShortBreakMinutes(dto.getShortBreakMinutes());
        settings.setLongBreakMinutes(dto.getLongBreakMinutes());
        settings.setLongBreakAfterPeriod(dto.getLongBreakAfterPeriod());

        settings = settingsRepository.save(settings);
        return toDto(settings);
    }

    /**
     * Calculate schedule summary for preview.
     */
    public TimetableScheduleSummaryDto calculateScheduleSummary(School school) {
        SchoolTimetableSettings settings = getOrCreateSettingsEntity(school);
        return calculateScheduleSummary(settings);
    }

    /**
     * Calculate schedule summary from settings DTO (for preview before saving).
     */
    public TimetableScheduleSummaryDto calculateScheduleSummaryFromDto(TimetableSettingsDto dto) {
        // Create a temporary settings object for calculation
        SchoolTimetableSettings tempSettings = SchoolTimetableSettings.builder()
                .periodsPerMorning(dto.getPeriodsPerMorning())
                .periodsPerAfternoon(dto.getPeriodsPerAfternoon())
                .periodDurationMinutes(dto.getPeriodDurationMinutes())
                .morningStartTime(dto.getMorningStartTime())
                .afternoonStartTime(dto.getAfternoonStartTime())
                .shortBreakMinutes(dto.getShortBreakMinutes())
                .longBreakMinutes(dto.getLongBreakMinutes())
                .longBreakAfterPeriod(dto.getLongBreakAfterPeriod())
                .build();
        return calculateScheduleSummary(tempSettings);
    }

    /**
     * Calculate start and end time for a specific slot.
     */
    public SlotTimeDto calculateSlotTime(School school, int slotIndex) {
        SchoolTimetableSettings settings = getOrCreateSettingsEntity(school);
        return calculateSlotTimeInternal(settings, slotIndex);
    }

    /**
     * Get all slot times for display.
     */
    public List<SlotTimeDto> getAllSlotTimes(School school) {
        SchoolTimetableSettings settings = getOrCreateSettingsEntity(school);
        List<SlotTimeDto> slots = new ArrayList<>();

        int totalSlots = settings.getPeriodsPerMorning() + settings.getPeriodsPerAfternoon();
        for (int i = 1; i <= totalSlots; i++) {
            slots.add(calculateSlotTimeInternal(settings, i));
        }
        return slots;
    }

    // ========== Private Helper Methods ==========

    private SchoolTimetableSettings createDefaultSettings(School school) {
        return SchoolTimetableSettings.builder()
                .school(school)
                .periodsPerMorning(5)
                .periodsPerAfternoon(5)
                .periodDurationMinutes(45)
                .morningStartTime("07:00")
                .afternoonStartTime("13:00")
                .shortBreakMinutes(5)
                .longBreakMinutes(20)
                .longBreakAfterPeriod(2)
                .build();
    }

    private void validateSettings(TimetableSettingsDto dto) {
        // MoET regulations: max 7 periods per day (can be split between
        // morning/afternoon)
        int maxPeriodsPerSession = 5;
        int maxTotalPerDay = 7;

        if (dto.getPeriodsPerMorning() < 0 || dto.getPeriodsPerMorning() > maxPeriodsPerSession) {
            throw new IllegalArgumentException("Số tiết buổi sáng phải từ 0 đến " + maxPeriodsPerSession);
        }
        if (dto.getPeriodsPerAfternoon() < 0 || dto.getPeriodsPerAfternoon() > maxPeriodsPerSession) {
            throw new IllegalArgumentException("Số tiết buổi chiều phải từ 0 đến " + maxPeriodsPerSession);
        }
        if (dto.getPeriodsPerMorning() + dto.getPeriodsPerAfternoon() > maxTotalPerDay) {
            throw new IllegalArgumentException("Tổng số tiết mỗi ngày không được vượt quá " + maxTotalPerDay);
        }
        if (dto.getPeriodDurationMinutes() < 30 || dto.getPeriodDurationMinutes() > 60) {
            throw new IllegalArgumentException("Thời lượng mỗi tiết phải từ 30 đến 60 phút");
        }
        if (dto.getShortBreakMinutes() < 0 || dto.getShortBreakMinutes() > 15) {
            throw new IllegalArgumentException("Thời gian nghỉ ngắn phải từ 0 đến 15 phút");
        }
        if (dto.getLongBreakMinutes() < 10 || dto.getLongBreakMinutes() > 30) {
            throw new IllegalArgumentException("Thời gian ra chơi phải từ 10 đến 30 phút");
        }
    }

    private TimetableScheduleSummaryDto calculateScheduleSummary(SchoolTimetableSettings settings) {
        LocalTime morningStart = LocalTime.parse(settings.getMorningStartTime(), TIME_FORMATTER);
        LocalTime afternoonStart = LocalTime.parse(settings.getAfternoonStartTime(), TIME_FORMATTER);

        // Calculate morning slots
        List<SlotTimeDto> morningSlots = new ArrayList<>();
        LocalTime currentTime = morningStart;
        for (int i = 1; i <= settings.getPeriodsPerMorning(); i++) {
            LocalTime endTime = currentTime.plusMinutes(settings.getPeriodDurationMinutes());
            boolean isAfterLongBreak = (i == settings.getLongBreakAfterPeriod() + 1);

            morningSlots.add(SlotTimeDto.builder()
                    .slotIndex(i)
                    .startTime(currentTime.format(TIME_FORMATTER))
                    .endTime(endTime.format(TIME_FORMATTER))
                    .isAfterLongBreak(isAfterLongBreak)
                    .build());

            currentTime = endTime;
            // Add break
            if (i == settings.getLongBreakAfterPeriod() && i < settings.getPeriodsPerMorning()) {
                currentTime = currentTime.plusMinutes(settings.getLongBreakMinutes());
            } else if (i < settings.getPeriodsPerMorning()) {
                currentTime = currentTime.plusMinutes(settings.getShortBreakMinutes());
            }
        }

        LocalTime morningEnd = morningSlots.isEmpty() ? morningStart
                : LocalTime.parse(morningSlots.get(morningSlots.size() - 1).getEndTime(), TIME_FORMATTER);

        // Calculate afternoon slots
        List<SlotTimeDto> afternoonSlots = new ArrayList<>();
        currentTime = afternoonStart;
        int morningCount = settings.getPeriodsPerMorning();
        for (int i = 1; i <= settings.getPeriodsPerAfternoon(); i++) {
            LocalTime endTime = currentTime.plusMinutes(settings.getPeriodDurationMinutes());
            boolean isAfterLongBreak = (i == settings.getLongBreakAfterPeriod() + 1);

            afternoonSlots.add(SlotTimeDto.builder()
                    .slotIndex(morningCount + i)
                    .startTime(currentTime.format(TIME_FORMATTER))
                    .endTime(endTime.format(TIME_FORMATTER))
                    .isAfterLongBreak(isAfterLongBreak)
                    .build());

            currentTime = endTime;
            // Add break
            if (i == settings.getLongBreakAfterPeriod() && i < settings.getPeriodsPerAfternoon()) {
                currentTime = currentTime.plusMinutes(settings.getLongBreakMinutes());
            } else if (i < settings.getPeriodsPerAfternoon()) {
                currentTime = currentTime.plusMinutes(settings.getShortBreakMinutes());
            }
        }

        LocalTime afternoonEnd = afternoonSlots.isEmpty() ? afternoonStart
                : LocalTime.parse(afternoonSlots.get(afternoonSlots.size() - 1).getEndTime(), TIME_FORMATTER);

        // Calculate lunch break duration
        int lunchBreakMinutes = (int) java.time.Duration.between(morningEnd, afternoonStart).toMinutes();

        // Calculate total learning time
        int totalLearningMinutes = (settings.getPeriodsPerMorning() + settings.getPeriodsPerAfternoon())
                * settings.getPeriodDurationMinutes();

        // Arrival time (15 minutes before morning start)
        LocalTime arrivalTime = morningStart.minusMinutes(15);

        return TimetableScheduleSummaryDto.builder()
                .arrivalTime(arrivalTime.format(TIME_FORMATTER))
                .morningEndTime(morningEnd.format(TIME_FORMATTER))
                .afternoonEndTime(afternoonEnd.format(TIME_FORMATTER))
                .lunchBreakStart(morningEnd.format(TIME_FORMATTER))
                .lunchBreakEnd(afternoonStart.format(TIME_FORMATTER))
                .lunchBreakDurationMinutes(lunchBreakMinutes)
                .totalLearningMinutesPerDay(totalLearningMinutes)
                .morningSlots(morningSlots)
                .afternoonSlots(afternoonSlots)
                .build();
    }

    private SlotTimeDto calculateSlotTimeInternal(SchoolTimetableSettings settings, int slotIndex) {
        int morningCount = settings.getPeriodsPerMorning();
        boolean isMorning = slotIndex <= morningCount;

        LocalTime baseTime;
        int sessionSlot;

        if (isMorning) {
            baseTime = LocalTime.parse(settings.getMorningStartTime(), TIME_FORMATTER);
            sessionSlot = slotIndex;
        } else {
            baseTime = LocalTime.parse(settings.getAfternoonStartTime(), TIME_FORMATTER);
            sessionSlot = slotIndex - morningCount;
        }

        // Calculate start time by adding duration for previous slots plus breaks
        LocalTime startTime = baseTime;
        for (int i = 1; i < sessionSlot; i++) {
            startTime = startTime.plusMinutes(settings.getPeriodDurationMinutes());
            if (i == settings.getLongBreakAfterPeriod()) {
                startTime = startTime.plusMinutes(settings.getLongBreakMinutes());
            } else {
                startTime = startTime.plusMinutes(settings.getShortBreakMinutes());
            }
        }

        LocalTime endTime = startTime.plusMinutes(settings.getPeriodDurationMinutes());
        boolean isAfterLongBreak = (sessionSlot == settings.getLongBreakAfterPeriod() + 1);

        return SlotTimeDto.builder()
                .slotIndex(slotIndex)
                .startTime(startTime.format(TIME_FORMATTER))
                .endTime(endTime.format(TIME_FORMATTER))
                .isAfterLongBreak(isAfterLongBreak)
                .build();
    }

    private TimetableSettingsDto toDto(SchoolTimetableSettings settings) {
        return TimetableSettingsDto.builder()
                .periodsPerMorning(settings.getPeriodsPerMorning())
                .periodsPerAfternoon(settings.getPeriodsPerAfternoon())
                .periodDurationMinutes(settings.getPeriodDurationMinutes())
                .morningStartTime(settings.getMorningStartTime())
                .afternoonStartTime(settings.getAfternoonStartTime())
                .shortBreakMinutes(settings.getShortBreakMinutes())
                .longBreakMinutes(settings.getLongBreakMinutes())
                .longBreakAfterPeriod(settings.getLongBreakAfterPeriod())
                .build();
    }
}
