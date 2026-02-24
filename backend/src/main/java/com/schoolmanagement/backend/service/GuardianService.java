package com.schoolmanagement.backend.service;

import com.schoolmanagement.backend.domain.entity.Guardian;
import com.schoolmanagement.backend.domain.entity.User;
import com.schoolmanagement.backend.dto.StudentDto.GuardianDto;
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

    Guardian guardian = guardianRepository.findByEmail(email).orElseThrow(() -> new EntityNotFoundException("GuardianService: Guardian not found"));
    return convertToGuardianDto(guardian);
  }

  private GuardianDto convertToGuardianDto(Guardian guardian) {
    return new GuardianDto(
            guardian.getId(),
            guardian.getFullName(),
            guardian.getPhone(),
            guardian.getEmail(),
            guardian.getRelationship()
    );
  }
}
