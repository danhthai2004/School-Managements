package com.schoolmanagement.backend.service.student;

import com.schoolmanagement.backend.domain.entity.student.Guardian;
import com.schoolmanagement.backend.domain.entity.auth.User;
import com.schoolmanagement.backend.dto.student.GuardianDto;
import com.schoolmanagement.backend.repo.student.GuardianRepository;
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
