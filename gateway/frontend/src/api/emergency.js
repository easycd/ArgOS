/**
 * 경보 · 화재 대응 API (설계 자료 API 명세서 C4 · C4F · C5, 백엔드 AlarmController · EquipmentActionController)
 * - GET  /alarms/{alarmId}/response     : 경보 대응 창 내용 (사유, 공정 센서, 설비 목록, 문제 로그)
 * - POST /equipment/{equipmentId}/shutdown : 설비 셧다운 (접수 202, 진행은 SSE command.result)
 * - POST /processes/{processId}/shutdown   : 여러 설비 · 공정 전체 셧다운
 * - POST /processes/{processId}/call-workers : 공정 담당자 호출 (긴급 푸시)
 * - POST /alarms/{alarmId}/close        : 경보 종료 (모든 센서가 경보 기준 아래일 때만)
 * - GET  /fires · /fires/{fireId}        : 진행 중 화재, 화재 현황 (백엔드에 아직 없음 → 명세서 기준)
 * - POST /fires/{fireId}/clear          : 비밀번호 다시 입력해서 화재 해제
 * - POST /fires/{fireId}/approve-unlock : 5회 틀려 잠긴 해제를 본사가 풀어 줌
 */
import http from './http'
import { USE_MOCK, mockFail, mockOk } from './mock'
import { alarmResponse, fireView } from './mock/alertData'
import { THERMAL_BY_STATE } from './mock/equipmentData'
import { MOCK_PASSWORD } from './mock/data'
import { scenario } from './mock/scenario'
import { approveUnlock as mockApprove, clearFire as mockClear, closeIncident, startShutdown, valueStillOver } from './mock/scenarioEmergency'
import { LEVEL } from '@/types/codes'

/** 경보 대응 창 내용 */
export async function getAlarmResponse(alarmId) {
  if (USE_MOCK) {
    const data = alarmResponse(alarmId)
    return data ? mockOk(data) : mockFail({ code: 'ALARM_NOT_FOUND', message: '없는 알림입니다.', status: 404 })
  }
  const data = await http.get(`/alarms/${alarmId}/response`)
  // 실제 열화상 그림(VMS)이 아직 없어서 서버는 imageUrl 없이 level 만 줌 → 단계에 맞는 예시 그림 사용 (api/alarms.js 와 같은 방식)
  // 서버가 imageUrl 을 채워 주면 그 값을 그대로 씀. thermal 자체가 없으면 창이 '열화상 없음'으로 보여 줌
  if (data.thermal && !data.thermal.imageUrl) {
    data.thermal.imageUrl = (THERMAL_BY_STATE[data.thermal.level ?? data.level] ?? THERMAL_BY_STATE[LEVEL.NORMAL]).image
  }
  return data
}

const already = () => mockFail({ code: 'COMMAND_RUNNING', message: '셧다운이 이미 진행 중입니다.', status: 409 })

/** 설비 한 대 셧다운 → { commandId, equipmentId, status: 'SENT' } */
export function shutdownEquipment(equipmentId, { alarmId, reason }) {
  if (USE_MOCK) return startShutdown([equipmentId]) ? mockOk({ commandId: 9010, equipmentId, status: 'SENT' }) : already()
  return http.post(`/equipment/${equipmentId}/shutdown`, { alarmId, reason })
}

/** 여러 설비 · 공정 전체 셧다운 (equipmentIds 를 비우면 공정 전체) */
export function shutdownProcess(processId, { alarmId, equipmentIds, reason }) {
  if (USE_MOCK) {
    const ids = equipmentIds?.length ? equipmentIds : [24, 25, 26, 27, 28, 29, 30, 31]
    return startShutdown(ids) ? mockOk({ commands: ids.map((id, i) => ({ commandId: 9010 + i, equipmentId: id })) }) : already()
  }
  return http.post(`/processes/${processId}/shutdown`, { alarmId, equipmentIds, reason })
}

/** 공정 담당자 호출 → { sentCount, failedCount } */
export function callWorkers(processId, { alarmId }) {
  if (USE_MOCK) return mockOk({ sentCount: 3, failedCount: 0 })
  return http.post(`/processes/${processId}/call-workers`, { alarmId })
}

/** 경보 종료 — 아직 경보 기준 위인 센서가 있으면 409 VALUE_STILL_OVER */
export function closeAlarm(alarmId, { result, followUp }) {
  if (USE_MOCK) {
    if (valueStillOver()) return mockFail({ code: 'VALUE_STILL_OVER', message: '아직 경보 기준 위인 센서가 있습니다.', status: 409 })
    closeIncident({ result })
    return mockOk({ id: Number(alarmId), status: 'CLOSED' })
  }
  return http.post(`/alarms/${alarmId}/close`, { result, followUp })
}

/** 진행 중 화재 목록 (본사 화재 현황) */
export function getActiveFires() {
  if (USE_MOCK) {
    const f = fireView()
    return mockOk(f && f.status === 'ACTIVE' ? [f] : [])
  }
  return http.get('/fires', { params: { status: 'ACTIVE' } })
}

/** 화재 현황 */
export function getFire(fireId) {
  if (USE_MOCK) {
    const f = fireView()
    return f && f.id === Number(fireId) ? mockOk(f) : mockFail({ code: 'NOT_FOUND', message: '없는 화재입니다.', status: 404 })
  }
  return http.get(`/fires/${fireId}`)
}

/**
 * 화재 해제 (로그인한 사람 비밀번호 다시 확인)
 * - 틀리면 401 FIRE_PASSWORD_MISMATCH (남은 횟수는 error 에), 5회면 423 FIRE_UNLOCK_LOCKED
 * - 예시 데이터: 예시 계정 비밀번호(argos1234)와 비교. 실제 서비스 비밀번호가 아님
 */
export function clearFire(fireId, { password, memo, by }) {
  if (USE_MOCK) {
    const r = mockClear({ passwordOk: password === MOCK_PASSWORD, by })
    if (r.ok) return mockOk({ id: Number(fireId), status: 'CLEARED', clearedBy: by })
    if (r.locked) return mockFail({ code: 'FIRE_UNLOCK_LOCKED', message: '5회 틀렸습니다. 본사 관리자 승인을 받은 뒤 다시 시도할 수 있습니다.', status: 423 })
    return mockFail({ code: 'FIRE_PASSWORD_MISMATCH', message: `비밀번호가 맞지 않습니다. 다시 입력해 주세요. (${scenario.fire.failCount}/5)`, status: 401 })
  }
  return http.post(`/fires/${fireId}/clear`, { password, memo })
}

/** 본사 승인으로 해제 잠금 풀기 */
export function approveFireUnlock(fireId) {
  if (USE_MOCK) {
    mockApprove()
    return mockOk({ id: Number(fireId), unlock: { failCount: 0, locked: false } })
  }
  return http.post(`/fires/${fireId}/approve-unlock`)
}
