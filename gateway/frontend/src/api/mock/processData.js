/**
 * 공정 3D 배치도 예시 데이터 (5공장 도장 공정, processId 12)
 * - 응답 모양: API 명세서 B3 (GET /processes/{id}/layout, /status, GET /inspections/today)
 * - 값: 화면설계안 js/v-dash.js EQD(설비·센서), TODO(오늘 점검)
 * - 상도 건조로 센서 3개(CT-17·TE-15·CO-13)의 지금 값은 예시 상황(scenario.js)에서 가져옴
 *   예) 주의: CT-17 22.4 A 주의 / 정상: 18.1 A → 공장·사업장 화면 숫자도 같이 바뀜
 * - 센서 19개 = 전류 9 + 온도 6 + CO 4 (CO-14 는 예비 센서라 그림에 위치 없음)
 */
import { scenario, topOvenValue } from './scenario'
import { LEVEL } from '@/types/codes'

const { NORMAL, WARN, ALARM, FIRE } = LEVEL

/**
 * 설비 (seq: 공정 흐름 순서 번호, 그림과 아래 설비 줄에 표시. 명세서에 없는 값)
 * - 설비 상세 예시 데이터(equipmentData.js)도 이 목록을 그대로 씀 → 두 화면 숫자가 어긋나지 않음
 */
export const EQUIPMENT = [
  { id: 24, code: 'PNT-PRETREAT', name: '전처리', type: 'TANK', seq: 1, manager: '이재호' },
  { id: 25, code: 'PNT-ED-TANK', name: '전착 탱크', type: 'TANK', seq: 2, manager: '이재호' },
  { id: 26, code: 'PNT-ED-OVEN', name: '전착 건조로', type: 'OVEN', seq: 3, manager: '박성훈' },
  { id: 27, code: 'PNT-SEALING', name: '실링', type: 'BOX', seq: 4, manager: '박성훈' },
  { id: 28, code: 'PNT-PRIMER-BOOTH', name: '중도 부스', type: 'BOOTH', seq: 5, manager: '박성훈' },
  { id: 29, code: 'PNT-PRIMER-OVEN', name: '중도 건조로', type: 'OVEN', seq: 6, manager: '박성훈' },
  { id: 30, code: 'PNT-TOP-BOOTH', name: '상도 부스', type: 'BOOTH', seq: 7, manager: '김도현' },
  { id: 31, code: 'PNT-TOP-OVEN', name: '상도 건조로', type: 'OVEN', seq: 8, manager: '김도현' },
  { id: 32, code: 'PNT-AHU', name: '공조기 (AHU)', type: 'BOX', seq: null, manager: '이재호' },
  { id: 33, code: 'PNT-PAINT-MIX', name: '도료 혼합실', type: 'BOX', seq: null, manager: '이재호' },
  { id: 34, code: 'PNT-INCINERATOR', name: '소각설비', type: 'BOX', seq: null, manager: '이재호' },
]

/** 센서: [id, tag, 종류, 단위, 설비 id, 평상시 값, 주의 기준, 경보 기준] — id 는 전류 1xx · 온도 2xx · CO 3xx */
const SENSOR_ROWS = [
  [111, 'CT-11', 'CURRENT', 'A', 24, 9.8, 12, 15],
  [211, 'TE-11', 'TEMP', '℃', 24, 52, 60, 70],
  [112, 'CT-12', 'CURRENT', 'A', 25, 7.4, 10, 13],
  [212, 'TE-12', 'TEMP', '℃', 25, 28, 32, 36],
  [113, 'CT-13', 'CURRENT', 'A', 26, 16.2, 21.6, 27],
  [213, 'TE-13', 'TEMP', '℃', 26, 151, 160, 180],
  [311, 'CO-11', 'CO', 'ppm', 26, 7, 20, 30],
  [114, 'CT-14', 'CURRENT', 'A', 28, 14.1, 18, 22],
  [115, 'CT-15', 'CURRENT', 'A', 29, 17.3, 21.6, 27],
  [214, 'TE-14', 'TEMP', '℃', 29, 148, 160, 180],
  [312, 'CO-12', 'CO', 'ppm', 29, 12, 20, 30],
  [116, 'CT-16', 'CURRENT', 'A', 30, 15.2, 18, 22],
  [117, 'CT-17', 'CURRENT', 'A', 31, 18.1, 21.6, 27], // 상도 건조로: 지금 값은 예시 상황에서
  [215, 'TE-15', 'TEMP', '℃', 31, 142, 160, 180],
  [313, 'CO-13', 'CO', 'ppm', 31, 6, 20, 30],
  [121, 'CT-21', 'CURRENT', 'A', 32, 11.8, 15, 18],
  [122, 'CT-22', 'CURRENT', 'A', 33, 4.6, 6, 8],
  [221, 'TE-21', 'TEMP', '℃', 34, 742, 820, 880],
  [314, 'CO-14', 'CO', 'ppm', null, 5, 20, 30], // 예비 센서 (설비에 아직 안 붙음)
]

/** 값 → 단계 (경보 기준 이상 경보, 주의 기준 이상 주의) */
export const levelOf = (value, warn, alarm) => (value >= alarm ? ALARM : value >= warn ? WARN : NORMAL)

/** 지금 센서 목록 (상도 건조로 3개는 예시 상황 값, 나머지는 평상시 값) */
export function sensorsNow() {
  return SENSOR_ROWS.map(([id, tag, type, unit, equipmentId, usualValue, warn, alarm]) => {
    const value = topOvenValue(id) ?? usualValue
    return { id, tag, type, unit, equipmentId, value, warn, alarm, level: levelOf(value, warn, alarm) }
  })
}

/** 단계 높은 쪽 (정상 < 주의 < 경보 < 화재) */
const ORDER = [NORMAL, WARN, ALARM, LEVEL.FIRE]
export const maxLevel = (levels) => levels.reduce((a, b) => (ORDER.indexOf(b) > ORDER.indexOf(a) ? b : a), NORMAL)

/** 설비 단계 = 붙은 센서 중 가장 높은 단계 (화재 중에는 상도 건조로가 '화재') */
export function equipmentLevel(equipmentId, sensors = sensorsNow()) {
  if (equipmentId === 31 && scenario.state === FIRE) return FIRE
  return maxLevel(sensors.filter((s) => s.equipmentId === equipmentId).map((s) => s.level))
}

/**
 * 설비 운전 상태 (셧다운 명령을 받은 설비만 바뀜)
 * - RUNNING 가동 / STOPPING 정지 중(셧다운 단계 진행) / STOPPED 정지됨
 */
export function runStateOf(equipmentId) {
  const sd = scenario.shutdown
  if (!sd || !sd.equipmentIds.includes(equipmentId)) return 'RUNNING'
  return sd.steps.every(Boolean) ? 'STOPPED' : 'STOPPING'
}

/** 배기팬이 있는 설비 → 팬 상태 (상도 건조로는 주의 이상이면 회전수를 올려 둔 상태, 정지되면 꺼짐) */
function fansNow(topLevel) {
  const fan = { power: 'ON', rpm: 1180, targetRpm: 1180 }
  const fanOf = (id, normalFan) =>
    runStateOf(id) === 'STOPPED' || (id === 31 && scenario.shut) ? { power: 'OFF', rpm: 0, targetRpm: 0 } : normalFan
  return {
    26: fanOf(26, fan),
    28: fanOf(28, fan),
    29: fanOf(29, fan),
    30: fanOf(30, fan),
    31: fanOf(31, topLevel === NORMAL ? fan : { power: 'ON', rpm: 1240, targetRpm: 1240 }),
  }
}

/** 오늘 설비 점검 (설계안 '오늘 설비 점검' 5건, 상황과 상관없음) */
const INSPECTIONS = {
  doneCount: 3,
  totalCount: 5,
  items: [
    { scheduleId: 640, time: '08:30', equipmentName: '상도 건조로', title: '배기팬 벨트·베어링 점검', assignee: '김도현', status: 'DONE' },
    { scheduleId: 641, time: '09:00', equipmentName: '전착 건조로', title: '버너실 CO 감지기 작동 확인', assignee: '박성훈', status: 'DONE' },
    { scheduleId: 642, time: '10:30', equipmentName: '전처리', title: '순환펌프 누수·진동 점검', assignee: '이재호', status: 'DONE' },
    { scheduleId: 643, time: '14:00', equipmentName: '소각설비', title: '연소실 온도 기록지 확인', assignee: '이재호', status: 'DELAYED' },
    { scheduleId: 644, time: '17:00', equipmentName: '중도 건조로', title: '배기 덕트 댐퍼 개도 확인', assignee: '박성훈', status: 'PLANNED' },
  ],
}

/**
 * 공정 예시 데이터 (부를 때마다 지금 상황으로 만듦)
 * @returns {{ layout, status, inspections } | null}
 */
export function mockProcess(processId) {
  if (Number(processId) !== 12) return null
  const sensors = sensorsNow()
  const levelOfEq = (id) => equipmentLevel(id, sensors)
  const fans = fansNow(levelOfEq(31))
  return {
    // GET /processes/{processId}/layout
    layout: {
      processId: 12,
      name: '도장 공정',
      version: 14,
      floorplan: null,
      equipment: EQUIPMENT.map(({ manager, ...e }) => ({
        ...e,
        active: true,
        managers: [{ id: 0, name: manager, primary: true }],
      })),
      sensors: sensors.map(({ id, tag, type, unit, equipmentId }) => ({ id, tag, type, unit, equipmentId, active: true })),
    },
    // GET /processes/{processId}/status
    status: {
      processId: 12,
      level: scenario.state === FIRE ? FIRE : maxLevel(sensors.map((s) => s.level)),
      equipment: EQUIPMENT.map((e) => ({ id: e.id, level: levelOfEq(e.id), runState: runStateOf(e.id), fan: fans[e.id] ?? null })),
      sensors: sensors.map(({ id, tag, value, level, warn, alarm }) => ({ id, tag, value, level, warn, alarm })),
    },
    // GET /inspections/today?processId=12
    inspections: INSPECTIONS,
  }
}
