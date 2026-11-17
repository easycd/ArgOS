/**
 * 설비 상세 예시 데이터 (5공장 도장 공정 설비 11개, id 24~34)
 * - 응답 모양: API 명세서 B4 (GET /equipment/{id}, /equipment/{id}/events, /thermal/{cameraId}/latest)
 * - 설비·센서·지금 값은 공정 배치도 예시 데이터(processData.js)를 그대로 씀 → 숫자가 다른 화면과 같음
 *   (상도 건조로: 배기팬 CT-17 22.4 A 주의, TE-15 146 ℃, CO-13 9 ppm)
 * - 게이지 눈금 끝(max)·평소 값(usual)은 화면설계안 js/v-dash.js EQD 값
 */
import { EQUIPMENT, SENSORS, equipmentLevel } from './processData'
import { SCENARIO_TIME, todayIso } from './equipmentSeries'
import { LEVEL } from '@/types/codes'
import irNormal from '@/assets/images/thermal/ir_normal.jpg'
import irWarn from '@/assets/images/thermal/ir_warn.jpg'

/** 센서별 게이지 눈금 끝(max)과 평소 값(usual) — 설계안 EQD [눈금 끝, 평소값] */
const GAUGE = {
  'CT-11': [20, 9.5],
  'TE-11': [100, 51],
  'CT-12': [18, 7.2],
  'TE-12': [50, 28],
  'CT-13': [36, 16],
  'TE-13': [240, 150],
  'CO-11': [50, 6],
  'CT-14': [30, 14],
  'CT-15': [36, 17],
  'TE-14': [240, 147],
  'CO-12': [50, 8],
  'CT-16': [30, 15],
  'CT-17': [36, 18],
  'TE-15': [240, 142],
  'CO-13': [50, 6],
  'CT-21': [25, 11.5],
  'CT-22': [12, 4.5],
  'TE-21': [1000, 740],
}

const TYPE_LABEL = { CURRENT: '전류', TEMP: '온도', CO: 'CO' }

/** 상도 건조로 (주의 상황이 걸린 설비) */
export const TOP_OVEN_ID = 31

/** 설비 상세: GET /equipment/{id} */
function detailOf(e) {
  return {
    id: e.id,
    code: e.code,
    name: e.name,
    type: e.type,
    processId: 12,
    seq: e.seq,
    path: ['울산공장', '5공장', '도장 공정'],
    level: equipmentLevel(e.id),
    runState: 'RUNNING',
    sensors: SENSORS.filter((s) => s.equipmentId === e.id).map((s) => ({
      id: s.id,
      tag: s.tag,
      type: s.type,
      label: `${e.name} ${TYPE_LABEL[s.type]}`,
      unit: s.unit,
      value: s.value,
      level: s.level,
      min: 0,
      max: GAUGE[s.tag][0],
      usual: GAUGE[s.tag][1], // 명세서에 없음 (게이지 아래 '평소 18.0 A')
      warn: s.warn,
      alarm: s.alarm,
      season: 'WINTER',
    })),
    cameraId: 301, // 도장 공정 열화상 카메라 IR-01 (공정마다 1대)
    // 진행 중 체크리스트: 상도 건조로만 (16:41:05 전송, 김도현 2/5 진행 — 상단 바 체크리스트 1건과 같음)
    activeChecklist: e.id === TOP_OVEN_ID ? { id: 77, doneCount: 2, totalCount: 5, assignee: '김도현' } : null,
  }
}

export const MOCK_EQUIPMENT = Object.fromEntries(EQUIPMENT.map((e) => [e.id, detailOf(e)]))

/**
 * 이벤트 이력: GET /equipment/{id}/events?date=today (최근이 위)
 * - type: ALARM(알람) | ACTION(조치) | THRESHOLD(기준값 조정) | RECORD(가동·점검 기록, 명세서에 없음)
 * - 상도 건조로: 설계안 eventLog() '주의' 상황 + 체크리스트 전송·조치 중, 기준값 조정 1건(명세서 예시 값)
 */
const ev = (time, type, text, detail, extra = {}) => ({ at: todayIso(time), type, text, detail, ...extra })

const TOP_OVEN_EVENTS = [
  ev('16:41:48', 'ACTION', '조치 중', '김도현 · 체크리스트 2/5 진행', { status: 'ACTING', by: '김도현', alarmId: 1042 }),
  ev('16:41:05', 'ACTION', '체크리스트 전송', '도장 공정 담당자 앱 · 5개 항목', { alarmId: 1042 }),
  ev('16:38:31', 'ACTION', '주의 확인', '공장 담당자 · 2초 길게 눌러 확인', { by: '한지우', alarmId: 1042 }),
  ev('16:38:20', 'ALARM', '전류 주의 기준 초과', 'CT-17 22.4 A (기준 21.6 A)', { level: LEVEL.WARN, alarmId: 1042 }),
  ev('16:30:12', 'ALARM', '전류 상승 시작', 'CT-17 18.0 → 19.2 A', { level: LEVEL.NORMAL }),
  ev('09:02:40', 'RECORD', '일일 점검 완료', '배기팬 벨트·베어링 점검 · 김도현', { by: '김도현' }),
  ev('08:30:00', 'RECORD', '가동 시작', '상도 건조로 승온 완료 142 ℃'),
  ev('07:40:00', 'THRESHOLD', '전류 주의 기준 20.7 → 21.6 A', '오승민 · 겨울 기준 적용', { by: '오승민' }),
]

/** 그 밖의 설비: 점검·가동 기록만 (센서 없는 설비는 기록 없음) */
function eventsOf(e) {
  if (e.id === TOP_OVEN_ID) return TOP_OVEN_EVENTS
  if (!SENSORS.some((s) => s.equipmentId === e.id)) return []
  return [
    ev('09:02:40', 'RECORD', '일일 점검 완료', '환기·배기설비 점검일지 등록'),
    ev('08:30:00', 'RECORD', '가동 시작', `${e.name} 정상 가동`),
  ]
}

export const MOCK_EQUIPMENT_EVENTS = Object.fromEntries(EQUIPMENT.map((e) => [e.id, eventsOf(e)]))

/**
 * 열화상 최신 장면: GET /thermal/{cameraId}/latest?equipmentId=
 * - 그림: 설계안 assets 의 예시 열화상 (주의 = ir_warn.jpg, 정상 = ir_normal.jpg)
 * - zone: 이 설비 구역 (구역이 정해진 설비만 최고·최저 온도가 있음. 명세서에 없음)
 */
export function thermalOf(cameraId, equipmentId) {
  const top = Number(equipmentId) === TOP_OVEN_ID
  return {
    cameraId,
    tag: 'IR-01',
    imageUrl: top ? irWarn : irNormal,
    capturedAt: todayIso(SCENARIO_TIME),
    max: top ? 78.4 : null,
    min: top ? 22.8 : null,
    avg: top ? 41.6 : null,
    maxPoint: top ? { x: 0.62, y: 0.13 } : null,
    scale: { min: 20, max: 120 }, // 색 눈금 범위 (명세서에 없음)
    zone: top ? { name: '배기팬 모터부', desc: '상도 건조로 외벽 · 배기팬 · 버너실' } : null,
  }
}
