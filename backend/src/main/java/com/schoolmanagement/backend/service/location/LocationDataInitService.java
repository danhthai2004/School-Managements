package com.schoolmanagement.backend.service.location;

import com.schoolmanagement.backend.domain.entity.location.Province;
import com.schoolmanagement.backend.repo.location.ProvinceRepository;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

@Service
public class LocationDataInitService {

    private static final Logger log = LoggerFactory.getLogger(LocationDataInitService.class);
    private static final String PROVINCES_API = "https://provinces.open-api.vn/api/v2/?depth=2";

    private final ProvinceRepository provinceRepository;
    private final RestTemplate restTemplate;

    @Value("${app.init-location-data:true}")
    private boolean initLocationData;

    public LocationDataInitService(ProvinceRepository provinceRepository) {
        this.provinceRepository = provinceRepository;
        this.restTemplate = new RestTemplate();
    }

    @PostConstruct
    public void init() {
        if (!initLocationData) {
            log.info("Location data initialization disabled");
            return;
        }

        if (provinceRepository.count() > 0) {
            log.info("Location data already exists, skipping initialization");
            return;
        }

        log.info("Fetching location data from provinces.open-api.vn...");
        try {
            List<Map<String, Object>> provinces = restTemplate.exchange(
                    PROVINCES_API,
                    HttpMethod.GET,
                    null,
                    new ParameterizedTypeReference<List<Map<String, Object>>>() {
                    }).getBody();

            if (provinces == null || provinces.isEmpty()) {
                log.warn("No province data received from API");
                return;
            }

            for (Map<String, Object> p : provinces) {
                Province province = Province.builder()
                        .code((Integer) p.get("code"))
                        .name((String) p.get("name"))
                        .codename((String) p.get("codename"))
                        .divisionType((String) p.get("division_type"))
                        .phoneCode((Integer) p.get("phone_code"))
                        .build();
                provinceRepository.save(province);
            }

            log.info("Location data initialized: {} provinces", provinceRepository.count());
        } catch (Exception e) {
            log.error("Failed to fetch location data: {}", e.getMessage());
        }
    }
}
