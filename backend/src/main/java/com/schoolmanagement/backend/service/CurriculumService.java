package com.schoolmanagement.backend.service;

import com.schoolmanagement.backend.domain.SubjectType;
import com.schoolmanagement.backend.domain.entity.Combination;
import com.schoolmanagement.backend.domain.entity.School;
import com.schoolmanagement.backend.domain.entity.Subject;
import com.schoolmanagement.backend.dto.CombinationDto;
import com.schoolmanagement.backend.dto.SubjectDto;
import com.schoolmanagement.backend.dto.request.CreateCombinationRequest;
import com.schoolmanagement.backend.exception.ApiException;
import com.schoolmanagement.backend.repo.CombinationRepository;
import com.schoolmanagement.backend.repo.SubjectRepository;
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
public class CurriculumService {

    private final SubjectRepository subjects;
    private final CombinationRepository combinations;

    @Transactional(readOnly = true)
    public List<SubjectDto> listAllSubjects() {
        return subjects.findAll().stream()
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
        for (Subject s : electives) {
            if (s.getType() != SubjectType.ELECTIVE) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Môn " + s.getName() + " không phải là môn lựa chọn.");
            }
            if (s.getStream() != req.stream()) {
                throw new ApiException(HttpStatus.BAD_REQUEST,
                        "Môn " + s.getName() + " thuộc ban " + s.getStream() + " không phù hợp với ban "
                                + req.stream());
            }
        }

        // 3. Get Specialized Subjects
        List<Subject> specialized = subjects.findAllById(req.specializedSubjectIds());
        if (specialized.size() != 3) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Không tìm thấy đủ 3 chuyên đề hợp lệ.");
        }
        for (Subject s : specialized) {
            if (s.getType() != SubjectType.SPECIALIZED) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Môn " + s.getName() + " không phải là chuyên đề.");
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
        for (Subject s : electives) {
            if (s.getType() != SubjectType.ELECTIVE) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Môn " + s.getName() + " không phải là môn lựa chọn.");
            }
            if (s.getStream() != req.stream()) {
                throw new ApiException(HttpStatus.BAD_REQUEST,
                        "Môn " + s.getName() + " thuộc ban " + s.getStream() + " không phù hợp với ban "
                                + req.stream());
            }
        }

        // 3. Get Specialized Subjects
        List<Subject> specialized = subjects.findAllById(req.specializedSubjectIds());
        if (specialized.size() != 3) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "Không tìm thấy đủ 3 chuyên đề hợp lệ.");
        }
        for (Subject s : specialized) {
            if (s.getType() != SubjectType.SPECIALIZED) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "Môn " + s.getName() + " không phải là chuyên đề.");
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

        // Check for ClassRoom constraints is handled by DB FK or can be checked here.
        // Assuming DB throws integrity violation if used.

        combinations.delete(combination);
    }

    private SubjectDto toSubjectDto(Subject s) {
        return new SubjectDto(
                s.getId(),
                s.getName(),
                s.getCode(),
                s.getType(),
                s.getStream(),
                s.getTotalLessons(),
                s.isActive(),
                s.getDescription());
    }

    private CombinationDto toCombinationDto(Combination c) {
        List<SubjectDto> subjectDtos = c.getSubjects().stream()
                .sorted(Comparator.comparing(Subject::getType).thenComparing(Subject::getName))
                .map(this::toSubjectDto)
                .toList();

        return new CombinationDto(
                c.getId(),
                c.getName(),
                c.getCode(),
                c.getStream(),
                subjectDtos);
    }
}
