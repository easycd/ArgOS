package com.gte.argos.gateway.push;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * 공장 경고 방송 (방송 시스템, 외부 기존 시스템의 REST API).
 * 방송 시스템 주소와 API 가 정해지기 전까지는 로그만 남긴다 (PushSender 와 같은 방식).
 */
@Component
public class BroadcastSender {

    private static final Logger log = LoggerFactory.getLogger(BroadcastSender.class);

    /** @return 방송 시작 요청이 받아들여졌는지 */
    public boolean start(long fireId, long plantId, Long processId, String message) {
        log.info("[방송 시작] fire={} plant={} process={} : {}", fireId, plantId, processId, message);
        return true;
    }

    public boolean stop(long fireId) {
        log.info("[방송 종료] fire={}", fireId);
        return true;
    }
}
