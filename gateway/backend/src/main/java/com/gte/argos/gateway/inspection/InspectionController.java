package com.gte.argos.gateway.inspection;

import com.gte.argos.gateway.access.CurrentUser;
import com.gte.argos.gateway.access.UserScope;
import com.gte.argos.gateway.common.api.ApiResponse;
import java.util.List;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 오늘 점검 (B3 공정 화면의 '오늘 점검' 카드).
 *
 * <pre>
 * GET /api/v1/inspections/today?processId=12
 *   → { doneCount, totalCount, items: [{ scheduleId, time, equipmentName, title, assignee, status }] }
 * </pre>
 * 점검·OCR 기능(/inspections/*)은 아직 없어서 지금은 빈 목록을 준다.
 * 화면이 오류 없이 '오늘 점검 없음'으로 보이도록 자리만 잡아 둔 것.
 */
@RestController
@RequestMapping("/api/v1")
public class InspectionController {

    private final CurrentUser currentUser;

    public InspectionController(CurrentUser currentUser) {
        this.currentUser = currentUser;
    }

    @GetMapping("/inspections/today")
    public ApiResponse<Map<String, Object>> today(@RequestParam long processId) {
        UserScope scope = currentUser.scope();
        currentUser.checkProcess(scope, processId);
        return ApiResponse.ok(Map.of("doneCount", 0, "totalCount", 0, "items", List.of()));
    }
}
