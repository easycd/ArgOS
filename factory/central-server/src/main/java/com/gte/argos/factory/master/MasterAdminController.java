package com.gte.argos.factory.master;

import com.gte.argos.factory.common.api.ApiResponse;
import java.util.Map;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** 공장 관리용 마스터 쓰기 (연계 → 수집 서버 internal) */
@RestController
@RequestMapping("/api/v1/internal")
public class MasterAdminController {

    private final MasterAdminService service;

    public MasterAdminController(MasterAdminService service) {
        this.service = service;
    }

    @PostMapping("/plants")
    public ApiResponse<Map<String, Object>> plant(@RequestBody Map<String, Object> b) {
        return ApiResponse.ok(service.createPlant(s(b, "name"), s(b, "code"), s(b, "address"), d(b, "lat"), d(b, "lng")));
    }

    @PostMapping("/factories")
    public ApiResponse<Map<String, Object>> factory(@RequestBody Map<String, Object> b) {
        return ApiResponse.ok(service.createFactory(((Number) b.get("siteId")).longValue(), s(b, "code"), s(b, "name")));
    }

    @PostMapping("/processes")
    public ApiResponse<Map<String, Object>> process(@RequestBody Map<String, Object> b) {
        return ApiResponse.ok(service.createProcess(((Number) b.get("factoryId")).longValue(), s(b, "code"), s(b, "name"),
                s(b, "tagPrefix")));
    }

    @GetMapping("/processes/{processId}/layout-meta")
    public ApiResponse<Map<String, Object>> meta(@PathVariable long processId) {
        return ApiResponse.ok(service.layoutMeta(processId));
    }

    @PutMapping("/processes/{processId}/layout")
    public ApiResponse<Map<String, Object>> layout(@PathVariable long processId,
                                                   @RequestBody MasterAdminService.LayoutRequest body) {
        return ApiResponse.ok(service.saveLayout(processId, body));
    }

    @PutMapping("/processes/{processId}/floorplan")
    public ApiResponse<Map<String, Object>> floorplan(@PathVariable long processId, @RequestBody Map<String, Object> b) {
        return ApiResponse.ok(service.setFloorplan(processId, s(b, "url"), d(b, "widthM"), d(b, "depthM")));
    }

    private static String s(Map<String, Object> b, String k) {
        return b.get(k) == null ? null : String.valueOf(b.get(k));
    }

    private static Double d(Map<String, Object> b, String k) {
        return b.get(k) instanceof Number n ? n.doubleValue() : null;
    }
}
