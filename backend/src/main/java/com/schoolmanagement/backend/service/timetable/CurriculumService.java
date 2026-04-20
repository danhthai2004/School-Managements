package com.schoolmanagement.backend.service.timetable;

import com.schoolmanagement.backend.domain.classes.SubjectType;
import com.schoolmanagement.backend.domain.entity.classes.Combination;
import com.schoolmanagement.backend.domain.entity.admin.School;
import com.schoolmanagement.backend.domain.entity.classes.Subject;
import com.schoolmanagement.backend.dto.classes.CombinationDto;
import com.schoolmanagement.backend.dto.classes.SubjectDto;
import com.schoolmanagement.backend.dto.classes.CreateCombinationRequest;
import com.schoolmanagement.backend.exception.ApiException;
import com.schoolmanagement.backend.repo.classes.ClassRoomRepository;
import com.schoolmanagement.backend.repo.classes.CombinationRepository;
import com.schoolmanagement.backend.repo.classes.SubjectRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class CurriculumService {

    private final SubjectRepository subjects;
    private final CombinationRepository combinations;
    private final ClassRoomRepository classRooms;

    @Transactional(readOnly = true)
    public List<SubjectDto> listAllSubjects() {
        return subjects.findAll().stream()
                // Filter out CC and SHL (Chào cờ, Sinh hoạt lớp) - they're auto-scheduled in
                // timetable
                .filter(subject -> !"CC".equals(subject.getCode()) && !"SHL".equals(subject.getCode()))
                .sorted(Comparator.comparing(Subject::getType).thenComparing(Subject::getName))
                .map(this::toSubjectDto)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<CombinationDto> listCombinations(School school) {
        return combinations.findAllBySchool(school).stream()
                .map(this::toCombinationDto)
                .toList();
    }

    @Transactional
    public CombinationDto createCombination(School school, CreateCombinationRequest req) {
        if (req.stream() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Vui lòng chọn Ban (Tự nhiên / Xã hội)");
        }

        // 1. Get Compulsory Subjects
        List<Subject> compulsory = subjects.findByTypeAndActiveTrue(SubjectType.COMPULSORY);
        if (compulsory.isEmpty()) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR,
                    "Hệ thống chưa có môn học bắt buộc. Vui lòng liên hệ Admin.");
        }

        // 2. Get Elective Subjects
        List<Subject> electives = subjects.findAllById(req.electiveSubjectIds());
        if (electives.size() != 4) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Không tìm thấy đủ 4 môn lựa chọn hợp lệ.");
        }
        for (Subject subject : electives) {
            if (subject.getType() != SubjectType.ELECTIVE) {
                throw new ApiException(HttpStatus.BAD_REQUEST,
                        "Môn " + subject.getName() + " không phải là môn lựa chọn.");
            }
            if (subject.getStream() != req.stream()) {
                throw new ApiException(HttpStatus.BAD_REQUEST,
                        "Môn " + subject.getName() + " thuộc ban " + subject.getStream() + " không phù hợp với ban "
                                + req.stream());
            }
        }

        // 3. Get Specialized Subjects
        List<Subject> specialized = subjects.findAllById(req.specializedSubjectIds());
        if (specialized.size() != 3) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Không tìm thấy đủ 3 chuyên đề hợp lệ.");
        }
        for (Subject subject : specialized) {
            if (subject.getType() != SubjectType.SPECIALIZED) {
                throw new ApiException(HttpStatus.BAD_REQUEST,
                        "Môn " + subject.getName() + " không phải là chuyên đề.");
            }
            // Relaxed validation: Allow any specialized subject regardless of stream
        }

        // 4. Merge all subjects
        Set<Subject> allSubjects = new HashSet<>();
        allSubjects.addAll(compulsory);
        allSubjects.addAll(electives);
        allSubjects.addAll(specialized);

        // 5. Create Combination
        Combination combination = Combination.builder()
                .name(req.name())
                .code(req.code())
                .stream(req.stream())
                .school(school)
                .subjects(allSubjects)
                .build();

        combination = combinations.save(combination);
        return toCombinationDto(combination);
    }

    @Transactional
    public CombinationDto updateCombination(UUID id, School school, CreateCombinationRequest req) {
        Combination combination = combinations.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy tổ hợp"));

        if (!combination.getSchool().getId().equals(school.getId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Không có quyền chỉnh sửa tổ hợp này");
        }

        if (req.stream() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Vui lòng chọn Ban (Tự nhiên / Xã hội)");
        }

        // 1. Get Compulsory Subjects
        List<Subject> compulsory = subjects.findByTypeAndActiveTrue(SubjectType.COMPULSORY);

        // 2. Get Elective Subjects
        List<Subject> electives = subjects.findAllById(req.electiveSubjectIds());
        if (electives.size() != 4) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Không tìm thấy đủ 4 môn lựa chọn hợp lệ.");
        }
        for (Subject subject : electives) {
            if (subject.getType() != SubjectType.ELECTIVE) {
                throw new ApiException(HttpStatus.BAD_REQUEST,
                        "Môn " + subject.getName() + " không phải là môn lựa chọn.");
            }
            if (subject.getStream() != req.stream()) {
                throw new ApiException(HttpStatus.BAD_REQUEST,
                        "Môn " + subject.getName() + " thuộc ban " + subject.getStream() + " không phù hợp với ban "
                                + req.stream());
            }
        }

        // 3. Get Specialized Subjects
        List<Subject> specialized = subjects.findAllById(req.specializedSubjectIds());
        if (specialized.size() != 3) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Không tìm thấy đủ 3 chuyên đề hợp lệ.");
        }
        for (Subject subject : specialized) {
            if (subject.getType() != SubjectType.SPECIALIZED) {
                throw new ApiException(HttpStatus.BAD_REQUEST,
                        "Môn " + subject.getName() + " không phải là chuyên đề.");
            }
        }

        // 4. Merge all subjects
        Set<Subject> allSubjects = new HashSet<>();
        allSubjects.addAll(compulsory);
        allSubjects.addAll(electives);
        allSubjects.addAll(specialized);

        // 5. Update Combination
        combination.setName(req.name());
        combination.setCode(req.code());
        combination.setStream(req.stream());
        combination.setSubjects(allSubjects);

        combination = combinations.save(combination);
        return toCombinationDto(combination);
    }

    @Transactional
    public void deleteCombination(UUID id, School school) {
        Combination combination = combinations.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "Không tìm thấy tổ hợp"));

        if (!combination.getSchool().getId().equals(school.getId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Không có quyền xóa tổ hợp này");
        }

        // Check if any classroom is using this combination
        if (classRooms.existsByCombination(combination)) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "Không thể xóa tổ hợp '" + combination.getName() + "' vì đang có lớp học sử dụng tổ hợp này.");
        }

        combinations.delete(combination);
    }

    private SubjectDto toSubjectDto(Subject subject) {
        return new SubjectDto(
                subject.getId(),
                subject.getName(),
                subject.getCode(),
                subject.getType(),
                subject.getStream(),
                subject.getTotalLessons(),
                subject.isActive(),
                subject.getDescription());
    }

    private CombinationDto toCombinationDto(Combination combination) {
        List<SubjectDto> subjectDtos = combination.getSubjects().stream()
                .sorted(Comparator.comparing(Subject::getType).thenComparing(Subject::getName))
                .map(this::toSubjectDto)
                .toList();

        return new CombinationDto(
                combination.getId(),
                combination.getName(),
                combination.getCode(),
                combination.getStream(),
                subjectDtos);
    }
}
