package com.schoolmanagement.backend.service.student;
import com.schoolmanagement.backend.dto.student.StudentProfileDto;

import com.schoolmanagement.backend.domain.auth.Role;

import com.schoolmanagement.backend.service.common.FileStorageService;
import com.schoolmanagement.backend.service.admin.BulkDeleteHelperService;

import com.schoolmanagement.backend.domain.classes.ClassRoomStatus;
import com.schoolmanagement.backend.domain.student.StudentStatus;
import com.schoolmanagement.backend.domain.entity.classes.ClassEnrollment;
import com.schoolmanagement.backend.domain.entity.classes.ClassRoom;
import com.schoolmanagement.backend.domain.entity.student.Guardian;
import com.schoolmanagement.backend.domain.entity.admin.School;
import com.schoolmanagement.backend.domain.entity.student.Student;
import com.schoolmanagement.backend.domain.entity.auth.User;
import com.schoolmanagement.backend.dto.admin.BulkPromoteResponse;
import com.schoolmanagement.backend.dto.student.StudentDto;
import com.schoolmanagement.backend.dto.student.StudentGuardianDto;
import com.schoolmanagement.backend.dto.admin.BulkPromoteRequest;
import com.schoolmanagement.backend.dto.student.CreateStudentRequest;
import com.schoolmanagement.backend.dto.student.UpdateStudentRequest;
import com.schoolmanagement.backend.exception.ApiException;
import com.schoolmanagement.backend.repo.classes.ClassEnrollmentRepository;
import com.schoolmanagement.backend.repo.classes.ClassRoomRepository;
import com.schoolmanagement.backend.repo.student.GuardianRepository;
import com.schoolmanagement.backend.repo.student.StudentRepository;
import com.schoolmanagement.backend.domain.entity.admin.AcademicYear;
import com.schoolmanagement.backend.service.admin.SemesterService;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import jakarta.persistence.criteria.*;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;

@Slf4j
@Service
public class StudentManagementService {

    private final StudentRepository students;
    private final GuardianRepository guardians;
    private final ClassRoomRepository classRooms;
    private final ClassEnrollmentRepository enrollments;
    private final StudentAccountService studentAccountService;
    private final com.schoolmanagement.backend.repo.auth.UserRepository users;
    private final SemesterService semesterService;

    @org.springframework.beans.factory.annotation.Autowired
    private FileStorageService fileStorageService;

    @org.springframework.beans.factory.annotation.Autowired
    private BulkDeleteHelperService bulkDeleteHelper;

    public StudentManagementService(StudentRepository students, GuardianRepository guardians,
            ClassRoomRepository classRooms, ClassEnrollmentRepository enrollments,
            StudentAccountService studentAccountService,
            com.schoolmanagement.backend.repo.auth.UserRepository users,
            SemesterService semesterService) {
        this.students = students;
        this.guardians = guardians;
        this.classRooms = classRooms;
        this.enrollments = enrollments;
        this.studentAccountService = studentAccountService;
        this.users = users;
        this.semesterService = semesterService;
    }

    // ==================== STUDENT MANAGEMENT ====================

    @Transactional
    public StudentDto createStudent(School school, CreateStudentRequest req) {
        // Auto-generate student code if not provided
        String studentCode = req.studentCode();
        if (studentCode == null || studentCode.isBlank()) {
            studentCode = generateNextStudentCode(school);
        }

        // Check duplicate student code
        if (students.existsBySchoolAndStudentCode(school, studentCode)) {
            throw new ApiException(HttpStatus.CONFLICT, "Mã học sinh đã tồn tại: " + studentCode);
        }

        // Validate date of birth must be in the past
        if (req.dateOfBirth() != null && !req.dateOfBirth().isBefore(java.time.LocalDate.now())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Ngày sinh phải nhỏ hơn ngày hiện tại");
        }

        // Validate Email
        String email = req.email() != null ? req.email().trim().toLowerCase() : null;
        if (email != null && !email.isBlank()) {
            // Check collision with Guardian
            if (!guardians.findByEmailIgnoreCase(email).isEmpty()) {
                throw new ApiException(HttpStatus.CONFLICT, "Email học sinh trùng với email của một Phụ huynh.");
            }
            // Check collision with User (Role != STUDENT)
            Optional<User> userOptional = users.findByEmailIgnoreCase(email);
            if (userOptional.isPresent() && userOptional.get().getRole() != Role.STUDENT) {
                throw new ApiException(HttpStatus.CONFLICT, "Email đã được sử dụng bởi tài khoản " + userOptional.get().getRole());
            }
        }

        // Create student
        Student student = Student.builder()
                .studentCode(studentCode)
                .fullName(req.fullName())
                .dateOfBirth(req.dateOfBirth())
                .gender(req.gender())
                .birthPlace(req.birthPlace())
                .address(req.address())
                .email(req.email() != null ? req.email().trim().toLowerCase() : null)
                .phone(req.phone())
                .enrollmentDate(req.enrollmentDate() != null ? req.enrollmentDate() : java.time.LocalDate.now())
                .status(StudentStatus.ACTIVE)
                .school(school)
                .build();

        // Process Guardian
        if (req.guardian() != null) {
            CreateStudentRequest.GuardianRequest guardianRequest = req.guardian();
            if (guardianRequest.fullName() != null && !guardianRequest.fullName().isBlank()) {
                Guardian guardian = null;

                // 1. Find or Create Guardian
                if (guardianRequest.email() != null && !guardianRequest.email().isBlank()) {
                    String cleanEmail = guardianRequest.email().trim().toLowerCase();

                    // Validate Guardian Email vs Student
                    if (students.existsByEmail(cleanEmail)) {
                        throw new ApiException(HttpStatus.CONFLICT,
                                "Email phụ huynh trùng với email của một Học sinh.");
                    }
                    if (email != null && email.equals(cleanEmail)) {
                        throw new ApiException(HttpStatus.CONFLICT,
                                "Email học sinh và phụ huynh không được trùng nhau.");
                    }
                    Optional<User> userOptional = users.findByEmailIgnoreCase(cleanEmail);
                    if (userOptional.isPresent() && userOptional.get().getRole() != Role.GUARDIAN) {
                        throw new ApiException(HttpStatus.CONFLICT,
                                "Email phụ huynh đã được sử dụng bởi tài khoản " + userOptional.get().getRole());
                    }

                    List<Guardian> existing = guardians.findByEmailIgnoreCase(cleanEmail);
                    if (!existing.isEmpty()) {
                        guardian = existing.get(0);
                        // Update relationship if provided
                        if (guardianRequest.relationship() != null && !guardianRequest.relationship().isBlank()) {
                            guardian.setRelationship(guardianRequest.relationship().trim());
                        }
                    } else {

                        guardian = Guardian.builder()
                                .fullName(guardianRequest.fullName().trim())
                                .phone(guardianRequest.phone() != null ? guardianRequest.phone().trim() : null)
                                .email(cleanEmail)
                                .relationship(guardianRequest.relationship() != null ? guardianRequest.relationship().trim() : null)
                                .build();
                        guardian = guardians.save(guardian);
                    }
                } else {
                    // No email -> Force create with NULL email
                    guardian = Guardian.builder()
                            .fullName(guardianRequest.fullName() != null ? guardianRequest.fullName().trim() : "Người giám hộ")
                            .phone(guardianRequest.phone() != null ? guardianRequest.phone().trim() : null)
                            .email(null)
                            .relationship(guardianRequest.relationship() != null ? guardianRequest.relationship().trim() : null)
                            .build();
                    guardian = guardians.save(guardian);
                }
                student.setGuardian(guardian);
            }
        }

        student = students.save(student);

        // Enroll in class if provided
        if (req.classId() != null) {
            ClassRoom classRoom = classRooms.findById(req.classId())
                    .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy lớp học"));

            if (!classRoom.getSchool().getId().equals(school.getId())) {
                throw new ApiException(HttpStatus.FORBIDDEN, "Lớp học không thuộc trường này");
            }

            // Check class is active
            if (classRoom.getStatus() != ClassRoomStatus.ACTIVE) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Không thể thêm học sinh vào lớp không hoạt động");
            }

            // Check class capacity
            long currentEnrollment = enrollments.countByClassRoom(classRoom);
            if (currentEnrollment >= classRoom.getMaxCapacity()) {
                throw new ApiException(HttpStatus.BAD_REQUEST,
                        "Lớp đã đủ sĩ số (" + classRoom.getMaxCapacity() + " học sinh)");
            }

            // Check combination match if provided
            if (req.combinationId() != null && classRoom.getCombination() != null) {
                if (!classRoom.getCombination().getId().equals(req.combinationId())) {
                    throw new ApiException(HttpStatus.BAD_REQUEST,
                            "Tổ hợp môn của lớp học không khớp với tổ hợp mong muốn của học sinh.");
                }
            }

            AcademicYear academicYear = req.academicYear() != null 
                    ? semesterService.getAcademicYearByName(school, req.academicYear())
                    : classRoom.getAcademicYear();

            ClassEnrollment enrollment = ClassEnrollment.builder()
                    .student(student)
                    .classRoom(classRoom)
                    .academicYear(academicYear)
                    .enrolledAt(Instant.now())
                    .build();
            enrollments.save(enrollment);
        } else if (req.combinationId() != null && req.grade() != null) {
            // Auto-assign to class based on combination
            AcademicYear academicYear = req.academicYear() != null 
                ? semesterService.getAcademicYearByName(school, req.academicYear())
                : semesterService.getActiveAcademicYear(school);

            if (academicYear != null) {
                autoAssignStudentToClass(school, student, req.combinationId(), academicYear, req.grade());
            }
        }

        return toStudentDto(student);
    }

    @Transactional(readOnly = true)
    public com.schoolmanagement.backend.dto.student.StudentPageResponse listStudents(
            School school, UUID classId, int page, int size,
            String search, Integer grade, String status,
            String sortBy, String sortDir, boolean unassigned) {

        AcademicYear currentYear = semesterService.getActiveAcademicYearSafe(school.getId());
        Sort.Direction direction = "desc".equalsIgnoreCase(sortDir) ? Sort.Direction.DESC : Sort.Direction.ASC;

        // Map FE sort keys to DB field names
        // currentClassName is a computed JOIN field — sort in-memory after resolving enrollment
        boolean sortByClassName = "currentClassName".equals(sortBy);
        String sortField = sortByClassName ? "fullName" : sortBy;

        Pageable pageable = PageRequest.of(page, size, Sort.by(direction, sortField));

        Specification<Student> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();
            predicates.add(cb.equal(root.get("school").get("id"), school.getId()));

            if (search != null && !search.isBlank()) {
                String pattern = "%" + search.toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("fullName")), pattern),
                        cb.like(cb.lower(root.get("studentCode")), pattern)));
            }

            if (status != null && !status.isBlank()) {
                try {
                    predicates.add(cb.equal(root.get("status"), StudentStatus.valueOf(status)));
                } catch (Exception ignored) {
                }
            }

            // Grade and ClassId filters require join with ClassEnrollment for currentYear
            if (classId != null || grade != null) {
                // We use a subquery to find students with an active enrollment matching these
                // criteria
                Subquery<UUID> subquery = query.subquery(UUID.class);
                Root<ClassEnrollment> enrollmentRoot = subquery.from(ClassEnrollment.class);
                subquery.select(enrollmentRoot.get("student").get("id"));

                List<Predicate> subPredicates = new ArrayList<>();
                subPredicates.add(cb.equal(enrollmentRoot.get("academicYear"), currentYear));

                if (classId != null) {
                    subPredicates.add(cb.equal(enrollmentRoot.get("classRoom").get("id"), classId));
                }
                if (grade != null) {
                    subPredicates.add(cb.equal(enrollmentRoot.get("classRoom").get("grade"), grade));
                }

                subquery.where(subPredicates.toArray(new Predicate[0]));
                predicates.add(root.get("id").in(subquery));
            }

            // "Chưa phân lớp": students with no enrollment in current academic year
            if (unassigned && currentYear != null) {
                Subquery<UUID> sub = query.subquery(UUID.class);
                Root<ClassEnrollment> ce = sub.from(ClassEnrollment.class);
                sub.select(ce.get("student").get("id"));
                sub.where(cb.equal(ce.get("academicYear"), currentYear));
                predicates.add(cb.not(root.get("id").in(sub)));
            }

            return cb.and(predicates.toArray(new Predicate[0]));
        };

        Page<Student> studentPage = students.findAll(spec, pageable);

        // 2. Batch-fetch enrollments ONLY for current page (fixes N+1)
        Map<UUID, ClassEnrollment> enrollmentMap = new HashMap<>();
        if (currentYear != null && !studentPage.isEmpty()) {
            List<ClassEnrollment> pageEnrollments = enrollments.findAllByStudentInAndAcademicYear(
                    studentPage.getContent(), currentYear);
            for (ClassEnrollment e : pageEnrollments) {
                enrollmentMap.putIfAbsent(e.getStudent().getId(), e);
            }
        }

        List<StudentDto> content = studentPage.getContent().stream()
                .map(s -> toStudentDtoFast(s, enrollmentMap.get(s.getId())))
                .collect(Collectors.toList());

        // Sort in-memory by class name (natural numeric order: 10A1 < 10A2 < 11A1)
        if (sortByClassName) {
            Comparator<StudentDto> classNameComparator = Comparator.comparing(
                    s -> s.currentClassName() != null ? s.currentClassName() : "",
                    Comparator.comparingInt((String name) -> {
                        try { return Integer.parseInt(name.replaceAll("\\D.*", "")); } catch (Exception e) { return 999; }
                    }).thenComparing(Comparator.naturalOrder())
            );
            if (direction == Sort.Direction.DESC) classNameComparator = classNameComparator.reversed();
            content.sort(classNameComparator);
        }

        return new com.schoolmanagement.backend.dto.student.StudentPageResponse(
                content,
                studentPage.getNumber(),
                studentPage.getSize(),
                studentPage.getTotalElements(),
                studentPage.getTotalPages());
    }

    @Transactional(readOnly = true)
    public StudentDto getStudent(School school, UUID studentId) {
        Student student = students.findById(studentId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy học sinh"));

        if (!student.getSchool().getId().equals(school.getId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Học sinh không thuộc trường này");
        }

        return toStudentDto(student);
    }

    @Transactional(readOnly = true)
    public Student getSingleStudent(UUID studentId) {
        Student student = students.findById(studentId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy học sinh"));

        return student;
    }

    // Find student with Guardian ID
    @Transactional(readOnly = true)
    public StudentDto getStudentWithGuardian(String guardianEmail) {
        List<Guardian> guardianList = guardians.findByEmailIgnoreCase(guardianEmail);
        if (guardianList.isEmpty()) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy phụ huynh");
        }
        Guardian guardian = guardianList.get(0);
        if (guardian.getStudents() == null || guardian.getStudents().isEmpty()) {
            throw new ApiException(HttpStatus.NOT_FOUND, "Phụ huynh chưa có học sinh nào");
        }
        // For backwards compatibility with the portal, returning the first student
        return toStudentDto(guardian.getStudents().iterator().next());
    }

    @Transactional
    public String uploadAvatar(School school, UUID studentId, org.springframework.web.multipart.MultipartFile file) {
        Student student = students.findById(studentId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy học sinh"));

        if (!student.getSchool().getId().equals(school.getId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Học sinh không thuộc trường này");
        }

        try {
            // "avatars" is the folder name in Cloudinary
            String url = fileStorageService.uploadFile(file, "avatars");
            student.setAvatarUrl(url);
            students.save(student);
            return url;
        } catch (java.io.IOException e) {
            log.error("Error uploading avatar for student {}", studentId, e);
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Lỗi khi upload ảnh đại diện: " + e.getMessage());
        }
    }

    /**
     * Delete multiple students in a single high-performance batch operation.
     */
    public com.schoolmanagement.backend.dto.admin.BulkDeleteResponse deleteStudents(School school,
            com.schoolmanagement.backend.dto.admin.BulkDeleteRequest request) {
        log.info("Processing bulk delete for {} students using batch optimization", request.ids().size());
        return bulkDeleteHelper.deleteBatchStudents(school, request.ids());
    }

    @Transactional
    public StudentDto updateStudent(School school, UUID studentId, UpdateStudentRequest req) {
        Student student = students.findById(studentId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy học sinh"));

        if (!student.getSchool().getId().equals(school.getId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Học sinh không thuộc trường này");
        }

        // Validate date of birth must be in the past
        if (req.dateOfBirth() != null && !req.dateOfBirth().isBefore(java.time.LocalDate.now())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Ngày sinh phải nhỏ hơn ngày hiện tại");
        }

        // Update basic info
        student.setFullName(req.fullName());
        student.setDateOfBirth(req.dateOfBirth());
        student.setGender(req.gender());
        student.setBirthPlace(req.birthPlace());
        student.setAddress(req.address());
        student.setAddress(req.address());

        // Validate Email Update
        String newEmail = req.email() != null ? req.email().trim().toLowerCase() : null;
        if (newEmail != null && !newEmail.isBlank()) {
            // Only check if email changed
            if (!newEmail.equals(student.getEmail())) {
                // Check collision with Guardian
                if (!guardians.findByEmailIgnoreCase(newEmail).isEmpty()) {
                    throw new ApiException(HttpStatus.CONFLICT, "Email học sinh trùng với email của một Phụ huynh.");
                }
                // Check collision with User (Role != STUDENT)
                Optional<User> userOptional = users.findByEmailIgnoreCase(newEmail);
                if (userOptional.isPresent() && userOptional.get().getRole() != Role.STUDENT) {
                    throw new ApiException(HttpStatus.CONFLICT,
                            "Email đã được sử dụng bởi tài khoản " + userOptional.get().getRole());
                }
                // Check duplicate student email (other students) - handled by DB constraint
                // usually, but service check is safer
                if (students.existsByEmail(newEmail)) { // This might return true for self if not careful, but
                                                        // existsByEmail matches ANY.
                    // Need exclude self. Repository doesn't have it standard.
                    // Let DB constraint handle same-table duplicate for now or fetch.
                    // students.findByEmail(newEmail) -> if present and id != studentId -> Conflict.
                }
                student.setEmail(newEmail);
            }
        } else {
            student.setEmail(null);
        }

        student.setPhone(req.phone());

        // Update status if provided
        if (req.status() != null) {
            student.setStatus(req.status());
        }

        // Update guardian
        if (req.guardian() != null) {
            UpdateStudentRequest.GuardianRequest guardianRequest = req.guardian();
            if (guardianRequest.fullName() != null && !guardianRequest.fullName().isBlank()) {
                Guardian guardian = null;

                // 1. Find or Create Guardian
                if (guardianRequest.email() != null && !guardianRequest.email().isBlank()) {
                    String cleanEmail = guardianRequest.email().trim().toLowerCase();

                    // Validate Guardian Email vs Student
                    if (students.existsByEmail(cleanEmail)) {
                        throw new ApiException(HttpStatus.CONFLICT,
                                "Email phụ huynh trùng với email của một Học sinh.");
                    }
                    if (student.getEmail() != null && student.getEmail().equals(cleanEmail)) {
                        throw new ApiException(HttpStatus.CONFLICT,
                                "Email học sinh và phụ huynh không được trùng nhau.");
                    }
                    Optional<User> userOptional = users.findByEmailIgnoreCase(cleanEmail);
                    if (userOptional.isPresent() && userOptional.get().getRole() != Role.GUARDIAN) {
                        throw new ApiException(HttpStatus.CONFLICT,
                                "Email phụ huynh đã được sử dụng bởi tài khoản " + userOptional.get().getRole());
                    }

                    List<Guardian> existing = guardians.findByEmailIgnoreCase(cleanEmail);
                    if (!existing.isEmpty()) {
                        guardian = existing.get(0);
                        // Update existing guardian details
                        guardian.setFullName(guardianRequest.fullName().trim());
                        if (guardianRequest.phone() != null)
                            guardian.setPhone(guardianRequest.phone().trim());
                        if (guardianRequest.relationship() != null && !guardianRequest.relationship().isBlank())
                            guardian.setRelationship(guardianRequest.relationship().trim());
                        guardian = guardians.save(guardian);
                    } else {
                        guardian = Guardian.builder()
                                .fullName(guardianRequest.fullName().trim())
                                .phone(guardianRequest.phone() != null ? guardianRequest.phone().trim() : null)
                                .email(cleanEmail)
                                .relationship(guardianRequest.relationship() != null ? guardianRequest.relationship().trim() : null)
                                .build();
                        guardian = guardians.save(guardian);
                    }
                } else {
                    // No email -> Force create with NULL email
                    guardian = Guardian.builder()
                            .fullName(guardianRequest.fullName() != null ? guardianRequest.fullName().trim() : "Người giám hộ")
                            .phone(guardianRequest.phone() != null ? guardianRequest.phone().trim() : null)
                            .email(null)
                            .relationship(guardianRequest.relationship() != null ? guardianRequest.relationship().trim() : null)
                            .build();
                    guardian = guardians.save(guardian);
                }
                student.setGuardian(guardian);
            }
        }

        student = students.save(student);

        // Handle class enrollment change
        if (req.classId() != null) {
            // Get current enrollment for this academic year
            AcademicYear academicYear = req.academicYear() != null 
                ? semesterService.getAcademicYearByName(school, req.academicYear())
                : semesterService.getActiveAcademicYear(school);

            Optional<ClassEnrollment> currentEnrollment = enrollments
                    .findTopByStudentAndAcademicYearOrderByEnrolledAtDesc(student,
                            academicYear);

            // Check if the class is changing
            boolean needsNewEnrollment = currentEnrollment.isEmpty() ||
                    !currentEnrollment.get().getClassRoom().getId().equals(req.classId());

            if (needsNewEnrollment) {
                ClassRoom newClass = classRooms.findById(req.classId())
                        .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy lớp học"));

                if (!newClass.getSchool().getId().equals(school.getId())) {
                    throw new ApiException(HttpStatus.FORBIDDEN, "Lớp học không thuộc trường này");
                }

                // Check class is active
                if (newClass.getStatus() != ClassRoomStatus.ACTIVE) {
                    throw new ApiException(HttpStatus.BAD_REQUEST, "Không thể chuyển học sinh vào lớp không hoạt động");
                }

                // Check class capacity (excluding current student if already in this class)
                long currentCount = enrollments.countByClassRoom(newClass);
                if (currentEnrollment.isPresent()
                        && currentEnrollment.get().getClassRoom().getId().equals(req.classId())) {
                    currentCount--; // Don't count current student
                }
                if (currentCount >= newClass.getMaxCapacity()) {
                    throw new ApiException(HttpStatus.BAD_REQUEST,
                            "Lớp đã đủ sĩ số (" + newClass.getMaxCapacity() + " học sinh)");
                }

                // Check combination match if provided in request OR if existing
                if (newClass.getCombination() != null) {
                    if (req.combinationId() != null) {
                        if (!newClass.getCombination().getId().equals(req.combinationId())) {
                            throw new ApiException(HttpStatus.BAD_REQUEST,
                                    "Tổ hợp của lớp mới không khớp với tổ hợp mong muốn.");
                        }
                    } else if (currentEnrollment.isPresent()
                            && currentEnrollment.get().getClassRoom().getCombination() != null) {
                        if (!newClass.getCombination().getId()
                                .equals(currentEnrollment.get().getClassRoom().getCombination().getId())) {
                            throw new ApiException(HttpStatus.BAD_REQUEST,
                                    "Tổ hợp của lớp mới không khớp với tổ hợp hiện tại của học sinh.");
                        }
                    }
                }

                // Remove old enrollment if exists
                currentEnrollment.ifPresent(enrollments::delete);

                // Create new enrollment
                ClassEnrollment newEnrollment = ClassEnrollment.builder()
                        .student(student)
                        .classRoom(newClass)
                        .academicYear(academicYear)
                        .enrolledAt(Instant.now())
                        .build();
                enrollments.save(newEnrollment);
            }
        }

        return toStudentDto(student);
    }

    /**
     * Generate next student code in format HS0001, HS0002, etc.
     */
    private String generateNextStudentCode(School school) {
        // Find the highest student code in the school
        Optional<Student> latestStudent = students.findTopBySchoolOrderByStudentCodeDesc(school);

        if (latestStudent.isEmpty()) {
            return "HS0001";
        }

        String lastCode = latestStudent.get().getStudentCode();

        try {
            if (lastCode.startsWith("HS")) {
                int lastNumber = Integer.parseInt(lastCode.substring(2));
                int nextNumber = lastNumber + 1;
                return String.format("HS%04d", nextNumber);
            }
        } catch (NumberFormatException e) {
            // If parsing fails, fall through to default
        }

        long studentCount = students.countBySchool(school);
        return String.format("HS%04d", studentCount + 1);
    }

    /**
     * Fast DTO mapping — no DB queries. Used by listStudents() with pre-fetched data.
     */
    private StudentDto toStudentDtoFast(Student student, ClassEnrollment enrollment) {
        StudentGuardianDto guardianDto = null;
        if (student.getGuardian() != null) {
            guardianDto = new StudentGuardianDto(
                    student.getGuardian().getId(),
                    student.getGuardian().getFullName(),
                    student.getGuardian().getPhone(),
                    student.getGuardian().getEmail(),
                    student.getGuardian().getRelationship());
        }

        String currentClassName = enrollment != null ? enrollment.getClassRoom().getName() : null;
        UUID currentClassId = enrollment != null ? enrollment.getClassRoom().getId() : null;

        return new StudentDto(
                student.getId(),
                student.getStudentCode(),
                student.getFullName(),
                student.getDateOfBirth(),
                student.getGender() != null ? student.getGender().name() : null,
                student.getBirthPlace(),
                student.getAddress(),
                student.getEmail(),
                student.getPhone(),
                student.getAvatarUrl(),
                student.getStatus().name(),
                student.getEnrollmentDate(),
                currentClassName,
                currentClassId,
                student.getUser() != null,
                guardianDto);
    }

    /**
     * Original DTO mapping with DB queries — used for single-student operations.
     */
    private StudentDto toStudentDto(Student student) {
        AcademicYear currentYear = semesterService.getActiveAcademicYearSafe(student.getSchool());
        ClassEnrollment enrollment = null;
        if (currentYear != null) {
            enrollment = enrollments.findTopByStudentAndAcademicYearOrderByEnrolledAtDesc(
                    student, currentYear).orElse(null);
        }
        return toStudentDtoFast(student, enrollment);
    }

    private void autoAssignStudentToClass(School school, Student student,
            UUID combinationId, AcademicYear academicYear, int grade) {
        // Find all active classes for the grade
        List<ClassRoom> classes = classRooms.findAllBySchoolAndGradeAndAcademicYearAndStatus(
                school, grade, academicYear, ClassRoomStatus.ACTIVE);

        if (classes.isEmpty())
            return;

        // Get enrollment counts
        java.util.Map<UUID, Long> counts = new java.util.HashMap<>();
        for (ClassRoom c : classes) {
            counts.put(c.getId(), enrollments.countByClassRoom(c));
        }

        // Filter by connection to combination
        List<ClassRoom> candidates = classes.stream()
                .filter(classroom -> classroom.getCombination() != null && classroom.getCombination().getId().equals(combinationId))
                .sorted(java.util.Comparator.comparingLong(classroom -> counts.get(classroom.getId())))
                .toList();

        // Fallback if no matching stream class found: try any class in grade
        if (candidates.isEmpty()) {
            candidates = classes.stream()
                    .sorted(java.util.Comparator.comparingLong(classroom -> counts.get(classroom.getId())))
                    .toList();
        }

        // Pick first one with capacity
        for (ClassRoom classroom : candidates) {
            if (counts.get(classroom.getId()) < classroom.getMaxCapacity()) {
                ClassEnrollment enrollment = ClassEnrollment.builder()
                        .student(student)
                        .classRoom(classroom)
                        .academicYear(academicYear)
                        .enrolledAt(Instant.now())
                        .build();
                enrollments.save(enrollment);
                break;
            }
        }
    }

    // ==================== STUDENT PROFILE ====================

    /**
     * Get detailed student profile with enrollment history.
     */
    @Transactional(readOnly = true)
    public StudentProfileDto getStudentProfile(School school, UUID studentId) {
        Student student = students.findByIdAndSchool(studentId, school)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy học sinh"));

        // Get guardian (Many-to-One)
        StudentProfileDto.GuardianDto guardianDto = null;
        if (student.getGuardian() != null) {
            guardianDto = new StudentProfileDto.GuardianDto(
                    student.getGuardian().getId(),
                    student.getGuardian().getFullName(),
                    student.getGuardian().getPhone(),
                    student.getGuardian().getEmail(),
                    student.getGuardian().getRelationship());
        }

        // Get enrollment history
        List<ClassEnrollment> enrollmentList = enrollments.findAllByStudent(student);
        List<StudentProfileDto.ClassEnrollmentHistoryDto> historyDtos = enrollmentList.stream()
                .sorted((a, b) -> b.getEnrolledAt().compareTo(a.getEnrolledAt())) // newest first
                .map(e -> new StudentProfileDto.ClassEnrollmentHistoryDto(
                        e.getId(),
                        e.getClassRoom().getId(),
                        e.getClassRoom().getName(),
                        e.getAcademicYear().getName(),
                        e.getEnrolledAt()))
                .toList();

        // Get current class info
        String currentClassName = null;
        UUID currentClassId = null;
        AcademicYear currentYear = semesterService.getActiveAcademicYearSafe(school);

        Optional<ClassEnrollment> currentEnrollment = Optional.empty();
        if (currentYear != null) {
            currentEnrollment = enrollments.findTopByStudentAndAcademicYearOrderByEnrolledAtDesc(
                    student,
                    currentYear);
        }
        if (currentEnrollment.isPresent()) {
            currentClassName = currentEnrollment.get().getClassRoom().getName();
            currentClassId = currentEnrollment.get().getClassRoom().getId();
        }

        return new StudentProfileDto(
                student.getId(),
                student.getStudentCode(),
                student.getFullName(),
                student.getDateOfBirth(),
                student.getGender() != null ? student.getGender().name() : null,
                student.getBirthPlace(),
                student.getAddress(),
                student.getEmail(),
                student.getPhone(),
                student.getAvatarUrl(),
                student.getStatus().name(),
                student.getEnrollmentDate(),
                currentClassName,
                currentClassId,
                guardianDto,
                historyDtos);
    }

    /**
     * Transfer student to a new class. Creates new enrollment, keeps history.
     */
    @Transactional
    public StudentProfileDto transferStudent(School school, UUID studentId, UUID newClassId) {
        Student student = students.findByIdAndSchool(studentId, school)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy học sinh"));

        ClassRoom newClass = classRooms.findByIdAndSchool(newClassId, school)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy lớp đích"));

        if (newClass.getStatus() != ClassRoomStatus.ACTIVE) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Lớp đích không đang hoạt động");
        }

        AcademicYear academicYear = newClass.getAcademicYear();

        // Check if already in this class for this academic year
        boolean alreadyEnrolled = enrollments.existsByStudentAndClassRoomAndAcademicYear(student, newClass,
                academicYear);
        if (alreadyEnrolled) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Học sinh đã thuộc lớp này trong năm học " + academicYear);
        }

        // Check class capacity
        long currentCount = enrollments.countByClassRoom(newClass);
        if (currentCount >= newClass.getMaxCapacity()) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "Lớp đích đã đạt sĩ số tối đa (" + newClass.getMaxCapacity() + ")");
        }

        // Check combination match
        Optional<ClassEnrollment> existingEnrollment = enrollments
                .findTopByStudentAndAcademicYearOrderByEnrolledAtDesc(student, academicYear);

        if (existingEnrollment.isPresent()) {
            ClassRoom currentClass = existingEnrollment.get().getClassRoom();
            if (currentClass.getCombination() != null && newClass.getCombination() != null) {
                if (!currentClass.getCombination().getId().equals(newClass.getCombination().getId())) {
                    throw new ApiException(HttpStatus.BAD_REQUEST,
                            "Tổ hợp của lớp mới không khớp với tổ hợp hiện tại của học sinh.");
                }
            }
        }

        // Do not delete existing enrollment to preserve history

        // Create new enrollment
        ClassEnrollment newEnrollment = ClassEnrollment.builder()
                .student(student)
                .classRoom(newClass)
                .academicYear(academicYear)
                .enrolledAt(Instant.now())
                .build();
        enrollments.save(newEnrollment);

        log.info("Transferred student {} from {} to class {} for year {}",
                student.getStudentCode(),
                existingEnrollment.map(e -> e.getClassRoom().getName()).orElse("N/A"),
                newClass.getName(),
                academicYear);

        return getStudentProfile(school, studentId);
    }

    // ==================== BULK CLASS ASSIGNMENT ====================

    @Transactional
    public com.schoolmanagement.backend.dto.student.BulkAssignResult bulkAssignToClass(
            School school, com.schoolmanagement.backend.dto.student.BulkAssignRequest request) {

        if (request.studentIds() == null || request.studentIds().isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Không có học sinh nào được chọn");
        }

        AcademicYear currentYear = semesterService.getActiveAcademicYearSafe(school.getId());
        if (currentYear == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Không có năm học đang hoạt động");
        }

        List<Student> selectedStudents = students.findAllById(request.studentIds()).stream()
                .filter(s -> s.getSchool().getId().equals(school.getId()))
                .toList();

        if ("MANUAL".equalsIgnoreCase(request.mode())) {
            return manualAssign(school, selectedStudents, request.classId(), currentYear);
        } else {
            return autoAssign(school, selectedStudents, currentYear);
        }
    }

    private com.schoolmanagement.backend.dto.student.BulkAssignResult manualAssign(
            School school, List<Student> selectedStudents, UUID classId, AcademicYear currentYear) {

        if (classId == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Cần chọn lớp đích khi phân bổ thủ công");
        }
        ClassRoom target = classRooms.findByIdAndSchool(classId, school)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy lớp"));

        if (target.getStatus() != ClassRoomStatus.ACTIVE) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Lớp đích không đang hoạt động");
        }

        int assigned = 0, skipped = 0, failed = 0;
        List<com.schoolmanagement.backend.dto.student.BulkAssignResult.Detail> details = new ArrayList<>();
        long currentCount = enrollments.countByClassRoom(target);

        for (Student student : selectedStudents) {
            // Skip if already enrolled in this class this year
            if (enrollments.existsByStudentAndClassRoomAndAcademicYear(student, target, currentYear)) {
                skipped++;
                details.add(new com.schoolmanagement.backend.dto.student.BulkAssignResult.Detail(
                        student.getFullName(), "SKIPPED", target.getName(), "Đã ở trong lớp này"));
                continue;
            }
            // Check capacity
            if (currentCount >= target.getMaxCapacity()) {
                failed++;
                details.add(new com.schoolmanagement.backend.dto.student.BulkAssignResult.Detail(
                        student.getFullName(), "FAILED", target.getName(), "Lớp đã đủ sĩ số"));
                continue;
            }
            enrollments.save(ClassEnrollment.builder()
                    .student(student).classRoom(target).academicYear(currentYear)
                    .enrolledAt(Instant.now()).build());
            currentCount++;
            assigned++;
            details.add(new com.schoolmanagement.backend.dto.student.BulkAssignResult.Detail(
                    student.getFullName(), "ASSIGNED", target.getName(), null));
        }
        return new com.schoolmanagement.backend.dto.student.BulkAssignResult(assigned, skipped, failed, details);
    }

    private com.schoolmanagement.backend.dto.student.BulkAssignResult autoAssign(
            School school, List<Student> selectedStudents, AcademicYear currentYear) {

        int startYear = currentYear.getStartDate().getYear();

        // Pre-load all active classes grouped by grade
        List<ClassRoom> allActiveClasses = classRooms.findAllBySchoolAndStatus(school, ClassRoomStatus.ACTIVE)
                .stream().filter(c -> c.getAcademicYear().getId().equals(currentYear.getId())).toList();

        // Pre-load current enrollment counts
        Map<UUID, Long> countMap = new HashMap<>();
        for (ClassRoom c : allActiveClasses) {
            countMap.put(c.getId(), enrollments.countByClassRoom(c));
        }

        // Pre-load each student's combination from their latest enrollment
        Map<UUID, com.schoolmanagement.backend.domain.entity.classes.Combination> studentCombMap = new HashMap<>();
        for (Student s : selectedStudents) {
            List<ClassEnrollment> history = enrollments.findAllByStudent(s);
            history.stream()
                    .filter(e -> e.getClassRoom().getCombination() != null)
                    .max(Comparator.comparing(ClassEnrollment::getEnrolledAt))
                    .ifPresent(e -> studentCombMap.put(s.getId(), e.getClassRoom().getCombination()));
        }

        int assigned = 0, skipped = 0, failed = 0;
        List<com.schoolmanagement.backend.dto.student.BulkAssignResult.Detail> details = new ArrayList<>();

        for (Student student : selectedStudents) {
            // Determine expected grade from birth year
            Integer grade = null;
            if (student.getDateOfBirth() != null) {
                int g = startYear - student.getDateOfBirth().getYear() - 5;
                if (g >= 10 && g <= 12) grade = g;
            }

            if (grade == null) {
                failed++;
                details.add(new com.schoolmanagement.backend.dto.student.BulkAssignResult.Detail(
                        student.getFullName(), "FAILED", null,
                        student.getDateOfBirth() == null
                                ? "Học sinh chưa có ngày sinh"
                                : "Năm sinh không phù hợp với khối 10-12"));
                continue;
            }

            com.schoolmanagement.backend.domain.entity.classes.Combination comb = studentCombMap.get(student.getId());

            // Filter candidate classes: same grade + same combination (or any if no comb)
            final int finalGrade = grade;
            List<ClassRoom> candidates = allActiveClasses.stream()
                    .filter(c -> c.getGrade() == finalGrade)
                    .filter(c -> comb == null || (c.getCombination() != null
                            && c.getCombination().getId().equals(comb.getId())))
                    .sorted(Comparator.comparingLong(c -> countMap.getOrDefault(c.getId(), 0L)))
                    .toList();

            // Fallback: any class of that grade if no comb match
            if (candidates.isEmpty()) {
                candidates = allActiveClasses.stream()
                        .filter(c -> c.getGrade() == finalGrade)
                        .sorted(Comparator.comparingLong(c -> countMap.getOrDefault(c.getId(), 0L)))
                        .toList();
            }

            // Skip if already enrolled in any class this year
            boolean alreadyEnrolled = false;
            for (ClassRoom c : candidates) {
                if (enrollments.existsByStudentAndClassRoomAndAcademicYear(student, c, currentYear)) {
                    alreadyEnrolled = true;
                    skipped++;
                    details.add(new com.schoolmanagement.backend.dto.student.BulkAssignResult.Detail(
                            student.getFullName(), "SKIPPED", c.getName(), "Đã được phân lớp"));
                    break;
                }
            }
            if (alreadyEnrolled) continue;

            // Assign to class with most space
            boolean assignedToClass = false;
            for (ClassRoom c : candidates) {
                long cnt = countMap.getOrDefault(c.getId(), 0L);
                if (cnt < c.getMaxCapacity()) {
                    enrollments.save(ClassEnrollment.builder()
                            .student(student).classRoom(c).academicYear(currentYear)
                            .enrolledAt(Instant.now()).build());
                    countMap.put(c.getId(), cnt + 1);
                    assigned++;
                    details.add(new com.schoolmanagement.backend.dto.student.BulkAssignResult.Detail(
                            student.getFullName(), "ASSIGNED", c.getName(), null));
                    assignedToClass = true;
                    break;
                }
            }
            if (!assignedToClass) {
                failed++;
                details.add(new com.schoolmanagement.backend.dto.student.BulkAssignResult.Detail(
                        student.getFullName(), "FAILED", null,
                        candidates.isEmpty() ? "Không có lớp phù hợp cho khối " + grade
                                : "Các lớp phù hợp đã đủ sĩ số"));
            }
        }
        return new com.schoolmanagement.backend.dto.student.BulkAssignResult(assigned, skipped, failed, details);
    }

    // ==================== BULK PROMOTION ====================

    /**
     * Promote multiple students to a new grade in a new academic year.
     * Auto-assigns each student to an available class in the target grade.
     */
    @Transactional
    public BulkPromoteResponse promoteStudents(School school, BulkPromoteRequest request) {
        int promoted = 0;
        int skipped = 0;
        List<String> errors = new ArrayList<>();

        // Find and validate target Academic Year
        AcademicYear targetYear = semesterService.getAcademicYearByName(school, request.targetAcademicYear());
        if (targetYear == null) {
            errors.add("Năm học '" + request.targetAcademicYear() + "' không tồn tại.");
            return new BulkPromoteResponse(0, request.studentIds().size(), errors);
        }

        // Find all active classes for the target grade + academic year
        List<ClassRoom> targetClasses = classRooms.findAllBySchoolAndGradeAndAcademicYearAndStatus(
                school, request.targetGrade(), targetYear, ClassRoomStatus.ACTIVE);

        if (targetClasses.isEmpty()) {
            errors.add("Không có lớp ACTIVE nào ở khối " + request.targetGrade()
                    + " cho năm học " + targetYear.getName());
            return new BulkPromoteResponse(0, request.studentIds().size(), errors);
        }

        // Pre-compute enrollment counts for target classes
        java.util.Map<UUID, Long> counts = new java.util.HashMap<>();
        for (ClassRoom c : targetClasses) {
            counts.put(c.getId(), enrollments.countByClassRoom(c));
        }

        for (UUID studentId : request.studentIds()) {
            try {
                Student student = students.findByIdAndSchool(studentId, school)
                        .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND,
                                "Không tìm thấy học sinh (ID: " + studentId + ")"));

                // Skip if not ACTIVE
                if (student.getStatus() != StudentStatus.ACTIVE) {
                    skipped++;
                    errors.add(student.getFullName() + ": Trạng thái không phải Đang học");
                    continue;
                }

                // Skip if already has enrollment in target academic year
                Optional<ClassEnrollment> existing = enrollments
                        .findTopByStudentAndAcademicYearOrderByEnrolledAtDesc(
                                student, targetYear);
                if (existing.isPresent()) {
                    skipped++;
                    errors.add(student.getFullName() + ": Đã có lớp ("
                            + existing.get().getClassRoom().getName() + ") trong năm học "
                            + targetYear.getName());
                    continue;
                }

                // Find a class with available capacity (load-balanced: pick least filled)
                List<ClassRoom> sorted = targetClasses.stream()
                        .sorted(java.util.Comparator.comparingLong(c -> counts.get(c.getId())))
                        .toList();

                boolean assigned = false;
                for (ClassRoom c : sorted) {
                    if (counts.get(c.getId()) < c.getMaxCapacity()) {
                        ClassEnrollment enrollment = ClassEnrollment.builder()
                                .student(student)
                                .classRoom(c)
                                .academicYear(targetYear)
                                .enrolledAt(Instant.now())
                                .build();
                        enrollments.save(enrollment);
                        counts.put(c.getId(), counts.get(c.getId()) + 1);
                        promoted++;
                        assigned = true;
                        break;
                    }
                }

                if (!assigned) {
                    skipped++;
                    errors.add(student.getFullName() + ": Tất cả lớp khối "
                            + request.targetGrade() + " đã đầy");
                }
            } catch (ApiException e) {
                skipped++;
                errors.add(e.getMessage());
            } catch (Exception e) {
                skipped++;
                errors.add("Lỗi khi xử lý HS (ID: " + studentId + "): " + e.getMessage());
                log.error("Error promoting student {}", studentId, e);
            }
        }

        log.info("Bulk promotion completed: {} promoted, {} skipped out of {} total",
                promoted, skipped, request.studentIds().size());

        return new BulkPromoteResponse(promoted, skipped, errors);
    }

    public byte[] exportStudentsToExcel(School school, UUID classId) {
        List<Student> studentList;
        if (classId != null) {
            ClassRoom cls = classRooms.findById(classId)
                    .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy lớp học"));
            if (!cls.getSchool().getId().equals(school.getId())) {
                throw new ApiException(HttpStatus.FORBIDDEN, "Không có quyền truy cập lớp này");
            }
            AcademicYear currentYear = semesterService.getActiveAcademicYearSafe(school.getId());
            List<ClassEnrollment> clsEnrollments = currentYear != null
                    ? enrollments.findAllByClassRoomAndAcademicYear(cls, currentYear)
                    : enrollments.findAllByClassRoom(cls);
            studentList = clsEnrollments.stream().map(ClassEnrollment::getStudent).toList();
        } else {
            studentList = students.findAll(
                    (root, query, cb) -> cb.equal(root.get("school"), school));
        }

        // Build enrollment map for class name lookup
        AcademicYear currentYear = semesterService.getActiveAcademicYearSafe(school.getId());
        Map<UUID, String> classNameMap = new HashMap<>();
        if (!studentList.isEmpty() && currentYear != null) {
            List<ClassEnrollment> allEnrollments = enrollments.findAllByStudentInAndAcademicYear(studentList, currentYear);
            for (ClassEnrollment e : allEnrollments) {
                classNameMap.put(e.getStudent().getId(), e.getClassRoom().getName());
            }
        }

        try (XSSFWorkbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("Danh sách học sinh");

            CellStyle headerStyle = workbook.createCellStyle();
            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerStyle.setFont(headerFont);

            String[] headers = {"STT", "Mã HS", "Họ và tên", "Giới tính", "Ngày sinh", "Lớp", "Trạng thái", "Email", "SĐT"};
            Row headerRow = sheet.createRow(0);
            for (int i = 0; i < headers.length; i++) {
                Cell cell = headerRow.createCell(i);
                cell.setCellValue(headers[i]);
                cell.setCellStyle(headerStyle);
                sheet.setColumnWidth(i, 4000);
            }
            sheet.setColumnWidth(2, 7000);

            int rowNum = 1;
            for (Student s : studentList) {
                Row row = sheet.createRow(rowNum++);
                row.createCell(0).setCellValue(rowNum - 1);
                row.createCell(1).setCellValue(s.getStudentCode() != null ? s.getStudentCode() : "");
                row.createCell(2).setCellValue(s.getFullName() != null ? s.getFullName() : "");
                row.createCell(3).setCellValue(s.getGender() != null ? (s.getGender().name().equals("MALE") ? "Nam" : "Nữ") : "");
                row.createCell(4).setCellValue(s.getDateOfBirth() != null ? s.getDateOfBirth().toString() : "");
                row.createCell(5).setCellValue(classNameMap.getOrDefault(s.getId(), ""));
                row.createCell(6).setCellValue(s.getStatus() != null ? s.getStatus().name() : "");
                row.createCell(7).setCellValue(s.getEmail() != null ? s.getEmail() : "");
                row.createCell(8).setCellValue(s.getPhone() != null ? s.getPhone() : "");
            }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            workbook.write(out);
            return out.toByteArray();
        } catch (IOException e) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "Không thể tạo file Excel");
        }
    }

}
