package com.schoolmanagement.backend.controller;

import com.schoolmanagement.backend.domain.entity.SchoolLevel;
import com.schoolmanagement.backend.dto.ProvinceDto;
import com.schoolmanagement.backend.dto.SchoolRegistryDto;
import com.schoolmanagement.backend.dto.WardDto;
import com.schoolmanagement.backend.service.LocationService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/locations")
public class LocationController {

    private final LocationService locationService;

    public LocationController(LocationService locationService) {
        this.locationService = locationService;
    }

    @GetMapping("/provinces")
    public List<ProvinceDto> getProvinces() {
        return locationService.getProvinces();
    }

    @GetMapping("/wards")
    public List<WardDto> getWardsByProvince(@RequestParam int provinceCode) {
        return locationService.getWardsByProvince(provinceCode);
    }

    @GetMapping("/schools/registry")
    public List<SchoolRegistryDto> getSchoolRegistry(
            @RequestParam Integer provinceCode,
            @RequestParam(required = false) SchoolLevel level) {
        return locationService.getSchoolRegistry(provinceCode, level);
    }
}
