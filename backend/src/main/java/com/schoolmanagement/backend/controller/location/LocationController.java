package com.schoolmanagement.backend.controller.location;

import com.schoolmanagement.backend.domain.entity.admin.SchoolLevel;
import com.schoolmanagement.backend.dto.location.ProvinceDto;
import com.schoolmanagement.backend.dto.admin.SchoolRegistryDto;
import com.schoolmanagement.backend.service.location.LocationService;
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

    @GetMapping("/schools/registry")
    public List<SchoolRegistryDto> getSchoolRegistry(
            @RequestParam Integer provinceCode,
            @RequestParam(required = false) SchoolLevel level) {
        return locationService.getSchoolRegistry(provinceCode, level);
    }
}
