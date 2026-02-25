package com.schoolmanagement.backend.repo;

import com.schoolmanagement.backend.domain.entity.Ward;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface WardRepository extends JpaRepository<Ward, Integer> {

    /**
     * Find all wards belonging to a given province directly via province_code
     * column.
     */
    List<Ward> findByProvinceCodeOrderByNameAsc(int provinceCode);
}
