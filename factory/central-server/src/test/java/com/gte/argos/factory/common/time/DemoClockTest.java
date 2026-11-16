package com.gte.argos.factory.common.time;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;

class DemoClockTest {

    private static final Instant SIM_START = Instant.parse("2026-11-16T00:00:00Z"); // 09:00 KST

    @Test
    void 켜진_순간이_시연_시작_시각이고_실제로_흐른_만큼_간다() {
        MutableClock real = new MutableClock(Instant.parse("2026-11-24T05:00:00Z"));
        DemoClock clock = new DemoClock(SIM_START, ZoneId.of("Asia/Seoul"), real);

        assertThat(clock.now()).isEqualTo(SIM_START);

        real.advance(Duration.ofMinutes(3));
        assertThat(clock.now()).isEqualTo(SIM_START.plus(Duration.ofMinutes(3)));
        assertThat(clock.nowOffset().getHour()).isEqualTo(9);
        assertThat(clock.nowOffset().getMinute()).isEqualTo(3);
    }

    @Test
    void 다시_시작하면_시연_시작_시각으로_돌아간다() {
        MutableClock real = new MutableClock(Instant.parse("2026-11-24T05:00:00Z"));
        DemoClock clock = new DemoClock(SIM_START, ZoneId.of("Asia/Seoul"), real);
        real.advance(Duration.ofMinutes(10));

        clock.restart();

        assertThat(clock.now()).isEqualTo(SIM_START);
    }

    private static final class MutableClock extends Clock {
        private Instant now;

        MutableClock(Instant now) {
            this.now = now;
        }

        void advance(Duration d) {
            now = now.plus(d);
        }

        @Override
        public ZoneId getZone() {
            return ZoneOffset.UTC;
        }

        @Override
        public Clock withZone(ZoneId zone) {
            return this;
        }

        @Override
        public Instant instant() {
            return now;
        }
    }
}
