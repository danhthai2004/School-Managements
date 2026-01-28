package com.schoolmanagement.backend.repo;

import com.schoolmanagement.backend.domain.entity.Province;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProvinceRepository extends JpaRepository<Province, Integer> {
}
