package com.schoolmanagement.backend.service.exam;

import com.schoolmanagement.backend.domain.entity.classes.ExamRoom;
import com.schoolmanagement.backend.domain.entity.student.ExamStudent;
import com.schoolmanagement.backend.domain.entity.classes.ClassEnrollment;

import com.schoolmanagement.backend.domain.entity.exam.ExamSchedule;
import com.schoolmanagement.backend.domain.entity.admin.School;
import com.schoolmanagement.backend.domain.entity.student.Student;


import com.schoolmanagement.backend.exception.ApiException;
import com.schoolmanagement.backend.repo.classes.ClassEnrollmentRepository;
import com.schoolmanagement.backend.repo.classes.ExamRoomRepository;
import com.schoolmanagement.backend.repo.student.ExamStudentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Dịch vụ phân bổ học sinh ngẫu nhiên vào các phòng thi.
 * Quy trình:
 * 1. Pool: Lấy tất cả học sinh cùng khối đang active
 * 2. Validate: Kiểm tra tổng sức chứa >= tổng học sinh
 * 3. Shuffle: Trộn ngẫu nhiên danh sách
 * 4. Distribute: Phân bổ học sinh vào phòng
 * 5. Batch Insert: Lưu vào DB
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class ExamAllocationService {

    private final ClassEnrollmentRepository classEnrollmentRepository;
    private final ExamRoomRepository examRoomRepository;
    private final ExamStudentRepository examStudentRepository;

    /**
     * Phân bổ học sinh vào các phòng thi.
     *
     * @param examSchedule Lịch thi (chứa thông tin grade, subject)
     * @param school       Trường học
     * @param academicYear Năm học hiện tại
     * @return Tổng số học sinh đã phân bổ
     */
    @Transactional
    public int allocateStudents(ExamSchedule examSchedule, School school, String academicYear) {
        Integer grade = examSchedule.getGrade();
        if (grade == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "Lịch thi phải có thông tin khối lớp để phân bổ học sinh");
        }

        // 1. Pool: Lấy tất cả học sinh cùng khối từ ClassEnrollment
        List<Student> students = poolStudentsByGrade(school, academicYear, grade);
        if (students.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "Không tìm thấy học sinh nào thuộc khối " + grade);
        }

        // 2. Lấy danh sách phòng thi
        List<ExamRoom> examRooms = examRoomRepository.findByExamScheduleId(examSchedule.getId());
        if (examRooms.isEmpty()) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    "Chưa có phòng thi nào được gán cho lịch thi này");
        }

        // 3. Validate tổng sức chứa
        int totalCapacity = examRooms.stream()
                .mapToInt(ExamRoom::getCapacity)
                .sum();

        if (totalCapacity < students.size()) {
            throw new ApiException(HttpStatus.BAD_REQUEST,
                    String.format("Tổng sức chứa phòng thi (%d) không đủ cho %d học sinh. Thiếu %d chỗ.",
                            totalCapacity, students.size(), students.size() - totalCapacity));
        }

        log.info("Allocating {} students into {} rooms (total capacity: {})",
                students.size(), examRooms.size(), totalCapacity);

        // 4. Shuffle: Trộn ngẫu nhiên
        List<Student> shuffled = new ArrayList<>(students);
        Collections.shuffle(shuffled);

        // 5. Distribute: Lặp qua phòng, gán học sinh
        List<ExamStudent> examStudents = new ArrayList<>();
        int studentIndex = 0;

        for (ExamRoom room : examRooms) {
            int roomCapacity = room.getCapacity();
            for (int i = 0; i < roomCapacity && studentIndex < shuffled.size(); i++, studentIndex++) {
                ExamStudent es = ExamStudent.builder()
                        .examRoom(room)
                        .student(shuffled.get(studentIndex))
                        .build();
                examStudents.add(es);
            }
        }

        // 6. Batch Insert
        examStudentRepository.saveAll(examStudents);

        log.info("Successfully allocated {} students", examStudents.size());
        return examStudents.size();
    }

    /**
     * Pool tất cả học sinh thuộc 1 khối lớp từ ClassEnrollment.
     */
    private List<Student> poolStudentsByGrade(School school, String academicYear, int grade) {
        // Lấy tất cả class enrollment → filter theo grade của classRoom
        // Vì ClassEnrollment không query trực tiếp theo grade,
        // ta phải lấy tất cả enrollment của trường rồi filter.
        return classEnrollmentRepository.findAll().stream()
                .filter(ce -> ce.getAcademicYear().equals(academicYear))
                .filter(ce -> ce.getClassRoom().getSchool().getId().equals(school.getId()))
                .filter(ce -> ce.getClassRoom().getGrade() == grade)
                .map(ClassEnrollment::getStudent)
                .distinct()
                .collect(Collectors.toList());
    }

    /**
     * Đổi chỗ 2 học sinh giữa 2 phòng thi.
     */
    @Transactional
    public void swapStudents(UUID studentId1, UUID examRoomId1,
            UUID studentId2, UUID examRoomId2) {
        ExamStudent es1 = examStudentRepository.findByExamRoomIdAndStudentId(examRoomId1, studentId1)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND,
                        "Không tìm thấy học sinh 1 trong phòng thi"));

        ExamStudent es2 = examStudentRepository.findByExamRoomIdAndStudentId(examRoomId2, studentId2)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND,
                        "Không tìm thấy học sinh 2 trong phòng thi"));

        // Swap rooms
        ExamRoom temp = es1.getExamRoom();
        es1.setExamRoom(es2.getExamRoom());
        es2.setExamRoom(temp);

        examStudentRepository.save(es1);
        examStudentRepository.save(es2);

        log.info("Swapped students {} and {} between rooms {} and {}",
                studentId1, studentId2, examRoomId1, examRoomId2);
    }
}
