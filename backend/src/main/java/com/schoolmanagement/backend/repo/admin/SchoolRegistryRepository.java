package com.schoolmanagement.backend.repo.admin;

import com.schoolmanagement.backend.domain.entity.admin.SchoolLevel;
import com.schoolmanagement.backend.domain.entity.admin.SchoolRegistry;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface SchoolRegistryRepository extends JpaRepository<SchoolRegistry, String> {
    List<SchoolRegistry> findByProvinceCodeAndSchoolLevelOrderByNameAsc(Integer provinceCode, SchoolLevel schoolLevel);

    List<SchoolRegistry> findByProvinceCodeOrderByNameAsc(Integer provinceCode);
}
