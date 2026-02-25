package com.schoolmanagement.backend.repo;

import com.schoolmanagement.backend.domain.entity.Ward;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface WardRepository extends JpaRepository<Ward, Integer> {

    /**
     * Find all wards belonging to districts within a given province.
     * Uses a native query since there is no District entity:
     * wards.district_code -> districts.code -> districts.province_code
     */
    @Query(value = "SELECT w.* FROM wards w " +
            "JOIN districts d ON w.district_code = d.code " +
            "WHERE d.province_code = :provinceCode " +
            "ORDER BY w.name ASC", nativeQuery = true)
    List<Ward> findByProvinceCode(int provinceCode);
}
