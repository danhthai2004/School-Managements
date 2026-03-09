package com.schoolmanagement.backend.service.admin;

import com.schoolmanagement.backend.domain.entity.admin.SchoolLevel;
import com.schoolmanagement.backend.domain.entity.admin.SchoolRegistry;
import com.schoolmanagement.backend.repo.admin.SchoolRegistryRepository;
import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class SchoolRegistryInitService {

    private static final Logger log = LoggerFactory.getLogger(SchoolRegistryInitService.class);

    private final SchoolRegistryRepository registryRepository;

    @Value("${app.init-school-registry:true}")
    private boolean initSchoolRegistry;

    public SchoolRegistryInitService(SchoolRegistryRepository registryRepository) {
        this.registryRepository = registryRepository;
    }

    @PostConstruct
    public void init() {
        if (!initSchoolRegistry) {
            log.info("School registry initialization disabled");
            return;
        }

        if (registryRepository.count() > 0) {
            log.info("School registry already exists, skipping initialization");
            return;
        }

        log.info("Initializing sample school registry data...");

        // Hà Nội (province code = 1) - THPT
        List<SchoolRegistry> hanoiThpt = List.of(
                createRegistry("001", "THPT Chu Văn An", 1, SchoolLevel.HIGH_SCHOOL, "KV1"),
                createRegistry("002", "THPT Việt Đức", 1, SchoolLevel.HIGH_SCHOOL, "KV1"),
                createRegistry("003", "THPT Kim Liên", 1, SchoolLevel.HIGH_SCHOOL, "KV1"),
                createRegistry("004", "THPT Trần Phú", 1, SchoolLevel.HIGH_SCHOOL, "KV1"),
                createRegistry("005", "THPT Phan Đình Phùng", 1, SchoolLevel.HIGH_SCHOOL, "KV1"),
                createRegistry("006", "THPT Nguyễn Trãi", 1, SchoolLevel.HIGH_SCHOOL, "KV1"),
                createRegistry("007", "THPT Yên Hòa", 1, SchoolLevel.HIGH_SCHOOL, "KV1"),
                createRegistry("008", "THPT Cầu Giấy", 1, SchoolLevel.HIGH_SCHOOL, "KV1"),
                createRegistry("009", "THPT Đống Đa", 1, SchoolLevel.HIGH_SCHOOL, "KV1"),
                createRegistry("010", "THPT Hai Bà Trưng", 1, SchoolLevel.HIGH_SCHOOL, "KV1"));
        registryRepository.saveAll(hanoiThpt);

        // Hà Nội - THCS
        List<SchoolRegistry> hanoiThcs = List.of(
                createRegistry("101", "THCS Trưng Vương", 1, SchoolLevel.SECONDARY, "KV1"),
                createRegistry("102", "THCS Đoàn Thị Điểm", 1, SchoolLevel.SECONDARY, "KV1"),
                createRegistry("103", "THCS Nguyễn Du", 1, SchoolLevel.SECONDARY, "KV1"),
                createRegistry("104", "THCS Lê Quý Đôn", 1, SchoolLevel.SECONDARY, "KV1"),
                createRegistry("105", "THCS Cầu Giấy", 1, SchoolLevel.SECONDARY, "KV1"));
        registryRepository.saveAll(hanoiThcs);

        // Hà Nội - Tiểu học
        List<SchoolRegistry> hanoiPrimary = List.of(
                createRegistry("201", "Tiểu học Kim Đồng", 1, SchoolLevel.PRIMARY, "KV1"),
                createRegistry("202", "Tiểu học Thành Công", 1, SchoolLevel.PRIMARY, "KV1"),
                createRegistry("203", "Tiểu học Bạch Mai", 1, SchoolLevel.PRIMARY, "KV1"),
                createRegistry("204", "Tiểu học Cát Linh", 1, SchoolLevel.PRIMARY, "KV1"),
                createRegistry("205", "Tiểu học Ba Đình", 1, SchoolLevel.PRIMARY, "KV1"));
        registryRepository.saveAll(hanoiPrimary);

        // TP. HCM (province code = 79) - THPT
        List<SchoolRegistry> hcmThpt = List.of(
                createRegistry("HCM001", "THPT Lê Hồng Phong", 79, SchoolLevel.HIGH_SCHOOL, "KV1"),
                createRegistry("HCM002", "THPT Nguyễn Thị Minh Khai", 79, SchoolLevel.HIGH_SCHOOL, "KV1"),
                createRegistry("HCM003", "THPT Trần Đại Nghĩa", 79, SchoolLevel.HIGH_SCHOOL, "KV1"),
                createRegistry("HCM004", "THPT Bùi Thị Xuân", 79, SchoolLevel.HIGH_SCHOOL, "KV1"),
                createRegistry("HCM005", "THPT Marie Curie", 79, SchoolLevel.HIGH_SCHOOL, "KV1"));
        registryRepository.saveAll(hcmThpt);

        log.info("School registry initialized with {} schools", registryRepository.count());
    }

    private SchoolRegistry createRegistry(String code, String name, Integer provinceCode,
            SchoolLevel level, String enrollmentArea) {
        return SchoolRegistry.builder()
                .code(code)
                .name(name)
                .provinceCode(provinceCode)
                .schoolLevel(level)
                .enrollmentArea(enrollmentArea)
                .build();
    }
}
