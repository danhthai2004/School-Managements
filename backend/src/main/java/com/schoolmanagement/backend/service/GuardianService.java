package com.schoolmanagement.backend.service;

import com.schoolmanagement.backend.domain.entity.Guardian;
import com.schoolmanagement.backend.domain.entity.User;
import com.schoolmanagement.backend.dto.GuardianDto;
import com.schoolmanagement.backend.repo.GuardianRepository;
import jakarta.persistence.EntityNotFoundException;
import lombok.AllArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@AllArgsConstructor
public class GuardianService {
  private final GuardianRepository guardianRepository;

  public GuardianDto findGuardianByUser(User user) {
    String email = user.getEmail();
    if (email == null || email.isEmpty()) {
      throw new IllegalArgumentException("GuardianService: Email is null or empty");
    }

    Guardian guardian = guardianRepository.findByEmail(email).stream()
        .findFirst()
        .orElseThrow(() -> new EntityNotFoundException("GuardianService: Guardian not found"));
    return convertToGuardianDto(guardian);
  }

  private GuardianDto convertToGuardianDto(Guardian guardian) {
    String studentName = "";
    String studentClass = "";
    if (guardian.getStudents() != null && !guardian.getStudents().isEmpty()) {
      studentName = guardian.getStudents().get(0).getFullName();
    }
    return new GuardianDto(
        guardian.getId(),
        guardian.getFullName(),
        guardian.getEmail(),
        guardian.getPhone(),
        guardian.getRelationship(),
        studentName,
        studentClass);
  }
}
