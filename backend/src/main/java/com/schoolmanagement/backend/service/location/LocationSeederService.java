package com.schoolmanagement.backend.service.location;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.schoolmanagement.backend.domain.entity.location.Province;
import com.schoolmanagement.backend.domain.entity.location.Ward;
import com.schoolmanagement.backend.repo.location.ProvinceRepository;
import com.schoolmanagement.backend.repo.location.WardRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Seeds province and ward data from a bundled static JSON file.
 *
 * <p>Data source: provinces.open-api.vn API V2 (post July 2025 province merger)
 * Pre-downloaded and stored at {@code src/main/resources/location-data.json}
 * to avoid slow startup from external API calls at runtime.</p>
 *
 * <p>The JSON structure is an array of provinces, each containing an embedded
 * {@code wards} array: {@code [{code, name, codename, division_type, phone_code, wards:[{...}]}]}</p>
 */
@Slf4j
@Service
public class LocationSeederService {

    private static final String LOCATION_DATA_FILE = "location-data.json";

    private final ProvinceRepository provinceRepository;
    private final WardRepository wardRepository;

    public LocationSeederService(ProvinceRepository provinceRepository, WardRepository wardRepository) {
        this.provinceRepository = provinceRepository;
        this.wardRepository = wardRepository;
    }

    /**
     * Seeds provinces and wards from the bundled static JSON file.
     * Skips if data is already seeded and looks correct.
     * Re-seeds if encoding corruption is detected (mojibake check).
     */
    public void seedLocations() {
        long totalWards = wardRepository.count();
        long wardsWithProvince = wardRepository.findAll().stream()
                .filter(w -> w.getProvinceCode() != null)
                .count();

        // Detect mojibake: check for Latin-1 artifacts from incorrect ISO-8859-1 decoding.
        // Only check for "Æ" (U+00C6) which NEVER appears in Vietnamese text — it's a
        // mojibake artifact from "Ư" or "Ơ" (UTF-8 bytes C6 B0 / C6 A1).
        // NOTE: Do NOT check for "â" (U+00E2) or "Ã" (U+00E3) — they are valid Vietnamese chars.
        boolean dataCorrupted = totalWards > 0 && wardRepository.findAll().stream()
                .limit(20)
                .anyMatch(w -> w.getName() != null && w.getName().contains("\u00c6"));

        // After 2025 merger: 34 provinces, 3321 wards

        if (totalWards >= 3321 && wardsWithProvince == totalWards && !dataCorrupted) {
            log.info("Location data already seeded ({} provinces, {} wards). Skipping.",
                    provinceRepository.count(), totalWards);
            return;
        }

        if (dataCorrupted) {
            log.warn("Detected corrupted Vietnamese location data. Re-seeding from bundled JSON...");
        } else {
            log.info("Seeding location data from bundled JSON file ({})...", LOCATION_DATA_FILE);
        }

        try {
            ClassPathResource resource = new ClassPathResource(LOCATION_DATA_FILE);
            if (!resource.exists()) {
                log.error("Location data file '{}' not found in classpath! Skipping seed.", LOCATION_DATA_FILE);
                return;
            }

            ObjectMapper mapper = new ObjectMapper();
            List<Map<String, Object>> provincesData;
            try (InputStream is = resource.getInputStream()) {
                provincesData = mapper.readValue(is, new TypeReference<>() {});
            }

            // For re-seeding corrupted data: only truncate wards (safe — nothing FKs to wards).
            // Do NOT delete provinces: the 'schools' table has a FK constraint to provinces.
            // Provinces will be upserted in-place (only 34 records, acceptable).
            if (dataCorrupted && totalWards > 0) {
                log.info("Truncating {} corrupted wards for clean re-seed (provinces will be updated in-place)...",
                        totalWards);
                wardRepository.deleteAll();
            }

            List<Province> provincesToSave = new ArrayList<>();
            List<Ward> wardsToSave = new ArrayList<>();
            int wardCount = 0;

            for (Map<String, Object> prov : provincesData) {
                int provCode = ((Number) prov.get("code")).intValue();
                String provName = (String) prov.get("name");
                String provCodename = (String) prov.get("codename");
                String provDivisionType = (String) prov.get("division_type");
                Integer provPhoneCode = prov.get("phone_code") != null
                        ? ((Number) prov.get("phone_code")).intValue()
                        : null;

                // Upsert province (only 34 total — N+1 is acceptable here).
                // Cannot delete+rebuild provinces because 'schools' table has a FK to provinces.
                Province province = provinceRepository.findById(provCode).orElse(new Province());
                province.setCode(provCode);
                province.setName(provName);
                province.setCodename(provCodename != null ? provCodename : "");
                province.setDivisionType(provDivisionType);
                province.setPhoneCode(provPhoneCode);
                provincesToSave.add(province);

                // Process embedded wards for this province
                @SuppressWarnings("unchecked")
                List<Map<String, Object>> embeddedWards = (List<Map<String, Object>>) prov.get("wards");
                if (embeddedWards != null) {
                    for (Map<String, Object> wardData : embeddedWards) {
                        int wardCode = ((Number) wardData.get("code")).intValue();
                        String wardName = (String) wardData.get("name");
                        String wardCodename = (String) wardData.get("codename");
                        String wardDivisionType = (String) wardData.get("division_type");

                        // Build ward entity directly — no findById needed
                        Ward ward = Ward.builder()
                                .code(wardCode)
                                .name(wardName)
                                .codename(wardCodename != null ? wardCodename : "")
                                .divisionType(wardDivisionType)
                                .provinceCode(provCode)
                                .build();
                        wardsToSave.add(ward);
                        wardCount++;
                    }
                }
            }

            // Bulk save — provinces first (FK constraint), then wards
            provinceRepository.saveAll(provincesToSave);
            wardRepository.saveAll(wardsToSave);

            // Clean up legacy provinces (pre-2025 merger codes no longer valid).
            // Only delete those NOT referenced by any school (FK safe).
            Set<Integer> validProvinceCodes = provincesToSave.stream()
                    .map(Province::getCode)
                    .collect(java.util.stream.Collectors.toSet());
            List<Province> legacyProvinces = provinceRepository.findAll().stream()
                    .filter(p -> !validProvinceCodes.contains(p.getCode()))
                    .collect(java.util.stream.Collectors.toList());
            if (!legacyProvinces.isEmpty()) {
                log.info("Removing {} legacy province(s) from pre-2025 structure...", legacyProvinces.size());
                for (Province legacy : legacyProvinces) {
                    try {
                        provinceRepository.delete(legacy);
                    } catch (Exception ex) {
                        log.warn("Cannot remove legacy province {} ({}): still referenced by schools — keeping it.",
                                legacy.getCode(), legacy.getName());
                    }
                }
            }

            log.info("Location seeding completed: {} provinces, {} wards (post-2025 merger data, from bundled JSON).",
                    provincesToSave.size(), wardCount);

        } catch (Exception e) {
            log.error("Failed to seed location data from bundled JSON: {}", e.getMessage(), e);
        }
    }
}
