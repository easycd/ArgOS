package com.gte.argos.factory.store;

import com.gte.argos.factory.judge.Hazard;
import com.gte.argos.factory.judge.JudgementListener;
import com.gte.argos.factory.judge.Stage;
import java.sql.PreparedStatement;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;

/**
 * 판정 결과를 DB 에 저장한다.
 *
 * <pre>
 * - 1분 추이·이벤트 샘플은 batchSize 만큼 모아서 한 번에 넣는다 (7일치 = 큰 batch, 실시간 = 1)
 * - 이벤트·경보는 바로 넣고 받은 id 를 엔진 번호(eventKey, alarmKey)와 짝지어 둔다
 * - 다 쓴 뒤 flush() 를 꼭 불러야 남은 batch 가 들어간다
 * </pre>
 *
 * 엔진 하나에 저장소 하나. 스레드 안전하지 않다.
 */
public class JdbcJudgementStore implements JudgementListener {

    private static final String INSERT_TREND = """
            INSERT INTO sensor_trend (sensor_id, ts, avg_v, min_v, max_v, n) VALUES (?, ?, ?, ?, ?, ?)
            ON CONFLICT (sensor_id, ts) DO UPDATE
               SET avg_v = EXCLUDED.avg_v, min_v = EXCLUDED.min_v, max_v = EXCLUDED.max_v, n = EXCLUDED.n
            """;
    private static final String INSERT_SAMPLE = """
            INSERT INTO sensor_event_sample (event_id, ts, value) VALUES (?, ?, ?)
            ON CONFLICT (event_id, ts) DO NOTHING
            """;

    private final JdbcTemplate jdbc;
    private final ZoneId zone;
    private final int batchSize;

    private final List<Object[]> trendBatch = new ArrayList<>();
    private final List<Object[]> sampleBatch = new ArrayList<>();
    private final Map<Long, Long> eventIds = new HashMap<>();
    private final Map<Long, Long> alarmIds = new HashMap<>();

    private long trendCount;
    private long eventCount;
    private long alarmCount;

    public JdbcJudgementStore(JdbcTemplate jdbc, ZoneId zone, int batchSize) {
        this.jdbc = jdbc;
        this.zone = zone;
        this.batchSize = Math.max(1, batchSize);
    }

    @Override
    public void onTrend(TrendPoint p) {
        trendBatch.add(new Object[] {p.sensorId(), odt(p.minute()), p.avg(), p.min(), p.max(), p.n()});
        trendCount++;
        if (trendBatch.size() >= batchSize) {
            flushTrends();
        }
    }

    @Override
    public void onEventOpened(long eventKey, long sensorId, long thresholdId, Stage stage,
                              Instant startedAt, Instant detectedAt, boolean lowSide, List<Sample> backlog) {
        KeyHolder kh = new GeneratedKeyHolder();
        double peak = backlog.isEmpty() ? 0 : backlog.get(0).value();
        for (Sample s : backlog) {
            peak = lowSide ? Math.min(peak, s.value()) : Math.max(peak, s.value());
        }
        final double initialPeak = peak;
        jdbc.update(con -> {
            PreparedStatement ps = con.prepareStatement("""
                    INSERT INTO sensor_event (sensor_id, threshold_id, stage, rule, started_at, peak_value)
                    VALUES (?, ?, ?, 'DURATION', ?, ?)
                    """, new String[] {"event_id"});
            ps.setLong(1, sensorId);
            ps.setLong(2, thresholdId);
            ps.setInt(3, stage.code());
            ps.setObject(4, odt(startedAt));
            ps.setDouble(5, initialPeak);
            return ps;
        }, kh);
        long eventId = kh.getKey().longValue();
        eventIds.put(eventKey, eventId);
        eventCount++;
        for (Sample s : backlog) {
            addSample(eventId, s);
        }
    }

    @Override
    public void onEventSample(long eventKey, Sample sample) {
        Long eventId = eventIds.get(eventKey);
        if (eventId != null) {
            addSample(eventId, sample);
        }
    }

    @Override
    public void onEventEscalated(long eventKey, Stage stage, Instant at) {
        Long eventId = eventIds.get(eventKey);
        if (eventId != null) {
            jdbc.update("UPDATE sensor_event SET stage = ? WHERE event_id = ?", stage.code(), eventId);
        }
    }

    @Override
    public void onEventClosed(long eventKey, Instant endedAt, double peak) {
        Long eventId = eventIds.get(eventKey);
        if (eventId != null) {
            jdbc.update("UPDATE sensor_event SET ended_at = ?, peak_value = ? WHERE event_id = ?",
                    odt(endedAt), peak, eventId);
        }
    }

    @Override
    public void onAlarmOpened(long alarmKey, long unitId, Stage stage, Hazard hazard, Instant raisedAt) {
        KeyHolder kh = new GeneratedKeyHolder();
        jdbc.update(con -> {
            PreparedStatement ps = con.prepareStatement("""
                    INSERT INTO alarm (unit_id, stage, hazard, raised_at, status) VALUES (?, ?, ?, ?, 'OPEN')
                    """, new String[] {"alarm_id"});
            ps.setLong(1, unitId);
            ps.setInt(2, stage.code());
            ps.setString(3, hazard.name());
            ps.setObject(4, odt(raisedAt));
            return ps;
        }, kh);
        alarmIds.put(alarmKey, kh.getKey().longValue());
        alarmCount++;
    }

    @Override
    public void onAlarmEventLinked(long alarmKey, long eventKey) {
        Long alarmId = alarmIds.get(alarmKey);
        Long eventId = eventIds.get(eventKey);
        if (alarmId != null && eventId != null) {
            jdbc.update("INSERT INTO alarm_event (alarm_id, event_id) VALUES (?, ?) ON CONFLICT DO NOTHING",
                    alarmId, eventId);
        }
    }

    @Override
    public void onAlarmUpdated(long alarmKey, Stage stage, Hazard hazard, Instant at) {
        Long alarmId = alarmIds.get(alarmKey);
        if (alarmId != null) {
            jdbc.update("UPDATE alarm SET stage = ?, hazard = ? WHERE alarm_id = ?", stage.code(), hazard.name(), alarmId);
        }
    }

    @Override
    public void onAlarmCleared(long alarmKey, Instant at, boolean closed) {
        Long alarmId = alarmIds.get(alarmKey);
        if (alarmId != null && closed) {
            jdbc.update("UPDATE alarm SET status = 'CLOSED', closed_at = ? WHERE alarm_id = ?", odt(at), alarmId);
        }
    }

    /** 모아 둔 batch 를 모두 넣는다 */
    public void flush() {
        flushTrends();
        flushSamples();
    }

    /** 엔진 번호 → DB event_id (없으면 null) */
    public Long eventId(long eventKey) {
        return eventIds.get(eventKey);
    }

    /** 엔진 번호 → DB alarm_id (없으면 null) */
    public Long alarmId(long alarmKey) {
        return alarmIds.get(alarmKey);
    }

    public long trendCount() {
        return trendCount;
    }

    public long eventCount() {
        return eventCount;
    }

    public long alarmCount() {
        return alarmCount;
    }

    private void addSample(long eventId, Sample s) {
        sampleBatch.add(new Object[] {eventId, odt(s.ts()), s.value()});
        if (sampleBatch.size() >= batchSize) {
            flushSamples();
        }
    }

    private void flushTrends() {
        if (!trendBatch.isEmpty()) {
            jdbc.batchUpdate(INSERT_TREND, trendBatch);
            trendBatch.clear();
        }
    }

    private void flushSamples() {
        if (!sampleBatch.isEmpty()) {
            jdbc.batchUpdate(INSERT_SAMPLE, sampleBatch);
            sampleBatch.clear();
        }
    }

    private OffsetDateTime odt(Instant i) {
        return i.atZone(zone).toOffsetDateTime();
    }
}
