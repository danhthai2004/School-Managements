package com.schoolmanagement.backend.service;

import com.schoolmanagement.backend.domain.entity.Province;
import com.schoolmanagement.backend.domain.entity.SchoolLevel;
import com.schoolmanagement.backend.domain.entity.SchoolRegistry;
import com.schoolmanagement.backend.dto.ProvinceDto;
import com.schoolmanagement.backend.dto.SchoolRegistryDto;
import com.schoolmanagement.backend.repo.ProvinceRepository;
import com.schoolmanagement.backend.repo.SchoolRegistryRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class LocationService {

    private final ProvinceRepository provinces;
    private final SchoolRegistryRepository schoolRegistry;

    public LocationService(ProvinceRepository provinces,
            SchoolRegistryRepository schoolRegistry) {
        this.provinces = provinces;
        this.schoolRegistry = schoolRegistry;
    }

    public List<ProvinceDto> getProvinces() {
        return provinces.findAll().stream()
                .map(p -> new ProvinceDto(p.getCode(), p.getName(), p.getCodename()))
                .toList();
    }

    public List<SchoolRegistryDto> getSchoolRegistry(Integer provinceCode, SchoolLevel level) {
        List<SchoolRegistry> list;
        if (level != null) {
            list = schoolRegistry.findByProvinceCodeAndSchoolLevelOrderByNameAsc(provinceCode, level);
        } else {
            list = schoolRegistry.findByProvinceCodeOrderByNameAsc(provinceCode);
        }
        return list.stream()
                .map(r -> new SchoolRegistryDto(r.getCode(), r.getName(), r.getProvinceCode(),
                        r.getSchoolLevel(), r.getEnrollmentArea()))
                .toList();
    }
}
