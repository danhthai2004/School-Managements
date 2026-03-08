package com.schoolmanagement.backend.domain.entity;

import com.schoolmanagement.backend.domain.InvigilatorRole;
import jakarta.persistence.*;
import lombok.*;
import java.util.UUID;

/**
 * Giám thị coi thi tại một phòng thi.
 */
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "exam_invigilators", indexes = {
        @Index(name = "idx_invigilator_room", columnList = "exam_room_id"),
        @Index(name = "idx_invigilator_teacher", columnList = "teacher_id")
})
public class ExamInvigilator {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "exam_room_id", nullable = false)
    private ExamRoom examRoom;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "teacher_id", nullable = false)
    private Teacher teacher;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private InvigilatorRole role;
}
