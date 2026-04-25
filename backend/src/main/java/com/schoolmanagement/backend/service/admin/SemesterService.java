package com.schoolmanagement.backend.service.admin;

import com.schoolmanagement.backend.domain.admin.AcademicYearStatus;
import com.schoolmanagement.backend.domain.admin.SemesterStatus;
import com.schoolmanagement.backend.domain.entity.admin.AcademicYear;
import com.schoolmanagement.backend.domain.entity.admin.School;
import com.schoolmanagement.backend.domain.entity.admin.Semester;
import com.schoolmanagement.backend.dto.admin.*;
import com.schoolmanagement.backend.exception.ApiException;
import com.schoolmanagement.backend.repo.admin.AcademicYearRepository;
import com.schoolmanagement.backend.repo.admin.SemesterRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class SemesterService {

    private final AcademicYearRepository academicYearRepository;
    private final SemesterRepository semesterRepository;
    private final com.schoolmanagement.backend.repo.classes.ClassRoomRepository classRoomRepository;
    private final com.schoolmanagement.backend.repo.classes.ClassEnrollmentRepository classEnrollmentRepository;
    private final com.schoolmanagement.backend.repo.exam.ExamSessionRepository examSessionRepository;
    private final com.schoolmanagement.backend.repo.attendance.AttendanceSessionRepository attendanceSessionRepository;

    // ==================== ACADEMIC YEAR ====================

    public List<AcademicYearDto> listAcademicYears(School school) {
        return academicYearRepository.findBySchoolOrderByStartDateDesc(school)
                .stream().map(this::toDto).toList();
    }

    /**
     * Tạo năm học mới và tự động tạo Học kỳ 1 + Học kỳ 2.
     * Ngày HK1: startDate → midpoint, HK2: midpoint+1 → endDate.
     */
    @Transactional
    public AcademicYearDto createAcademicYear(School school, CreateAcademicYearRequest req) {
        if (academicYearRepository.existsBySchoolAndName(school, req.getName())) {
            throw new ApiException(HttpStatus.CONFLICT, "Năm học '" + req.getName() + "' đã tồn tại.");
        }
        if (req.getEndDate().isBefore(req.getStartDate())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Ngày kết thúc phải sau ngày bắt đầu.");
        }
        AcademicYear academicYear = AcademicYear.builder()
                .name(req.getName())
                .startDate(req.getStartDate())
                .endDate(req.getEndDate())
                .status(AcademicYearStatus.UPCOMING)
                .school(school)
                .build();
        academicYear = academicYearRepository.save(academicYear);

        // Auto-create Học kỳ 1 + Học kỳ 2
        LocalDate midpoint = req.getStartDate().plusDays(
                java.time.temporal.ChronoUnit.DAYS.between(req.getStartDate(), req.getEndDate()) / 2);

        Semester hk1 = Semester.builder()
                .name("Học kỳ 1")
                .semesterNumber(1)
                .academicYear(academicYear)
                .school(school)
                .startDate(req.getStartDate())
                .endDate(midpoint)
                .status(SemesterStatus.UPCOMING)
                .build();
        semesterRepository.save(hk1);

        Semester hk2 = Semester.builder()
                .name("Học kỳ 2")
                .semesterNumber(2)
                .academicYear(academicYear)
                .school(school)
                .startDate(midpoint.plusDays(1))
                .endDate(req.getEndDate())
                .status(SemesterStatus.UPCOMING)
                .build();
        semesterRepository.save(hk2);

        log.info("Created academic year '{}' with HK1 ({} → {}) and HK2 ({} → {})",
                academicYear.getName(), hk1.getStartDate(), hk1.getEndDate(),
                hk2.getStartDate(), hk2.getEndDate());

        return toDto(academicYear);
    }

    @Transactional
    public AcademicYearDto updateAcademicYear(School school, UUID id, CreateAcademicYearRequest req) {
        AcademicYear academicYear = academicYearRepository.findById(id)
                .filter(a -> a.getSchool().getId().equals(school.getId()))
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Năm học không tồn tại."));

        // Chặn sửa năm học đã CLOSED
        if (academicYear.getStatus() == AcademicYearStatus.CLOSED) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Không thể chỉnh sửa năm học đã đóng.");
        }

        if (req.getEndDate().isBefore(req.getStartDate())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Ngày kết thúc phải sau ngày bắt đầu.");
        }

        // Check trùng tên khi đổi tên
        if (!academicYear.getName().equals(req.getName())
                && academicYearRepository.existsBySchoolAndName(school, req.getName())) {
            throw new ApiException(HttpStatus.CONFLICT, "Năm học '" + req.getName() + "' đã tồn tại.");
        }

        academicYear.setName(req.getName());
        academicYear.setStartDate(req.getStartDate());
        academicYear.setEndDate(req.getEndDate());
        return toDto(academicYearRepository.save(academicYear));
    }

    /**
     * Xóa năm học và tất cả học kỳ liên quan (cascade).
     * Chỉ cho phép xóa nếu không có dữ liệu điểm/thời khóa biểu.
     */
    @Transactional
    public void deleteAcademicYear(School school, UUID id) {
        AcademicYear academicYear = academicYearRepository.findById(id)
                .filter(a -> a.getSchool().getId().equals(school.getId()))
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Năm học không tồn tại."));

        // Chặn xóa năm học đang ACTIVE
        if (academicYear.getStatus() == AcademicYearStatus.ACTIVE) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "Không thể xóa năm học đang hoạt động. Hãy kích hoạt năm học khác trước.");
        }

        // Kiểm tra tất cả ràng buộc FK trực tiếp
        long classCount = classRoomRepository.countByAcademicYear(academicYear);
        long enrollmentCount = classEnrollmentRepository.countByAcademicYear(academicYear);
        long examCount = examSessionRepository.countByAcademicYear(academicYear);
        long attendanceCount = attendanceSessionRepository.countByAcademicYear(academicYear);

        // Kiểm tra ràng buộc qua Semester (grades + timetables)
        long gradeCount = 0;
        long timetableCount = 0;
        List<Semester> semesters = semesterRepository.findByAcademicYearOrderBySemesterNumber(academicYear);
        for (Semester semester : semesters) {
            gradeCount += semesterRepository.countGradesBySemester(semester);
            timetableCount += semesterRepository.countTimetablesBySemester(semester);
        }

        // Thu thập lỗi chi tiết
        StringBuilder errors = new StringBuilder();
        if (classCount > 0)
            errors.append(classCount).append(" lớp học, ");
        if (enrollmentCount > 0)
            errors.append(enrollmentCount).append(" hồ sơ nhập học, ");
        if (gradeCount > 0)
            errors.append(gradeCount).append(" bản ghi điểm, ");
        if (timetableCount > 0)
            errors.append(timetableCount).append(" thời khóa biểu, ");
        if (examCount > 0)
            errors.append(examCount).append(" kỳ thi, ");
        if (attendanceCount > 0)
            errors.append(attendanceCount).append(" buổi điểm danh, ");

        if (errors.length() > 0) {
            errors.setLength(errors.length() - 2); // Bỏ ", " cuối
            throw new ApiException(HttpStatus.CONFLICT,
                    "Không thể xóa năm học '" + academicYear.getName()
                            + "' vì đang có dữ liệu liên quan: " + errors + ".");
        }

        // Xóa semesters trước, rồi academic year
        semesterRepository.deleteAll(semesters);
        academicYearRepository.delete(academicYear);
        log.info("Deleted academic year '{}' and {} semesters", academicYear.getName(), semesters.size());
    }

    @Transactional
    public AcademicYearDto activateAcademicYear(School school, UUID id) {
        AcademicYear academicYear = academicYearRepository.findById(id)
                .filter(a -> a.getSchool().getId().equals(school.getId()))
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Năm học không tồn tại."));
        // Close other active years
        academicYearRepository.findBySchoolAndStatus(school, AcademicYearStatus.ACTIVE)
                .ifPresent(old -> {
                    old.setStatus(AcademicYearStatus.CLOSED);
                    academicYearRepository.save(old);
                    // Close all semesters of the old year
                    semesterRepository.findByAcademicYearOrderBySemesterNumber(old).forEach(sem -> {
                        if (sem.getStatus() == SemesterStatus.ACTIVE) {
                            sem.setStatus(SemesterStatus.CLOSED);
                            semesterRepository.save(sem);
                            log.info("Auto-closed semester '{}' of old year '{}'", sem.getName(), old.getName());
                        }
                    });
                });
        academicYear.setStatus(AcademicYearStatus.ACTIVE);
        academicYearRepository.save(academicYear);

        // Auto-activate HK1 of the new academic year
        List<Semester> semesters = semesterRepository.findByAcademicYearOrderBySemesterNumber(academicYear);
        if (!semesters.isEmpty()) {
            Semester hk1 = semesters.get(0); // semesterNumber=1
            if (hk1.getStatus() == SemesterStatus.UPCOMING) {
                // Close any other active semester in the school
                semesterRepository.findBySchoolAndStatus(school, SemesterStatus.ACTIVE)
                        .ifPresent(old -> {
                            old.setStatus(SemesterStatus.CLOSED);
                            semesterRepository.save(old);
                            log.info("Auto-closed semester '{}' when activating new year", old.getName());
                        });
                hk1.setStatus(SemesterStatus.ACTIVE);
                semesterRepository.save(hk1);
                log.info("Auto-activated HK1 '{}' for year '{}'", hk1.getName(), academicYear.getName());
            }
        }

        return toDto(academicYear);
    }

    // ==================== SEMESTER ====================

    public List<SemesterDto> listSemesters(School school) {
        return semesterRepository.findBySchoolOrderByStartDateDesc(school)
                .stream().map(this::toDto).toList();
    }

    public Semester getSemester(UUID id) {
        return semesterRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Học kỳ không tồn tại."));
    }

    public AcademicYear getActiveAcademicYear(School school) {
        return academicYearRepository.findBySchoolAndStatus(school, AcademicYearStatus.ACTIVE)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Năm học hiện tại không tìm thấy."));
    }

    /**
     * Safe version of getActiveAcademicYear for read-only scenarios (like DTO
     * mapping).
     * Returns null instead of throwing exception if no active year exists.
     */
    public AcademicYear getActiveAcademicYearSafe(School school) {
        return academicYearRepository.findBySchoolAndStatus(school, AcademicYearStatus.ACTIVE)
                .orElse(null);
    }

    public AcademicYear getActiveAcademicYearSafe(UUID schoolId) {
        return academicYearRepository.findBySchoolIdAndStatus(schoolId, AcademicYearStatus.ACTIVE)
                .orElse(null);
    }

    public AcademicYear getAcademicYearByName(School school, String name) {
        return academicYearRepository.findBySchoolAndName(school, name)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Năm học không tồn tại: " + name));
    }

    public List<SemesterDto> listSemestersByAcademicYear(UUID academicYearId) {
        AcademicYear academicYear = academicYearRepository.findById(academicYearId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Năm học không tồn tại."));
        return semesterRepository.findByAcademicYearOrderBySemesterNumber(academicYear)
                .stream().map(this::toDto).toList();
    }

    /**
     * Cập nhật thông tin học kỳ (tên, ngày bắt đầu/kết thúc, deadline điểm).
     * Không cho phép thay đổi semesterNumber hay academicYear.
     */
    @Transactional
    public SemesterDto updateSemester(School school, UUID id, UpdateSemesterRequest req) {
        Semester semester = semesterRepository.findById(id)
                .filter(s -> s.getSchool().getId().equals(school.getId()))
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Học kỳ không tồn tại."));

        // Chặn sửa học kỳ đã CLOSED
        if (semester.getStatus() == SemesterStatus.CLOSED) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "Không thể chỉnh sửa học kỳ đã đóng ('" + semester.getName() + "').");
        }

        if (req.getEndDate().isBefore(req.getStartDate())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Ngày kết thúc phải sau ngày bắt đầu.");
        }

        // Validate ngày nằm trong range năm học cha
        AcademicYear parentYear = semester.getAcademicYear();
        if (req.getStartDate().isBefore(parentYear.getStartDate())) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "Ngày bắt đầu học kỳ không thể trước ngày bắt đầu năm học ("
                            + parentYear.getStartDate() + ").");
        }
        if (req.getEndDate().isAfter(parentYear.getEndDate())) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "Ngày kết thúc học kỳ không thể sau ngày kết thúc năm học ("
                            + parentYear.getEndDate() + ").");
        }

        semester.setName(req.getName());
        semester.setStartDate(req.getStartDate());
        semester.setEndDate(req.getEndDate());
        semester.setGradeDeadline(req.getGradeDeadline());
        return toDto(semesterRepository.save(semester));
    }

    /**
     * Kích hoạt học kỳ: tự động đóng các học kỳ ACTIVE cũ trong cùng trường.
     */
    @Transactional
    public SemesterDto activateSemester(School school, UUID id) {
        Semester semester = semesterRepository.findById(id)
                .filter(s -> s.getSchool().getId().equals(school.getId()))
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Học kỳ không tồn tại."));

        // Enforce HK1 before HK2: cannot activate HK2 if HK1 is still UPCOMING
        if (semester.getSemesterNumber() == 2) {
            List<Semester> siblings = semesterRepository
                    .findByAcademicYearOrderBySemesterNumber(semester.getAcademicYear());
            Semester hk1 = siblings.stream()
                    .filter(s -> s.getSemesterNumber() == 1)
                    .findFirst().orElse(null);
            if (hk1 != null && hk1.getStatus() == SemesterStatus.UPCOMING) {
                throw new ApiException(HttpStatus.BAD_REQUEST,
                        "Phải kích hoạt Học kỳ 1 trước khi kích hoạt Học kỳ 2.");
            }
        }

        // Ensure the parent academic year is ACTIVE
        AcademicYear parentYear = semester.getAcademicYear();
        if (parentYear.getStatus() != AcademicYearStatus.ACTIVE) {
            parentYear.setStatus(AcademicYearStatus.ACTIVE);
            academicYearRepository.save(parentYear);
            log.info("Auto-activated academic year '{}'", parentYear.getName());
        }

        // Close other active semesters in the same school
        semesterRepository.findBySchoolAndStatus(school, SemesterStatus.ACTIVE)
                .ifPresent(old -> {
                    old.setStatus(SemesterStatus.CLOSED);
                    semesterRepository.save(old);
                    log.info("Auto-closed semester: {} ({})", old.getName(),
                            old.getAcademicYear().getName());
                });
        semester.setStatus(SemesterStatus.ACTIVE);
        log.info("Activated semester: {} ({})", semester.getName(),
                semester.getAcademicYear().getName());
        return toDto(semesterRepository.save(semester));
    }

    /**
     * Logic chốt sổ: kiểm tra điều kiện trước khi đóng học kỳ.
     */
    @Transactional
    public SemesterDto closeSemester(School school, UUID id) {
        Semester semester = semesterRepository.findById(id)
                .filter(s -> s.getSchool().getId().equals(school.getId()))
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Học kỳ không tồn tại."));
        if (semester.getStatus() != SemesterStatus.ACTIVE) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "Chỉ có thể đóng học kỳ đang Active.");
        }
        semester.setStatus(SemesterStatus.CLOSED);
        log.info("Closed semester: {} ({})", semester.getName(),
                semester.getAcademicYear().getName());
        return toDto(semesterRepository.save(semester));
    }

    /**
     * Lấy học kỳ hiện tại dựa trên thời gian thực.
     */
    public SemesterDto getCurrentSemester(School school) {
        LocalDate today = LocalDate.now();
        return semesterRepository.findCurrentBySchoolAndDate(school, today).stream().findFirst()
                .map(this::toDto)
                .orElseGet(() ->
                // Fallback: lấy học kỳ ACTIVE
                semesterRepository.findBySchoolAndStatus(school, SemesterStatus.ACTIVE)
                        .map(this::toDto)
                        .orElse(null));
    }

    /**
     * Lấy Semester entity cho status → date-based match → null.
     * Other services should use this instead of hardcoded getCurrentAcademicYear().
     */
    public Semester getActiveSemesterEntity(School school) {
        return semesterRepository.findBySchoolAndStatus(school, SemesterStatus.ACTIVE)
                .orElseGet(() -> {
                    LocalDate today = LocalDate.now();
                    return semesterRepository.findCurrentBySchoolAndDate(school, today).stream().findFirst()
                            .orElse(null);
                });
    }

    /**
     * Safe version of getActiveSemesterEntity that returns null instead of throwing
     * exception.
     * Useful for mapping DTOs where we don't want to kill the whole list if setup
     * is incomplete.
     */
    public Semester getActiveSemesterEntitySafe(School school) {
        try {
            return getActiveSemesterEntity(school);
        } catch (Exception e) {
            return null;
        }
    }

    /**
     * Alias cho getActiveSemesterEntity — dùng bởi StudentPortalService.
     */
    public Semester getActiveSemester(School school) {
        return getActiveSemesterEntity(school);
    }

    /**
     * Tìm học kỳ theo số (1 hoặc 2) trong năm học đang ACTIVE.
     * Dùng bởi ReportService để query theo semester number.
     */
    public Semester findActiveSemesterByNumber(School school, int semesterNumber) {
        AcademicYear activeYear = getActiveAcademicYear(school);
        return getSemesterByNumber(school, activeYear, semesterNumber);
    }

    /**
     * Tìm học kỳ theo số (1 hoặc 2) trong một năm học cụ thể.
     */
    public Semester getSemesterByNumber(School school, AcademicYear academicYear, int semesterNumber) {
        return semesterRepository.findByAcademicYearOrderBySemesterNumber(academicYear).stream()
                .filter(s -> s.getSemesterNumber() == semesterNumber)
                .findFirst()
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND,
                        "Không tìm thấy Học kỳ " + semesterNumber + " trong năm học " + academicYear.getName()));
    }

    /**
     * Get the academic year name from the active semester, with fallback.
     */
    public String getActiveAcademicYearName(School school) {
        return getActiveAcademicYear(school).getName();
    }

    /**
     * Tìm năm học tương ứng với một ngày cụ thể. Fallback về Active nếu không tìm
     * thấy.
     */
    public AcademicYear getAcademicYearByDate(School school, LocalDate date) {
        return academicYearRepository.findCurrentBySchoolAndDate(school, date).stream().findFirst()
                .orElseGet(() -> getActiveAcademicYear(school));
    }

    /**
     * Tìm học kỳ tương ứng với một ngày cụ thể (có thể null nếu ngày nằm ngoài học
     * kỳ).
     */
    public Semester getSemesterByDate(School school, LocalDate date) {
        return semesterRepository.findCurrentBySchoolAndDate(school, date).stream().findFirst().orElse(null);
    }

    /**
     * Get the active semester number (1 or 2), with fallback.
     */
    public int getActiveSemesterNumber(School school) {
        Semester active = getActiveSemesterEntitySafe(school);
        if (active != null) {
            return active.getSemesterNumber();
        }
        // Fallback: compute from current month
        int month = LocalDate.now().getMonthValue();
        return (month >= 9 || month <= 1) ? 1 : 2;
    }

    // ==================== MAPPERS ====================

    private AcademicYearDto toDto(AcademicYear academicYear) {
        return AcademicYearDto.builder()
                .id(academicYear.getId())
                .name(academicYear.getName())
                .startDate(academicYear.getStartDate())
                .endDate(academicYear.getEndDate())
                .status(academicYear.getStatus().name())
                .build();
    }

    private SemesterDto toDto(Semester semester) {
        return SemesterDto.builder()
                .id(semester.getId())
                .name(semester.getName())
                .semesterNumber(semester.getSemesterNumber())
                .academicYearId(semester.getAcademicYear().getId())
                .academicYearName(semester.getAcademicYear().getName())
                .startDate(semester.getStartDate())
                .endDate(semester.getEndDate())
                .gradeDeadline(semester.getGradeDeadline())
                .status(semester.getStatus().name())
                .build();
    }
}
