package com.schoolmanagement.backend.service;

import com.schoolmanagement.backend.domain.SubjectType;
import com.schoolmanagement.backend.domain.entity.Subject;
import com.schoolmanagement.backend.repo.SubjectRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class CurriculumSeederService {

        private final SubjectRepository subjects;
        private final com.schoolmanagement.backend.repo.CombinationRepository combinations;
        private final com.schoolmanagement.backend.repo.ClassRoomRepository classRooms;

        @Transactional
        public void seedSubjects() {
                if (subjects.count() > 0) {
                        log.info("Subjects already seeded. Skipping.");
                        return;
                }
                log.info("Seeding standard subjects (GDPT 2018)...");

                // 1. Compulsory Subjects (Môn bắt buộc)
                // 1. Compulsory Subjects (Môn bắt buộc) - No Stream
                List<Subject> compulsory = List.of(
                                createSubject("Toán", "TOAN", SubjectType.COMPULSORY, 3, null),
                                createSubject("Ngữ văn", "VAN", SubjectType.COMPULSORY, 3, null),
                                createSubject("Ngoại ngữ 1 (Tiếng Anh)", "ANH", SubjectType.COMPULSORY, 3, null),
                                createSubject("Lịch sử", "SU", SubjectType.COMPULSORY, 2, null),
                                createSubject("Giáo dục thể chất", "GDTC", SubjectType.COMPULSORY, 2, null),
                                createSubject("Giáo dục quốc phòng và an ninh", "GDQP", SubjectType.COMPULSORY, 1,
                                                null),
                                createSubject("Hoạt động trải nghiệm, hướng nghiệp", "HDTN", SubjectType.COMPULSORY, 3,
                                                null),
                                createSubject("Nội dung giáo dục địa phương", "GDDP", SubjectType.COMPULSORY, 1, null),
                                createSubject("Chào cờ", "CC", SubjectType.COMPULSORY, 1, null),
                                createSubject("Sinh hoạt lớp", "SHL", SubjectType.COMPULSORY, 1, null));
                subjects.saveAll(compulsory);

                // 2. Elective Subjects (Môn lựa chọn)
                List<Subject> elective = List.of(
                                createSubject("Vật lý", "LY", SubjectType.ELECTIVE, 2,
                                                com.schoolmanagement.backend.domain.StreamType.TU_NHIEN),
                                createSubject("Hóa học", "HOA", SubjectType.ELECTIVE, 2,
                                                com.schoolmanagement.backend.domain.StreamType.TU_NHIEN),
                                createSubject("Sinh học", "SINH", SubjectType.ELECTIVE, 2,
                                                com.schoolmanagement.backend.domain.StreamType.TU_NHIEN),
                                createSubject("Tin học", "TIN", SubjectType.ELECTIVE, 2,
                                                com.schoolmanagement.backend.domain.StreamType.TU_NHIEN),
                                createSubject("Địa lý", "DIA", SubjectType.ELECTIVE, 2,
                                                com.schoolmanagement.backend.domain.StreamType.XA_HOI),
                                createSubject("Giáo dục kinh tế và pháp luật", "KTPL", SubjectType.ELECTIVE, 2,
                                                com.schoolmanagement.backend.domain.StreamType.XA_HOI),
                                createSubject("Công nghệ (Nông nghiệp)", "CN_NONG", SubjectType.ELECTIVE, 2,
                                                com.schoolmanagement.backend.domain.StreamType.TU_NHIEN),
                                createSubject("Công nghệ (Công nghiệp)", "CN_CONG", SubjectType.ELECTIVE, 2,
                                                com.schoolmanagement.backend.domain.StreamType.TU_NHIEN),
                                createSubject("Âm nhạc", "NHAC", SubjectType.ELECTIVE, 2,
                                                com.schoolmanagement.backend.domain.StreamType.XA_HOI),
                                createSubject("Mỹ thuật", "MT", SubjectType.ELECTIVE, 2,
                                                com.schoolmanagement.backend.domain.StreamType.XA_HOI));
                subjects.saveAll(elective);

                // 3. Specialized Subjects (Chuyên đề học tập) - 35 periods/year ~ 1/week
                List<Subject> specialized = List.of(
                                createSubject("Chuyên đề Toán", "CD_TOAN", SubjectType.SPECIALIZED, 1,
                                                com.schoolmanagement.backend.domain.StreamType.TU_NHIEN),
                                createSubject("Chuyên đề Ngữ văn", "CD_VAN", SubjectType.SPECIALIZED, 1,
                                                com.schoolmanagement.backend.domain.StreamType.XA_HOI),
                                createSubject("Chuyên đề Vật lý", "CD_LY", SubjectType.SPECIALIZED, 1,
                                                com.schoolmanagement.backend.domain.StreamType.TU_NHIEN),
                                createSubject("Chuyên đề Hóa học", "CD_HOA", SubjectType.SPECIALIZED, 1,
                                                com.schoolmanagement.backend.domain.StreamType.TU_NHIEN),
                                createSubject("Chuyên đề Sinh học", "CD_SINH", SubjectType.SPECIALIZED, 1,
                                                com.schoolmanagement.backend.domain.StreamType.TU_NHIEN),
                                createSubject("Chuyên đề Lịch sử", "CD_SU", SubjectType.SPECIALIZED, 1,
                                                com.schoolmanagement.backend.domain.StreamType.XA_HOI),
                                createSubject("Chuyên đề Địa lý", "CD_DIA", SubjectType.SPECIALIZED, 1,
                                                com.schoolmanagement.backend.domain.StreamType.XA_HOI));
                subjects.saveAll(specialized);

                log.info("Seeding subjects completed.");
        }

        private Subject createSubject(String name, String code, SubjectType type, int totalLessons,
                        com.schoolmanagement.backend.domain.StreamType stream) {
                return Subject.builder()
                                .name(name)
                                .code(code)
                                .type(type)
                                .totalLessons(totalLessons)
                                .stream(stream)
                                .active(true)
                                .build();
        }
}
