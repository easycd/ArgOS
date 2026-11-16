package com.gte.argos.gateway.push;

import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;

/**
 * 앱 푸시 (FCM). 푸시는 구글 서버를 거치므로 설비 이름·센서값은 담지 않고 종류와 번호만 보낸다.
 *
 * <pre>
 * type: CHECKLIST_ASSIGNED · CHECKLIST_REMIND · CHECKLIST_REASSIGNED · WORKER_CALL · FIRE · FIRE_CLEARED
 * data: { "type": "...", "checklistId": "88" } 처럼 문자열만
 * </pre>
 *
 * TODO(FCM): Firebase 서비스 계정(FCM_CREDENTIALS_PATH)이 정해지면 firebase-admin 으로 실제 전송.
 * 지금은 로그만 남기고, 토큰이 있으면 성공으로 본다 (시연은 앱 화면을 직접 열어서 진행).
 */
@Component
public class PushSender {

    private static final Logger log = LoggerFactory.getLogger(PushSender.class);

    /** @return 보냈으면 true, 토큰이 없거나 실패면 false */
    public boolean send(String fcmToken, String type, Map<String, String> data) {
        if (fcmToken == null || fcmToken.isBlank()) {
            log.info("푸시 생략 (토큰 없음): type={} data={}", type, data);
            return false;
        }
        log.info("푸시 전송(시뮬레이션): type={} data={} token={}…", type, data,
                fcmToken.substring(0, Math.min(8, fcmToken.length())));
        return true;
    }
}
