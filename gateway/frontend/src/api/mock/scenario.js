/**
 * 예시 상황 (정상 / 주의 / 경보 / 화재) — 예시 데이터 모드의 '한 곳'
 *
 * - 백엔드 없이 알림 대응 흐름을 보려고, 상도 건조로의 지금 상황을 여기 하나에 둠
 *   모든 예시 데이터(사업장·공장·공정·설비·알림·상단 바)가 이 값으로 숫자와 색을 만듦 → 화면끼리 항상 같은 값
 * - 상황이 바뀌면 emitLive() → 열려 있는 화면이 조용히 다시 불러옴 (api/live.js)
 *   실제 서버에서는 이 파일 대신 SSE 이벤트가 같은 일을 함
 * - 상황 바꾸기 도구(features/demo/DemoTool.vue, 개발 모드에서만)와 주의 확인·체크리스트 API 흉내가 아래 함수를 부름
 * - 새로고침해도 이어지게 sessionStorage 에 저장 (브라우저 탭을 닫으면 처음 상황으로)
 *
 * 처음 상황(기본값) = 그동안 화면들이 보여 주던 상황:
 *   16:38:20 상도 건조로 배기팬 전류 CT-17 22.4 A 주의 → 16:38:31 확인 → 16:41:05 체크리스트 전송 → 김도현 2/5 진행 중
 */
import { reactive, toRaw, watch } from 'vue'
import { emitLive } from '../live'
import { LEVEL } from '@/types/codes'

const STORAGE_KEY = 'argos.mock.scenario'

/** 상도 건조로 센서 값 (화면설계안 js/lib.js VAL) — 센서 id: 117 전류 CT-17, 215 온도 TE-15, 313 CO CO-13 */
export const TOP_OVEN_VALUES = {
  [LEVEL.NORMAL]: { 117: 18.1, 215: 142, 313: 6 },
  [LEVEL.WARN]: { 117: 22.4, 215: 146, 313: 9 },
  [LEVEL.ALARM]: { 117: 27.5, 215: 164, 313: 34 },
  [LEVEL.FIRE]: { 117: 0.0, 215: 212, 313: 120 },
}

/** 조치 체크리스트 기본 5개 항목 (설계안 js/core.js CKLIST, 명세서 GET /checklist-templates 예시) */
export const DEFAULT_ITEMS = [
  '배기팬 이상 소음·진동 확인',
  '구동 벨트 장력, 베어링 발열 확인',
  '배기 덕트 댐퍼 열림 상태 확인',
  '버너실 CO 농도 휴대용 측정기로 재측정',
  '건조로 온도 지시값과 설정값 비교',
]

/** 도장 공정 담당자 (공정 배치도 예시 데이터의 담당자 이름과 같음) */
export const WORKERS = [
  { id: 21, name: '김도현', loginId: 'u5_paint01', onDuty: true, pushReady: true },
  { id: 22, name: '박성훈', loginId: 'u5_paint02', onDuty: true, pushReady: true },
  { id: 23, name: '이재호', loginId: 'u5_paint03', onDuty: false, pushReady: true },
]

/** 현장 메모 (설계안: 2번째 항목을 마칠 때 남김) */
const FIELD_MEMO = '구동 벨트 장력 느슨함 확인, 재조정함. 베어링 발열은 없음.'

const pad = (n) => String(n).padStart(2, '0')
const toSec = (t) => {
  const [h, m, s] = t.split(':').map(Number)
  return h * 3600 + m * 60 + s
}
const toTime = (sec) => `${pad(Math.floor(sec / 3600) % 24)}:${pad(Math.floor(sec / 60) % 60)}:${pad(sec % 60)}`

/** 처음 상황 */
function initial() {
  return {
    /** 'NORMAL' | 'WARN' | 'ALARM' | 'FIRE' */
    state: LEVEL.WARN,
    /** 상도 건조로 전류 주의 알림 (없으면 null). status: OPEN → ACKED → ACTING → CLOSED */
    alarm: { id: 1042, status: 'ACTING', raisedAt: '16:38:20', ackedAt: '16:38:31', ackedBy: '한지우', closedAt: null },
    /** 체크리스트 (없으면 null). status: SENT → IN_PROGRESS → REPORTED(앱에서 완료 보고) → CONFIRMED */
    checklist: {
      id: 77,
      status: 'IN_PROGRESS',
      items: [...DEFAULT_ITEMS],
      assigneeId: 21,
      sentAt: '16:41:05',
      sentBy: '한지우',
      doneTimes: ['16:41:30', '16:41:48'],
      memo: { at: '16:41:48', text: FIELD_MEMO },
      remindCount: 0,
      lastRemindMs: 0, // 다시 알림 30초 제한 계산용 (실제 시계)
      reassigned: [], // [{ at, from, to, reason }]
      reportedAt: null,
      confirmedAt: null,
      result: null,
    },
    /** 예시 시계: base 시각에서 실제로 흐른 초를 더함 */
    clock: { base: '16:42:10', at: Date.now() },
  }
}

function load() {
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY))
    if (saved?.state) return saved
  } catch {
    // 저장된 값을 못 읽으면 처음 상황
  }
  return initial()
}

/** 지금 예시 상황 (화면에서 직접 고치지 말고 아래 함수로만 바꿈) */
export const scenario = reactive(load())

// 바뀔 때마다 저장
watch(
  scenario,
  () => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(toRaw(scenario)))
    } catch {
      // 저장 못 해도 화면은 그대로 동작
    }
  },
  { deep: true },
)

/** 예시 시계의 지금 시각 'HH:mm:ss' */
export function scenarioNow() {
  const passed = Math.floor((Date.now() - scenario.clock.at) / 1000)
  return toTime(toSec(scenario.clock.base) + passed)
}

/** 'HH:mm:ss' 두 시각 사이 초 */
export const secondsBetween = (from, to) => toSec(to) - toSec(from)

/** 상도 건조로 센서 값을 고를 때 쓰는 단계 (조치 확인 뒤에는 정상 값) */
export function valueState() {
  return scenario.state
}

/** 상도 건조로 센서 지금 값 (117·215·313 이 아니면 undefined) */
export function topOvenValue(sensorId) {
  return TOP_OVEN_VALUES[valueState()]?.[sensorId]
}

/** 진행 중인 체크리스트 (확인 끝났으면 null) */
export function activeChecklist() {
  const c = scenario.checklist
  return c && c.status !== 'CONFIRMED' ? c : null
}

/* ───────── 상황 바꾸기 (상황 바꾸기 도구) ───────── */

let tickTimer = null
function stopTick() {
  clearInterval(tickTimer)
  tickTimer = null
}

/** 상황을 통째로 바꾸고 화면에 알림 */
function replace(next, event) {
  stopTick()
  Object.assign(scenario, next)
  emitLive(event)
}

/** 정상 (알림 없음, 오늘 16:30:05) */
export function setNormal() {
  replace({ state: LEVEL.NORMAL, alarm: null, checklist: null, clock: { base: '16:30:05', at: Date.now() } }, 'level.changed')
}

/** 주의 발생 (16:38:20 CT-17 22.4 A, 아직 아무도 확인 안 함) */
export function raiseWarn() {
  replace(
    {
      state: LEVEL.WARN,
      alarm: { id: 1042, status: 'OPEN', raisedAt: '16:38:20', ackedAt: null, ackedBy: null, closedAt: null },
      checklist: null,
      clock: { base: '16:38:20', at: Date.now() },
    },
    'alarm.created',
  )
}

/** 처음 상황으로 (주의 · 조치 중 2/5) */
export function resetScenario() {
  replace(initial(), 'level.changed')
}

/* ───────── 주의 대응 (API 흉내가 부름) ───────── */

/** 주의 확인 (2초 길게 누르기) */
export function ackAlarm(by) {
  if (!scenario.alarm || scenario.alarm.status !== 'OPEN') return false
  scenario.alarm.status = 'ACKED'
  scenario.alarm.ackedAt = scenarioNow()
  scenario.alarm.ackedBy = by
  emitLive('alarm.updated')
  return true
}

/** 체크리스트 전송 → 알림 '조치 중', 담당자 앱이 항목을 하나씩 체크하는 흉내 시작 */
export function sendChecklist({ items, assigneeId, sentBy }) {
  scenario.alarm.status = 'ACTING'
  scenario.checklist = {
    id: (scenario.checklist?.id ?? 76) + 1,
    status: 'SENT',
    items: [...items],
    assigneeId,
    sentAt: scenarioNow(),
    sentBy,
    doneTimes: [],
    memo: null,
    remindCount: 0,
    lastRemindMs: 0,
    reassigned: [],
    reportedAt: null,
    confirmedAt: null,
    result: null,
  }
  emitLive('checklist.updated')
  startAutoTick()
  return scenario.checklist
}

/**
 * 담당자 앱에서 항목 n개 완료 흉내 (상황 바꾸기 도구 '+1 항목' / '모두 완료', 자동 진행)
 * - 모두 끝나면 앱에서 '완료 보고'까지 한 것으로 봄 (status REPORTED) → 공장 담당자가 조치 확인 가능
 */
export function tickChecklist(count = 1) {
  const c = activeChecklist()
  if (!c || c.status === 'REPORTED') return
  for (let i = 0; i < count && c.doneTimes.length < c.items.length; i++) {
    c.doneTimes.push(scenarioNow())
    if (c.doneTimes.length === 2 && !c.memo) c.memo = { at: scenarioNow(), text: FIELD_MEMO }
  }
  c.status = c.doneTimes.length >= c.items.length ? 'REPORTED' : 'IN_PROGRESS'
  if (c.status === 'REPORTED') {
    c.reportedAt = scenarioNow()
    stopTick()
  }
  emitLive('checklist.updated')
}

/** 전송한 뒤에만 5.2초마다 한 항목씩 자동 진행 (설계안 sendChecklist 와 같은 간격). 새로고침하면 멈춤 */
export function startAutoTick() {
  stopTick()
  tickTimer = setInterval(() => tickChecklist(1), 5200)
}

/** 다시 알림 (30초에 한 번 — 백엔드 ChecklistService REMIND_COOLDOWN) */
export const REMIND_COOLDOWN_MS = 30_000
export function remindChecklist() {
  const c = activeChecklist()
  const wait = c.lastRemindMs + REMIND_COOLDOWN_MS - Date.now()
  if (wait > 0) return { ok: false, availableAt: new Date(Date.now() + wait).toISOString() }
  c.remindCount += 1
  c.lastRemindMs = Date.now()
  emitLive('checklist.updated')
  return { ok: true, remindCount: c.remindCount, availableAt: new Date(Date.now() + REMIND_COOLDOWN_MS).toISOString() }
}

/** 담당자 변경 (이미 한 항목은 그대로) */
export function reassignChecklist(assigneeId, reason) {
  const c = activeChecklist()
  c.reassigned.push({ at: scenarioNow(), from: c.assigneeId, to: assigneeId, reason })
  c.assigneeId = assigneeId
  emitLive('checklist.updated')
}

/** 조치 확인 → 체크리스트 확인 끝, 알림 해제, 상도 건조로 값 정상으로 */
export function confirmChecklist({ result, memo }) {
  const c = activeChecklist()
  const now = scenarioNow()
  c.status = 'CONFIRMED'
  c.confirmedAt = now
  c.result = { result, memo }
  scenario.alarm.status = 'CLOSED'
  scenario.alarm.closedAt = now
  scenario.state = LEVEL.NORMAL
  stopTick()
  emitLive('alarm.updated')
}

/** 담당자 이름 */
export const workerName = (id) => WORKERS.find((w) => w.id === id)?.name ?? ''
