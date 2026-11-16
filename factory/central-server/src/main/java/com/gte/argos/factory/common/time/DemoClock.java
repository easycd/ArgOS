package com.gte.argos.factory.common.time;

import com.gte.argos.factory.config.ArgosProperties;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/**
 * 시연 시계. 발표 날짜와 상관없이 "그날은 2026-11-16 09:00" 으로 동작하게 한다.
 *
 * <pre>
 * 지금 = simStart + (실제 지금 − 기준을 잡은 실제 시각)
 * </pre>
 *
 * 업무 시각(이벤트, 경보, 명령)은 모두 이 시계를 쓴다.
 * TODO(Redis): 봇·연계 서버와 시각을 맞추려면 기준값(simStart, realStart)을 Redis 에 두고 셋이 같이 읽는다.
 */
@Component
public class DemoClock {

    private final Clock realClock;
    private final ZoneId zone;
    private volatile Instant simStart;
    private volatile Instant realStart;

    @Autowired
    public DemoClock(ArgosProperties props) {
        this(props.clock().simStart().toInstant(), props.zone(), Clock.systemUTC());
    }

    DemoClock(Instant simStart, ZoneId zone, Clock realClock) {
        this.realClock = realClock;
        this.zone = zone;
        this.simStart = simStart;
        this.realStart = realClock.instant();
    }

    /** 시연 시계의 지금 */
    public Instant now() {
        return simStart.plus(Duration.between(realStart, realClock.instant()));
    }

    /** 시연 시계의 지금 (시간대 포함) */
    public OffsetDateTime nowOffset() {
        return now().atZone(zone).toOffsetDateTime();
    }

    /** 시연 시작 시각 (이보다 앞은 7일치 과거 데이터) */
    public Instant simStart() {
        return simStart;
    }

    public ZoneId zone() {
        return zone;
    }

    /** 시계를 다시 simStart 로 되돌린다 (영상 다시 찍기) */
    public void restart() {
        this.realStart = realClock.instant();
    }

    /** 시작 시각 자체를 바꾸고 처음부터 */
    public void restartAt(Instant newSimStart) {
        this.simStart = newSimStart;
        this.realStart = realClock.instant();
    }
}
