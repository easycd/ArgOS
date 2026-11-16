package com.gte.argos.gateway.equipment;

import com.gte.argos.gateway.access.CurrentUser;
import com.gte.argos.gateway.access.UserScope;
import com.gte.argos.gateway.alarm.AlarmService;
import com.gte.argos.gateway.central.CentralClient;
import com.gte.argos.gateway.central.CentralDto.Alarm;
import com.gte.argos.gateway.central.CentralDto.CommandResult;
import com.gte.argos.gateway.central.CentralDto.Equipment;
import com.gte.argos.gateway.central.MasterCache;
import com.gte.argos.gateway.central.SimTime;
import com.gte.argos.gateway.checklist.ChecklistRepository;
import com.gte.argos.gateway.checklist.ChecklistRepository.Worker;
import com.gte.argos.gateway.common.ActivityLogger;
import com.gte.argos.gateway.common.api.ApiException;
import com.gte.argos.gateway.push.PushSender;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

/**
 * 설비 조작 (API 명세서 B3-3 배기팬, C4-2·3 셧다운, C4-4 공정 담당자 호출).
 * 명령은 중앙 서버로 넘기고 바로 202 를 돌려준다. 결과는 SSE command.result.
 * 공장 담당자만 할 수 있다 (본사 관리자는 열람만).
 */
@Service
public class EquipmentActionService {

    private final CentralClient central;
    private final MasterCache masterCache;
    private final CurrentUser currentUser;
    private final AlarmService alarms;
    private final ChecklistRepository repo;
    private final PushSender push;
    private final ActivityLogger activity;
    private final SimTime time;

    public EquipmentActionService(CentralClient central, MasterCache masterCache, CurrentUser currentUser,
                                  AlarmService alarms, ChecklistRepository repo, PushSender push,
                                  ActivityLogger activity, SimTime time) {
        this.central = central;
        this.masterCache = masterCache;
        this.currentUser = currentUser;
        this.alarms = alarms;
        this.repo = repo;
        this.push = push;
        this.activity = activity;
        this.time = time;
    }

    /** POST /equipment/{id}/fan — { power: ON|OFF } 또는 { rpm: 600~1800 } */
    public Map<String, Object> fan(long equipmentId, String power, Integer rpm) {
        UserScope scope = currentUser.require(UserScope.PLANT_ADMIN);
        Equipment eq = equipment(scope, equipmentId);
        String command;
        Double value = null;
        String summary;
        if (rpm != null) {
            command = "FAN_RPM";
            value = rpm.doubleValue();
            summary = eq.name() + " RPM " + rpm;
        } else if ("OFF".equals(power)) {
            command = "FAN_OFF";
            summary = eq.name() + " 끄기";
        } else if ("ON".equals(power)) {
            command = "FAN_ON";
            summary = eq.name() + " 켜기";
        } else {
            throw new IllegalArgumentException("power 또는 rpm 이 필요합니다");
        }
        CommandResult r = central.command(equipmentId, command, value, null, scope.userId());
        activity.log(scope.userId(), "FAN", plantOf(eq), eq.processId(), "equipment", equipmentId, summary);
        return accepted(r);
    }

    /** POST /equipment/{id}/shutdown — { alarmId, reason } */
    public Map<String, Object> shutdown(long equipmentId, Long alarmId, String reason) {
        UserScope scope = currentUser.require(UserScope.PLANT_ADMIN);
        Equipment eq = equipment(scope, equipmentId);
        return shutdownOne(scope, eq, alarmId, reason);
    }

    /** POST /processes/{id}/shutdown — { alarmId, equipmentIds(비우면 공정 전체), reason } */
    public Map<String, Object> shutdownProcess(long processId, Long alarmId, List<Long> equipmentIds, String reason) {
        UserScope scope = currentUser.require(UserScope.PLANT_ADMIN);
        currentUser.checkProcess(scope, processId);
        MasterCache.Snapshot m = masterCache.get();
        List<Equipment> targets = new ArrayList<>();
        if (equipmentIds == null || equipmentIds.isEmpty()) {
            for (Equipment e : m.equipmentOf(processId)) {
                if (!"CAMERA".equals(e.type()) && "RUN".equals(e.runState())) {
                    targets.add(e);
                }
            }
        } else {
            for (Long id : equipmentIds) {
                Equipment e = m.equipment(id);
                if (e == null || e.processId() != processId) {
                    throw ApiException.notFound("EQUIPMENT_NOT_FOUND", "이 공정의 설비가 아닙니다: " + id);
                }
                targets.add(e);
            }
        }
        List<Map<String, Object>> commands = new ArrayList<>();
        for (Equipment e : targets) {
            try {
                Map<String, Object> r = shutdownOne(scope, e, alarmId, reason);
                commands.add(Map.of("commandId", r.get("commandId"), "equipmentId", e.id()));
            } catch (ApiException ex) {
                if (!"ALREADY_STOPPED".equals(ex.code())) {
                    throw ex;
                }
            }
        }
        return Map.of("commands", commands);
    }

    /** POST /processes/{id}/call-workers — { alarmId } */
    public Map<String, Object> callWorkers(long processId, Long alarmId) {
        UserScope scope = currentUser.require(UserScope.PLANT_ADMIN);
        currentUser.checkProcess(scope, processId);
        int sent = 0;
        int failed = 0;
        for (Worker w : repo.workers(processId)) {
            Map<String, String> data = new LinkedHashMap<>();
            data.put("type", "WORKER_CALL");
            data.put("processId", String.valueOf(processId));
            if (alarmId != null) {
                data.put("alarmId", String.valueOf(alarmId));
            }
            if (push.send(repo.fcmToken(w.id()), "WORKER_CALL", data)) {
                sent++;
            } else {
                failed++;
            }
        }
        if (alarmId != null) {
            repo.addAction(alarmId, "CALL", sent + "명", failed == 0 ? "OK" : "FAIL", null, scope.userId(), time.now());
        }
        return Map.of("sentCount", sent, "failedCount", failed);
    }

    // ---------------------------------------------------------------

    private Map<String, Object> shutdownOne(UserScope scope, Equipment eq, Long alarmId, String reason) {
        if (alarmId != null) {
            Alarm a = alarms.visibleAlarm(alarmId);
            if (a.processId() != eq.processId()) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "ALARM_MISMATCH", "다른 공정의 알림입니다.");
            }
        }
        CommandResult r = central.command(eq.id(), "SHUTDOWN", null, alarmId, scope.userId());
        if (alarmId != null) {
            repo.addAction(alarmId, "SHUTDOWN", eq.name(), "PENDING", reason, scope.userId(), time.now());
            try {
                central.actingAlarm(alarmId, scope.userId());
            } catch (ApiException ignored) {
                // 이미 종료된 경보면 상태는 그대로
            }
        }
        activity.log(scope.userId(), "SHUTDOWN", plantOf(eq), eq.processId(), "equipment", eq.id(),
                eq.name() + " 셧다운" + (reason == null || reason.isBlank() ? "" : " (" + reason + ")"));
        return accepted(r);
    }

    private Equipment equipment(UserScope scope, long equipmentId) {
        Equipment eq = masterCache.get().equipment(equipmentId);
        if (eq == null) {
            throw ApiException.notFound("EQUIPMENT_NOT_FOUND", "없는 설비입니다.");
        }
        currentUser.checkProcess(scope, eq.processId());
        return eq;
    }

    private Long plantOf(Equipment eq) {
        MasterCache.Snapshot m = masterCache.get();
        Long f = m.factoryOfProcess(eq.processId());
        return f == null ? null : m.plantOfFactory(f);
    }

    private static Map<String, Object> accepted(CommandResult r) {
        Map<String, Object> out = new LinkedHashMap<>();
        out.put("commandId", r.commandId());
        out.put("equipmentId", r.equipmentId());
        out.put("status", r.status());
        return out;
    }
}
