/**
 * 알림 대응(주의) 예시 응답 — 모두 예시 상황(scenario.js)에서 만듦
 * - 응답 모양: API 명세서 C1·C2 와 백엔드 gateway/backend 의 AlarmService·ChecklistService 응답 필드
 *   GET /alarms/{id}          : 조치 내역(timeline)
 *   GET /alarms/{id}/detail   : 주의 상세 (원인, 그때 센서값, 열화상 1장, 추이, 원인 후보)
 *   GET /checklists/{id}      : 체크리스트 한 건
 */
import { alarmTrendPoints } from './equipmentSeries'
import { mockAlarms, todayAt } from './data'
import { TOP_OVEN_VALUES, scenario, scenarioNow, workerName } from './scenario'
import { LEVEL } from '@/types/codes'
import irWarn from '@/assets/images/thermal/ir_warn.jpg'

const pad = (n) => String(n).padStart(2, '0')
/** 'HH:mm:ss' + 초 */
function addSec(time, sec) {
  const [h, m, s] = time.split(':').map(Number)
  const t = h * 3600 + m * 60 + s + sec
  return `${pad(Math.floor(t / 3600) % 24)}:${pad(Math.floor(t / 60) % 60)}:${pad(t % 60)}`
}

/* ───────── GET /alarms/{id} : 조치 내역 ─────────
 * timeline[]: { step, at, by, text } — step 은 백엔드와 같은 이름
 *   RAISED 발생 · ACK 확인 · CHECKLIST 체크리스트 전송 · REASSIGN 담당자 변경 · REPORT 완료 보고 · CONFIRM 조치 확인
 */
const step = (name, time, by = null, text = '') => ({ step: name, at: todayAt(time), by, text })

/** 상도 건조로 주의 (예시 상황 그대로) */
function topOvenTimeline() {
  const a = scenario.alarm
  const c = scenario.checklist
  const list = [step('RAISED', a.raisedAt, null, '발생')]
  if (a.ackedAt) list.push(step('ACK', a.ackedAt, a.ackedBy, '알림 확인'))
  if (c) {
    list.push(step('CHECKLIST', c.sentAt, c.sentBy, `체크리스트 전송 → ${workerName(c.reassigned[0]?.from ?? c.assigneeId)}`))
    c.reassigned.forEach((r) => list.push(step('REASSIGN', r.at, c.sentBy, `담당자 변경 → ${workerName(r.to)}`)))
    if (c.reportedAt) list.push(step('REPORT', c.reportedAt, workerName(c.assigneeId), '체크리스트 완료 보고'))
    if (c.confirmedAt) list.push(step('CONFIRM', c.confirmedAt, c.sentBy, '조치 확인'))
  }
  return list
}

/** 이미 끝난 알림: 설계안 actSteps() 처럼 발생 → 확인 → 전송 → 완료 → 해제 */
function pastTimeline(raisedTime) {
  return [
    step('RAISED', raisedTime, null, '발생'),
    step('ACK', addSec(raisedTime, 14), '한지우', '알림 확인'),
    step('CHECKLIST', addSec(raisedTime, 150), '한지우', '체크리스트 전송 → 박성훈'),
    step('REPORT', addSec(raisedTime, 560), '박성훈', '체크리스트 완료 보고'),
    step('CONFIRM', addSec(raisedTime, 640), '한지우', '조치 확인'),
  ]
}

export function alarmTimeline(alarmId) {
  const row = mockAlarms().find((a) => a.id === Number(alarmId))
  if (!row) return null
  return {
    id: row.id,
    level: row.level,
    status: row.status,
    title: row.title,
    location: row.location,
    sensorTag: row.sensorTag,
    value: row.value,
    unit: row.unit,
    threshold: row.threshold,
    timeline: row.id === 1042 ? topOvenTimeline() : pastTimeline(row.raisedAt.slice(11, 19)),
    checklist: row.checklist,
  }
}

/* ───────── GET /alarms/{id}/detail : 주의 상세 (상도 건조로 1042 만) ───────── */
export function alarmDetail(alarmId) {
  const a = scenario.alarm
  if (Number(alarmId) !== 1042 || !a) return null
  const v = TOP_OVEN_VALUES[LEVEL.WARN] // 주의가 걸린 그 순간 값 (지금 값이 아님)
  return {
    id: 1042,
    level: LEVEL.WARN,
    status: a.status,
    location: '울산공장 · 5공장 · 도장 공정 · 상도 건조로 배기팬',
    raisedAt: todayAt(a.raisedAt),
    cause: '배기팬 전류가 주의 기준(21.6 A)을 3분 이상 넘었습니다.',
    rule: { sensorTag: 'CT-17', warn: 21.6, alarm: 27.0, holdSec: 180, max: 36 },
    usual: 18.0, // 명세서에 없음 ('평소 18.0 A 대비 124%')
    sensors: [
      { tag: 'CT-17', type: 'CURRENT', value: v[117], unit: 'A', warn: 21.6, alarm: 27, level: LEVEL.WARN },
      { tag: 'TE-15', type: 'TEMP', value: v[215], unit: '℃', warn: 160, alarm: 180, level: LEVEL.NORMAL },
      { tag: 'CO-13', type: 'CO', value: v[313], unit: 'ppm', warn: 20, alarm: 30, level: LEVEL.NORMAL },
    ],
    thermal: {
      imageUrl: irWarn,
      capturedAt: todayAt(a.raisedAt),
      max: 78.4,
      min: 22.8,
      avg: 41.3,
      usualAtMax: 52.0, // 평소 같은 위치 온도 (명세서에 없음)
      maxPoint: { x: 0.62, y: 0.13 },
      zoneName: '배기팬 모터부',
      cameraTag: 'IR-01',
    },
    trend: { sensorId: 117, unit: 'A', warn: 21.6, alarm: 27, points: alarmTrendPoints() },
    causeCandidates: ['베어링 마모', '구동 벨트 장력 이상', '배기 덕트 댐퍼 막힘'],
    equipmentType: 'OVEN',
    sensorType: 'CURRENT',
    processId: 12,
    equipmentId: 31,
  }
}

/* ───────── GET /checklists/{id} ───────── */
export function checklistView(checklistId) {
  const c = scenario.checklist
  if (!c || c.id !== Number(checklistId)) return null
  const memoIndex = c.memo ? 1 : -1 // 현장 메모는 2번째 항목을 마칠 때 남김
  return {
    id: c.id,
    alarmId: scenario.alarm.id,
    status: c.status,
    level: LEVEL.WARN,
    processId: 12,
    equipmentId: 31,
    equipmentName: '상도 건조로 배기팬',
    sensorTag: 'CT-17',
    valueAtAlarm: 22.4,
    unit: 'A',
    assignee: { id: c.assigneeId, name: workerName(c.assigneeId) },
    sentBy: c.sentBy,
    sentAt: todayAt(c.sentAt),
    remindCount: c.remindCount,
    remindAvailableAt: c.lastRemindMs ? new Date(c.lastRemindMs + 30_000).toISOString() : null,
    items: c.items.map((content, i) => ({
      id: 500 + i + 1,
      seq: i + 1,
      content,
      doneAt: c.doneTimes[i] ? todayAt(c.doneTimes[i]) : null,
      result: c.doneTimes[i] ? '이상 없음' : null,
      memo: i === memoIndex ? c.memo.text : null,
    })),
    reportedAt: c.reportedAt && todayAt(c.reportedAt),
    confirmedAt: c.confirmedAt && todayAt(c.confirmedAt),
    // 서버 지금 시각 (명세서에 없음): '경과 시간'을 서버 시계 기준으로 세려고. 예시 데이터는 예시 시계
    serverTime: todayAt(scenarioNow()),
  }
}
