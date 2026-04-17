package com.schoolmanagement.backend.controller.face;

import com.schoolmanagement.backend.dto.teacher.FaceRecognizeResponse;
import com.schoolmanagement.backend.service.attendance.FaceAttendanceService;
import com.schoolmanagement.backend.service.attendance.FaceAttendanceService.ConfirmedStudent;

import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.List;

/**
 * REST controller for face recognition attendance endpoints (Teacher only).
 * Handles: batch recognition + confirm attendance.
 * Face registration is managed by School Admin via SchoolAdminController.
 */
@RestController
@RequestMapping("/api/teacher/attendance/face")
@PreAuthorize("hasRole('TEACHER')")
@RequiredArgsConstructor
public class FaceAttendanceController {

        private final FaceAttendanceService faceAttendanceService;

        /**
         * Batch recognize faces from 1-3 classroom photos.
         * Returns recognition results for teacher review (does NOT auto-save
         * attendance).
         */
        @PostMapping(value = "/recognize", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
        public ResponseEntity<FaceRecognizeResponse> recognizeBatch(
                        @AuthenticationPrincipal UserDetails userDetails,
                        @RequestPart List<MultipartFile> files,
                        @RequestParam String date,
                        @RequestParam int slotIndex) {

                FaceRecognizeResponse response = faceAttendanceService.recognizeBatch(
                                userDetails.getUsername(), files, LocalDate.parse(date), slotIndex);
                return ResponseEntity.ok(response);
        }

        /**
         * Confirm face attendance after teacher review.
         * Saves attendance records and recognition logs.
         */
        @PostMapping("/confirm")
        public ResponseEntity<Void> confirmFaceAttendance(
                        @AuthenticationPrincipal UserDetails userDetails,
                        @RequestBody ConfirmFaceAttendanceRequest request) {

                List<ConfirmedStudent> confirmed = request.students().stream()
                                .map(s -> new ConfirmedStudent(s.studentId(), s.status(), s.confidence()))
                                .toList();

                faceAttendanceService.confirmFaceAttendance(
                                userDetails.getUsername(),
                                LocalDate.parse(request.date()),
                                request.slotIndex(),
                                confirmed);

                return ResponseEntity.ok().build();
        }

        // ─── Request records ──────────────────────────────

        record ConfirmFaceAttendanceRequest(
                        String date,
                        int slotIndex,
                        List<ConfirmedStudentDto> students) {
        }

        record ConfirmedStudentDto(
                        String studentId,
                        String status,
                        double confidence) {
        }
}
