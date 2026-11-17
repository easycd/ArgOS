package com.gte.argos.gateway.thermal;

import com.gte.argos.gateway.common.api.ApiResponse;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/**
 * 열화상 최신 값 (B4 설비 상세의 열화상 카드).
 *
 * <pre>
 * GET /api/v1/thermal/{cameraId}/latest?equipmentId=41
 * </pre>
 * cameraId 는 IR 센서 id 다 ({@code GET /equipment/{id}} 의 cameraId).
 */
@RestController
@RequestMapping("/api/v1")
public class ThermalController {

    private final ThermalService service;

    public ThermalController(ThermalService service) {
        this.service = service;
    }

    @GetMapping("/thermal/{cameraId}/latest")
    public ApiResponse<Map<String, Object>> latest(@PathVariable long cameraId,
                                                   @RequestParam(required = false) Long equipmentId) {
        return ApiResponse.ok(service.latest(cameraId, equipmentId));
    }
}
