package com.schoolmanagement.backend.domain.entity.classes;

import com.schoolmanagement.backend.domain.entity.admin.School;

import com.schoolmanagement.backend.domain.classes.RoomStatus;
import jakarta.persistence.*;
import lombok.*;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "rooms", indexes = {
        @Index(name = "idx_room_school", columnList = "school_id"),
        @Index(name = "idx_room_name_building_school", columnList = "name, building, school_id", unique = true)
})
public class Room {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, length = 100)
    private String name; // VD: "Phòng 101", "Lab A"

    @Column(nullable = false)
    @Builder.Default
    private Integer capacity = 40;

    @Column(length = 100)
    private String building; // Tòa nhà/Dãy phòng (tùy chọn)

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private RoomStatus status = RoomStatus.ACTIVE;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "school_id", nullable = false)
    private School school;
}
