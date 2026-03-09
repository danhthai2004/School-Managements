package com.schoolmanagement.backend.repo.location;

import com.schoolmanagement.backend.domain.entity.location.Province;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProvinceRepository extends JpaRepository<Province, Integer> {
}
