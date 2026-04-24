package com.schoolmanagement.backend.service.location;

import com.schoolmanagement.backend.repo.location.ProvinceRepository;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/**
 * @deprecated Province and ward seeding is now handled by
 *             {@link LocationSeederService}
 *             which reads from a bundled static JSON file (location-data.json)
 *             via {@code SeedDataRunner}.
 *             This class is kept as a no-op stub to avoid breaking the Spring
 *             context.
 */
@Service
@Deprecated(since = "2025-07", forRemoval = true)
public class LocationDataInitService {

    private static final Logger log = LoggerFactory.getLogger(LocationDataInitService.class);

    public LocationDataInitService() {
    }

    /**
     * No-op. Location data is seeded by {@link LocationSeederService} via
     * SeedDataRunner.
     */
    @PostConstruct
    public void init() {
        log.debug(
                "LocationDataInitService.init() skipped — seeding is handled by LocationSeederService via SeedDataRunner.");
    }
}
