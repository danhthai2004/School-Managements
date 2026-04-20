package com.schoolmanagement.backend.service.timetable;

import com.schoolmanagement.backend.domain.entity.timetable.Timetable;
import com.schoolmanagement.backend.domain.entity.timetable.TimetableDetail;
import com.schoolmanagement.backend.dto.timetable.MoveSlotRequest;
import com.schoolmanagement.backend.dto.timetable.SlotValidationResponse;
import com.schoolmanagement.backend.dto.timetable.SwapSlotRequest;
import com.schoolmanagement.backend.exception.ApiException;
import com.schoolmanagement.backend.repo.timetable.TimetableDetailRepository;
import com.schoolmanagement.backend.repo.timetable.TimetableRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Service xử lý tinh chỉnh thời khóa biểu bằng tay (Post-Auto-Scheduling).
 * Hỗ trợ 3 thao tác:
 * 1. Validate: Kiểm tra xung đột trước khi thực hiện.
 * 2. Move: Di chuyển 1 tiết học đến ô trống.
 * 3. Swap: Hoán đổi vị trí 2 tiết học.
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional(readOnly = true)
public class TimetableAdjustmentService {

    private final TimetableDetailRepository detailRepo;
    private final TimetableRepository timetableRepo;

    // ──────────────────────────────────────────────────────────
    // 1. VALIDATE MOVE — Kiểm tra di chuyển đến ô trống
    // ──────────────────────────────────────────────────────────

    /**
     * Kiểm tra xem có thể di chuyển tiết học đến vị trí mới hay không.
     * Trả về danh sách xung đột nếu có.
     */
    @Transactional(readOnly = true)
    public SlotValidationResponse validateMove(MoveSlotRequest request) {
        TimetableDetail detail = findDetailOrThrow(request.detailId());
        DayOfWeek targetDay = DayOfWeek.valueOf(request.targetDay());
        int targetSlot = request.targetSlot();

        List<String> conflicts = new ArrayList<>();

        // Rule 1: Tiết bị khóa (Fixed) không được di chuyển
        if (detail.isFixed()) {
            conflicts.add("Tiết học này đã được ghim cố định, không thể di chuyển.");
            return SlotValidationResponse.conflict(conflicts);
        }

        Timetable timetable = detail.getTimetable();

        // Rule 2: Ô đích đã có tiết học của lớp này chưa?
        boolean classOccupied = detailRepo
                .existsByTimetableAndClassRoomAndDayOfWeekAndSlotIndex(
                        timetable, detail.getClassRoom(), targetDay, targetSlot);
        if (classOccupied) {
            conflicts.add(String.format("Lớp %s đã có tiết học vào %s tiết %d.",
                    detail.getClassRoom().getName(), translateDay(targetDay), targetSlot));
        }

        // Rule 3: Giáo viên có bị trùng lịch ở lớp khác không?
        if (detail.getTeacher() != null) {
            boolean teacherOccupied = detailRepo
                    .existsByTimetableAndTeacherAndDayOfWeekAndSlotIndex(
                            timetable, detail.getTeacher(), targetDay, targetSlot);
            if (teacherOccupied) {
                conflicts.add(String.format("Giáo viên %s đã có tiết dạy vào %s tiết %d.",
                        detail.getTeacher().getFullName(), translateDay(targetDay), targetSlot));
            }
        }

        return conflicts.isEmpty()
                ? SlotValidationResponse.ok()
                : SlotValidationResponse.conflict(conflicts);
    }

    // ──────────────────────────────────────────────────────────
    // 2. VALIDATE SWAP — Kiểm tra hoán đổi 2 tiết
    // ──────────────────────────────────────────────────────────

    /**
     * Kiểm tra xem có thể hoán đổi 2 tiết học hay không.
     */
    @Transactional(readOnly = true)
    public SlotValidationResponse validateSwap(SwapSlotRequest request) {
        TimetableDetail source = findDetailOrThrow(request.sourceDetailId());
        TimetableDetail target = findDetailOrThrow(request.targetDetailId());

        List<String> conflicts = new ArrayList<>();

        // Rule 1: Không được swap tiết đã ghim
        if (source.isFixed()) {
            conflicts.add(String.format("Tiết %s (tiết %d, %s) đã bị ghim cố định.",
                    source.getSubject().getName(), source.getSlotIndex(), translateDay(source.getDayOfWeek())));
        }
        if (target.isFixed()) {
            conflicts.add(String.format("Tiết %s (tiết %d, %s) đã bị ghim cố định.",
                    target.getSubject().getName(), target.getSlotIndex(), translateDay(target.getDayOfWeek())));
        }
        if (!conflicts.isEmpty()) {
            return SlotValidationResponse.conflict(conflicts);
        }

        Timetable timetable = source.getTimetable();

        // Rule 2: Sau khi swap, giáo viên nguồn có trùng lịch ở vị trí đích không?
        if (source.getTeacher() != null) {
            // Tìm xem GV nguồn đã có tiết ở (target.day, target.slot) chưa (ngoại trừ chính
            // target)
            boolean teacherClash = hasTeacherClashExcluding(
                    timetable, source.getTeacher().getId(),
                    target.getDayOfWeek(), target.getSlotIndex(),
                    target.getId());
            if (teacherClash) {
                conflicts.add(String.format("Giáo viên %s đã có tiết dạy lớp khác vào %s tiết %d.",
                        source.getTeacher().getFullName(),
                        translateDay(target.getDayOfWeek()), target.getSlotIndex()));
            }
        }

        // Rule 3: Sau khi swap, giáo viên đích có trùng lịch ở vị trí nguồn không?
        if (target.getTeacher() != null) {
            boolean teacherClash = hasTeacherClashExcluding(
                    timetable, target.getTeacher().getId(),
                    source.getDayOfWeek(), source.getSlotIndex(),
                    source.getId());
            if (teacherClash) {
                conflicts.add(String.format("Giáo viên %s đã có tiết dạy lớp khác vào %s tiết %d.",
                        target.getTeacher().getFullName(),
                        translateDay(source.getDayOfWeek()), source.getSlotIndex()));
            }
        }

        return conflicts.isEmpty()
                ? SlotValidationResponse.ok()
                : SlotValidationResponse.conflict(conflicts);
    }

    // ──────────────────────────────────────────────────────────
    // 3. APPLY MOVE — Thực hiện di chuyển
    // ──────────────────────────────────────────────────────────

    @Transactional
    public void applyMove(MoveSlotRequest request) {
        // Validate trước khi thực hiện
        SlotValidationResponse validation = validateMove(request);
        if (!validation.valid()) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "Không thể di chuyển: " + String.join("; ", validation.conflicts()));
        }

        TimetableDetail detail = findDetailOrThrow(request.detailId());
        DayOfWeek targetDay = DayOfWeek.valueOf(request.targetDay());

        log.info("MOVE: {} ({}) from [{}, slot {}] → [{}, slot {}]",
                detail.getSubject().getName(), detail.getClassRoom().getName(),
                detail.getDayOfWeek(), detail.getSlotIndex(),
                targetDay, request.targetSlot());

        detail.setDayOfWeek(targetDay);
        detail.setSlotIndex(request.targetSlot());
        detailRepo.save(detail);
    }

    // ──────────────────────────────────────────────────────────
    // 4. APPLY SWAP — Thực hiện hoán đổi
    // ──────────────────────────────────────────────────────────

    @Transactional
    public void applySwap(SwapSlotRequest request) {
        // Validate trước
        SlotValidationResponse validation = validateSwap(request);
        if (!validation.valid()) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "Không thể hoán đổi: " + String.join("; ", validation.conflicts()));
        }

        TimetableDetail source = findDetailOrThrow(request.sourceDetailId());
        TimetableDetail target = findDetailOrThrow(request.targetDetailId());

        log.info("SWAP: {} [{}, slot {}] ⟷ {} [{}, slot {}]",
                source.getSubject().getName(), source.getDayOfWeek(), source.getSlotIndex(),
                target.getSubject().getName(), target.getDayOfWeek(), target.getSlotIndex());

        // Lưu tạm vị trí nguồn và đích
        DayOfWeek sourceDay = source.getDayOfWeek();
        int sourceSlot = source.getSlotIndex();
        DayOfWeek targetDay = target.getDayOfWeek();
        int targetSlot = target.getSlotIndex();

        // 1. Dời target tạm ra ngoài (slot -1) để tránh vi phạm Unique Constraint khi
        // cập nhật source
        target.setSlotIndex(-1);
        detailRepo.saveAndFlush(target);

        // 2. Đổi source → vị trí target
        source.setDayOfWeek(targetDay);
        source.setSlotIndex(targetSlot);
        detailRepo.saveAndFlush(source);

        // 3. Đổi target → vị trí source ban đầu
        target.setDayOfWeek(sourceDay);
        target.setSlotIndex(sourceSlot);
        detailRepo.saveAndFlush(target);
    }

    // ──────────────────────────────────────────────────────────
    // 5. TOGGLE LOCK — Ghim/Mở ghim tiết học
    // ──────────────────────────────────────────────────────────

    @Transactional
    public void toggleLock(UUID detailId) {
        TimetableDetail detail = findDetailOrThrow(detailId);
        detail.setFixed(!detail.isFixed());
        detailRepo.save(detail);
        log.info("LOCK TOGGLE: {} [{}, slot {}] → isFixed={}",
                detail.getSubject().getName(), detail.getDayOfWeek(),
                detail.getSlotIndex(), detail.isFixed());
    }

    // ──────────────────────────────────────────────────────────
    // HELPERS
    // ──────────────────────────────────────────────────────────

    private TimetableDetail findDetailOrThrow(UUID id) {
        return detailRepo.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND,
                        "Không tìm thấy tiết học với ID: " + id));
    }

    /**
     * Kiểm tra giáo viên có tiết dạy khác tại (day, slot), ngoại trừ 1 detail cụ
     * thể.
     * Dùng cho validation Swap: khi swap A↔B, cần loại trừ chính B khi check A.
     */
    private boolean hasTeacherClashExcluding(Timetable timetable, UUID teacherId,
            DayOfWeek day, int slot, UUID excludeDetailId) {
        List<TimetableDetail> allAtSlot = detailRepo
                .findAllByTimetableAndDayOfWeek(timetable, day);

        return allAtSlot.stream()
                .filter(d -> d.getSlotIndex() == slot)
                .filter(d -> !d.getId().equals(excludeDetailId))
                .filter(d -> d.getTeacher() != null)
                .anyMatch(d -> d.getTeacher().getId().equals(teacherId));
    }

    private String translateDay(DayOfWeek day) {
        return switch (day) {
            case MONDAY -> "Thứ Hai";
            case TUESDAY -> "Thứ Ba";
            case WEDNESDAY -> "Thứ Tư";
            case THURSDAY -> "Thứ Năm";
            case FRIDAY -> "Thứ Sáu";
            case SATURDAY -> "Thứ Bảy";
            case SUNDAY -> "Chủ Nhật";
        };
    }
}
