package com.gte.argos.gateway.inspection;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * CLOVA OCR 연결 전 시연용 인식기. 양식 칸마다 그럴듯한 값을 채우고, 숫자 칸 하나는 '확인 필요'로 표시한다.
 * 실제 글자를 읽지 않는다 (README 에 명시).
 */
public class SampleOcrEngine implements OcrEngine {

    private final String today;

    public SampleOcrEngine(String today) {
        this.today = today;
    }

    @Override
    public String name() {
        return "SAMPLE";
    }

    @Override
    public Result recognize(byte[] file, String mime, String fileName, Form form) {
        List<Map<String, Object>> out = new ArrayList<>();
        boolean flagged = false;
        int i = 0;
        for (Map<String, Object> f : form.fields()) {
            String key = String.valueOf(f.get("key"));
            String type = String.valueOf(f.get("type"));
            Map<String, Object> v = new LinkedHashMap<>();
            v.put("key", key);
            v.put("label", f.get("label"));
            v.put("value", sample(key, type));
            v.put("box", List.of(0.52, round(0.18 + i * 0.13), 0.22, 0.03));
            boolean check = !flagged && "number".equals(type);
            v.put("needCheck", check);
            if (check) {
                v.put("reason", "숫자 1과 7이 비슷하게 쓰임");
                flagged = true;
            }
            out.add(v);
            i++;
        }
        return new Result(out, 0.86);
    }

    private String sample(String key, String type) {
        if ("date".equals(type)) {
            return today;
        }
        return switch (key) {
            case "o2" -> "20.8";
            case "co" -> "7";
            case "lel" -> "3";
            case "fanCurrent" -> "25.1";
            case "setTemp" -> "180";
            case "measuredTemp" -> "182";
            case "extinguisherCount" -> "6";
            case "place", "location" -> "도장 공정 상도 건조로";
            case "equipment", "oven" -> "상도 건조로";
            case "damper" -> "정상";
            case "pressureOk" -> "정상";
            default -> "number".equals(type) ? "0" : "김도현";
        };
    }

    private static double round(double v) {
        return Math.round(v * 100) / 100.0;
    }
}
