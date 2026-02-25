package com.schoolmanagement.backend.service;

import com.schoolmanagement.backend.domain.entity.SchoolLevel;
import com.schoolmanagement.backend.domain.entity.SchoolRegistry;
import com.schoolmanagement.backend.dto.ProvinceDto;
import com.schoolmanagement.backend.dto.SchoolRegistryDto;
import com.schoolmanagement.backend.dto.WardDto;
import com.schoolmanagement.backend.repo.ProvinceRepository;
import com.schoolmanagement.backend.repo.SchoolRegistryRepository;
import com.schoolmanagement.backend.repo.WardRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class LocationService {

    private final ProvinceRepository provinces;
    private final SchoolRegistryRepository schoolRegistry;
    private final WardRepository wards;

    public LocationService(ProvinceRepository provinces,
            SchoolRegistryRepository schoolRegistry,
            WardRepository wards) {
        this.provinces = provinces;
        this.schoolRegistry = schoolRegistry;
        this.wards = wards;
    }

    public List<ProvinceDto> getProvinces() {
        return provinces.findAll().stream()
                .map(p -> new ProvinceDto(p.getCode(), p.getName(), p.getCodename()))
                .toList();
    }

    public List<WardDto> getWardsByProvince(int provinceCode) {
        return wards.findByProvinceCodeOrderByNameAsc(provinceCode).stream()
                .map(w -> new WardDto(w.getCode(), w.getName(), w.getCodename()))
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
