package com.gte.argos.factory.command;

import com.gte.argos.factory.common.api.ApiException;
import com.gte.argos.factory.common.time.DemoClock;
import com.gte.argos.factory.live.LiveFeed;
import jakarta.annotation.PreDestroy;
import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 설비 명령 (배기팬 켜기·끄기·RPM, 셧다운, 재가동).
 *
 * <pre>
 * 연계 서버 → POST /internal/equipment/{id}/commands → 허용 목록·상태 검사 → equipment_command 기록 (PENDING)
 *   → 설비 응답 (지금은 시뮬레이션: 팬 1초, 셧다운 3초 뒤 완료) → result OK, equipment.run_state·fan_rpm 반영
 *   → 피드 COMMAND_RESULT (SENT → RUNNING → DONE)
 * </pre>
 *
 * 실제 설비가 없으므로 응답은 시뮬레이션이다. 센서값을 바꾸지는 않는다 (값 회복은 봇에 직접 명령).
 * TODO(Redis): DAS 설계가 나오면 여기서 봇(미니 PC)에 명령을 전달하고, 봇 응답으로 완료 처리한다.
 */
@Service
public class EquipmentCommandService {

    /** 허용된 명령만 받는다 */
    public static final List<String> ALLOWED = List.of("FAN_ON", "FAN_OFF", "FAN_RPM", "SHUTDOWN", "RESTART");
    public static final int RPM_MIN = 600;
    public static final int RPM_MAX = 1800;
    private static final int FAN_DEFAULT_RPM = 1200;

    private static final Logger log = LoggerFactory.getLogger(EquipmentCommandService.class);

    private final JdbcTemplate jdbc;
    private final DemoClock clock;
    private final LiveFeed feed;
    private final ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor(r -> {
        Thread t = new Thread(r, "equipment-command");
        t.setDaemon(true);
        return t;
    });

    public EquipmentCommandService(JdbcTemplate jdbc, DemoClock clock, LiveFeed feed) {
        this.jdbc = jdbc;
        this.clock = clock;
        this.feed = feed;
    }

    @Transactional
    public CommandResult request(long equipmentId, String command, Double value, Long alarmId, Long userId) {
        if (command == null || !ALLOWED.contains(command)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "COMMAND_NOT_ALLOWED", "허용되지 않은 명령입니다.");
        }
        List<EquipmentRow> rows = jdbc.query(
                "SELECT equipment_id, equipment_type, run_state, fan_rpm FROM equipment WHERE equipment_id = ? AND is_active",
                (rs, i) -> new EquipmentRow(rs.getLong("equipment_id"), rs.getString("equipment_type"),
                        rs.getString("run_state"), rs.getObject("fan_rpm", Integer.class)), equipmentId);
        if (rows.isEmpty()) {
            throw ApiException.notFound("EQUIPMENT_NOT_FOUND", "없는 설비입니다.");
        }
        EquipmentRow eq = rows.get(0);
        boolean fanCommand = command.startsWith("FAN_");
        if (fanCommand && !"FAN".equals(eq.type())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "NOT_A_FAN", "배기팬이 아닌 설비입니다.");
        }
        if (fanCommand && !"RUN".equals(eq.runState())) {
            throw ApiException.conflict("EQUIPMENT_STOPPED", "셧다운된 설비입니다.");
        }
        if ("FAN_RPM".equals(command)
                && (value == null || value < RPM_MIN || value > RPM_MAX)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "RPM_OUT_OF_RANGE",
                    "RPM 은 " + RPM_MIN + " ~ " + RPM_MAX + " 사이여야 합니다.");
        }
        if ("SHUTDOWN".equals(command) && !"RUN".equals(eq.runState())) {
            throw ApiException.conflict("ALREADY_STOPPED", "이미 정지된 설비입니다.");
        }
        if ("RESTART".equals(command) && "RUN".equals(eq.runState())) {
            throw ApiException.conflict("ALREADY_RUNNING", "이미 가동 중인 설비입니다.");
        }

        OffsetDateTime now = clock.nowOffset();
        Long commandId = jdbc.queryForObject("""
                INSERT INTO equipment_command (equipment_id, alarm_id, command, value, result, requested_by, requested_at)
                VALUES (?, ?, ?, ?, 'PENDING', ?, ?) RETURNING command_id
                """, Long.class, equipmentId, alarmId, command, value, userId, now);

        String runState = eq.runState();
        if ("SHUTDOWN".equals(command)) {
            runState = "STOPPING";
            jdbc.update("UPDATE equipment SET run_state = 'STOPPING' WHERE equipment_id = ?", equipmentId);
        }
        publish(commandId, equipmentId, command, "SENT", runState, eq.fanRpm(), now);

        long delayMs = "SHUTDOWN".equals(command) || "RESTART".equals(command) ? 3_000 : 1_000;
        scheduler.schedule(() -> complete(commandId, equipmentId, command, value), delayMs, TimeUnit.MILLISECONDS);
        return new CommandResult(commandId, equipmentId, command, "SENT", runState, eq.fanRpm());
    }

    /** 명령 한 건 조회 */
    public CommandResult find(long commandId) {
        List<CommandResult> rows = jdbc.query("""
                SELECT c.command_id, c.equipment_id, c.command, c.result, e.run_state, e.fan_rpm
                FROM equipment_command c JOIN equipment e ON e.equipment_id = c.equipment_id
                WHERE c.command_id = ?
                """, (rs, i) -> new CommandResult(rs.getLong("command_id"), rs.getLong("equipment_id"),
                rs.getString("command"), status(rs.getString("result")), rs.getString("run_state"),
                rs.getObject("fan_rpm", Integer.class)), commandId);
        if (rows.isEmpty()) {
            throw ApiException.notFound("COMMAND_NOT_FOUND", "없는 명령입니다.");
        }
        return rows.get(0);
    }

    /** 설비 응답 (시뮬레이션) */
    private void complete(long commandId, long equipmentId, String command, Double value) {
        try {
            String runState;
            Integer rpm;
            switch (command) {
                case "SHUTDOWN" -> {
                    runState = "STOPPED";
                    jdbc.update("UPDATE equipment SET run_state = 'STOPPED', "
                            + "fan_rpm = CASE WHEN equipment_type = 'FAN' THEN 0 ELSE fan_rpm END WHERE equipment_id = ?",
                            equipmentId);
                }
                case "RESTART" -> {
                    runState = "RUN";
                    jdbc.update("UPDATE equipment SET run_state = 'RUN', "
                            + "fan_rpm = CASE WHEN equipment_type = 'FAN' THEN ? ELSE fan_rpm END WHERE equipment_id = ?",
                            FAN_DEFAULT_RPM, equipmentId);
                }
                case "FAN_OFF" -> {
                    runState = "RUN";
                    jdbc.update("UPDATE equipment SET fan_rpm = 0 WHERE equipment_id = ?", equipmentId);
                }
                case "FAN_ON" -> {
                    runState = "RUN";
                    jdbc.update("UPDATE equipment SET fan_rpm = ? WHERE equipment_id = ? AND COALESCE(fan_rpm, 0) = 0",
                            FAN_DEFAULT_RPM, equipmentId);
                }
                default -> { // FAN_RPM
                    runState = "RUN";
                    jdbc.update("UPDATE equipment SET fan_rpm = ? WHERE equipment_id = ?",
                            value == null ? FAN_DEFAULT_RPM : value.intValue(), equipmentId);
                }
            }
            OffsetDateTime now = clock.nowOffset();
            jdbc.update("UPDATE equipment_command SET result = 'OK', completed_at = ? WHERE command_id = ?", now, commandId);
            rpm = jdbc.queryForObject("SELECT fan_rpm FROM equipment WHERE equipment_id = ?", Integer.class, equipmentId);
            publish(commandId, equipmentId, command, "DONE", runState, rpm, now);
        } catch (RuntimeException e) {
            log.error("설비 명령 {} 완료 처리 실패", commandId, e);
            jdbc.update("UPDATE equipment_command SET result = 'FAIL', completed_at = ? WHERE command_id = ?",
                    clock.nowOffset(), commandId);
            publish(commandId, equipmentId, command, "FAILED", null, null, clock.nowOffset());
        }
    }

    private void publish(long commandId, long equipmentId, String command, String status, String runState,
                         Integer fanRpm, OffsetDateTime at) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("commandId", commandId);
        data.put("equipmentId", equipmentId);
        data.put("command", command);
        data.put("status", status);
        data.put("runState", runState);
        data.put("fanRpm", fanRpm);
        feed.append("COMMAND_RESULT", at, data);
    }

    private static String status(String result) {
        return switch (result) {
            case "OK" -> "DONE";
            case "FAIL" -> "FAILED";
            default -> "SENT";
        };
    }

    @PreDestroy
    void shutdown() {
        scheduler.shutdownNow();
    }

    private record EquipmentRow(long id, String type, String runState, Integer fanRpm) {
    }

    /**
     * @param status SENT | DONE | FAILED
     */
    public record CommandResult(long commandId, long equipmentId, String command, String status, String runState,
                                Integer fanRpm) {
    }
}
