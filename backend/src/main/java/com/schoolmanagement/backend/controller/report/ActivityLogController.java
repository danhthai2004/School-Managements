package com.schoolmanagement.backend.controller.report;

import com.schoolmanagement.backend.dto.report.ActivityLogDto;
import com.schoolmanagement.backend.service.report.ActivityLogService;
import org.springframework.data.domain.Page;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/system/activity-logs")
public class ActivityLogController {

    private final ActivityLogService activityLogService;

    public ActivityLogController(ActivityLogService activityLogService) {
        this.activityLogService = activityLogService;
    }

    @GetMapping
    public Page<ActivityLogDto> list(@RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        return activityLogService.list(page, size);
    }
}
