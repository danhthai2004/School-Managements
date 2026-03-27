package com.schoolmanagement.backend.service.location;

import com.schoolmanagement.backend.domain.entity.location.Province;
import com.schoolmanagement.backend.domain.entity.location.Ward;
import com.schoolmanagement.backend.repo.location.ProvinceRepository;
import com.schoolmanagement.backend.repo.location.WardRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

@Slf4j
@Service
public class LocationSeederService {

    private static final String VN_PROVINCES_API = "https://provinces.open-api.vn/api/?depth=3";

    private final ProvinceRepository provinceRepository;
    private final WardRepository wardRepository;

    public LocationSeederService(ProvinceRepository provinceRepository, WardRepository wardRepository) {
        this.provinceRepository = provinceRepository;
        this.wardRepository = wardRepository;
    }

    /**
     * Seed provinces and wards from the VN Provinces Open API.
     * Only runs if province table is empty OR wards have no province_code set.
     */
    @SuppressWarnings("unchecked")
    public void seedLocations() {
        // Check if wards already have province_code populated
        long wardsWithProvince = wardRepository.findAll().stream()
                .filter(w -> w.getProvinceCode() != null)
                .count();
        long totalWards = wardRepository.count();

        if (totalWards > 0 && wardsWithProvince == totalWards) {
            log.info("Location data already seeded ({} wards with province_code). Skipping.", totalWards);
            return;
        }

        log.info("Seeding location data from VN Provinces API...");

        try {
            RestTemplate restTemplate = new RestTemplate();
            List<Map<String, Object>> provincesData = restTemplate.getForObject(VN_PROVINCES_API, List.class);

            if (provincesData == null || provincesData.isEmpty()) {
                log.error("No data returned from VN Provinces API");
                return;
            }

            int provinceCount = 0;
            int wardCount = 0;

            for (Map<String, Object> prov : provincesData) {
                int provCode = ((Number) prov.get("code")).intValue();
                String provName = (String) prov.get("name");
                String provCodename = (String) prov.get("codename");
                String provDivisionType = (String) prov.get("division_type");
                Integer provPhoneCode = prov.get("phone_code") != null
                        ? ((Number) prov.get("phone_code")).intValue()
                        : null;

                // Upsert province
                Province province = provinceRepository.findById(provCode)
                        .orElse(new Province());
                province.setCode(provCode);
                province.setName(provName);
                province.setCodename(provCodename != null ? provCodename : "");
                province.setDivisionType(provDivisionType);
                province.setPhoneCode(provPhoneCode);
                provinceRepository.save(province);
                provinceCount++;

                // Process districts -> wards
                List<Map<String, Object>> districts = (List<Map<String, Object>>) prov.get("districts");
                if (districts != null) {
                    for (Map<String, Object> dist : districts) {
                        int distCode = ((Number) dist.get("code")).intValue();

                        List<Map<String, Object>> wardsData = (List<Map<String, Object>>) dist.get("wards");
                        if (wardsData != null) {
                            for (Map<String, Object> wardData : wardsData) {
                                int wardCode = ((Number) wardData.get("code")).intValue();
                                String wardName = (String) wardData.get("name");
                                String wardCodename = (String) wardData.get("codename");
                                String wardDivisionType = (String) wardData.get("division_type");
                                String wardShortCodename = (String) wardData.get("short_codename");

                                Ward ward = wardRepository.findById(wardCode)
                                        .orElse(new Ward());
                                ward.setCode(wardCode);
                                ward.setName(wardName);
                                ward.setCodename(wardCodename != null ? wardCodename : "");
                                ward.setDivisionType(wardDivisionType);
                                // shortCodename and districtCode not in Ward entity
                                ward.setProvinceCode(provCode);
                                wardRepository.save(ward);
                                wardCount++;
                            }
                        }
                    }
                }
            }

            log.info("Location seeding completed: {} provinces, {} wards", provinceCount, wardCount);

        } catch (Exception e) {
            log.error("Failed to seed location data from API: {}", e.getMessage(), e);
        }
    }
}
