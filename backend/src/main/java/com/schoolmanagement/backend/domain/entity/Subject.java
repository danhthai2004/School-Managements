package com.schoolmanagement.backend.domain.entity;

import com.schoolmanagement.backend.domain.StreamType;
import com.schoolmanagement.backend.domain.SubjectType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

@Entity
@Table(name = "subjects")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Subject {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String name;

    @Column(unique = true)
    private String code;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SubjectType type;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private StreamType stream;

    @Column(name = "total_lessons")
    private Integer totalLessons;

    @Builder.Default
    private boolean active = true;

    private String description;
}
