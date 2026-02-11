package com.schoolmanagement.backend.repo;

import com.schoolmanagement.backend.domain.entity.SchoolLevel;
import com.schoolmanagement.backend.domain.entity.SchoolRegistry;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface SchoolRegistryRepository extends JpaRepository<SchoolRegistry, String> {
    List<SchoolRegistry> findByProvinceCodeAndSchoolLevelOrderByNameAsc(Integer provinceCode, SchoolLevel schoolLevel);

    List<SchoolRegistry> findByProvinceCodeOrderByNameAsc(Integer provinceCode);
}
