package com.schoolmanagement.backend.controller.face;

import com.schoolmanagement.backend.domain.entity.admin.School;

import com.schoolmanagement.backend.exception.ApiException;
import com.schoolmanagement.backend.security.UserPrincipal;
import com.schoolmanagement.backend.service.FacePhotoStorageService;
import com.schoolmanagement.backend.service.FacePhotoStorageService.*;
import com.schoolmanagement.backend.service.auth.UserLookupService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping("/api/school/face-photos")
@RequiredArgsConstructor
public class FacePhotoManagementController {

    private final FacePhotoStorageService facePhotoService;
    private final UserLookupService userLookup;

    private School requireSchool(UserPrincipal principal) {
        var admin = userLookup.requireById(principal.getId());
        if (admin.getSchool() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "School admin chưa được gán trường.");
        }
        return admin.getSchool();
    }

    @GetMapping("/overview")
    public ResponseEntity<FaceOverviewResponse> getOverview(
            @AuthenticationPrincipal UserPrincipal principal) {
        var school = requireSchool(principal);
        return ResponseEntity.ok(facePhotoService.getSchoolOverview(school));
    }

    @GetMapping("/classes/{classId}")
    public ResponseEntity<ClassFaceDetailResponse> getClassDetail(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID classId) {
        var school = requireSchool(principal);
        return ResponseEntity.ok(facePhotoService.getClassDetail(school, classId));
    }

    @GetMapping("/students/{studentId}")
    public ResponseEntity<StudentPhotosDto> getStudentPhotos(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID studentId) {
        var school = requireSchool(principal);
        return ResponseEntity.ok(facePhotoService.getStudentPhotos(school, studentId));
    }

    @PostMapping(value = "/students/{studentId}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<UploadFacePhotoResult> uploadPhoto(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID studentId,
            @RequestPart MultipartFile file) {
        var school = requireSchool(principal);
        return ResponseEntity.ok(facePhotoService.uploadFacePhoto(school, studentId, file));
    }

    @PostMapping(value = "/students/{studentId}/bulk", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<BulkUploadFaceResult> bulkUploadPhotos(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID studentId,
            @RequestPart List<MultipartFile> files) {
        var school = requireSchool(principal);
        return ResponseEntity.ok(facePhotoService.bulkUploadFacePhotos(school, studentId, files));
    }

    @DeleteMapping("/students/{studentId}/photos/{embeddingId}")
    @Transactional
    public ResponseEntity<Void> deletePhoto(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID studentId,
            @PathVariable int embeddingId) {
        var school = requireSchool(principal);
        facePhotoService.deleteFacePhoto(school, studentId, embeddingId);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/students/{studentId}/photos")
    @Transactional
    public ResponseEntity<Void> deleteAllPhotos(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable UUID studentId) {
        var school = requireSchool(principal);
        facePhotoService.deleteAllStudentPhotos(school, studentId);
        return ResponseEntity.ok().build();
    }
}
