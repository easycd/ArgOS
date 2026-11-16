/**
 * 예시 데이터 (백엔드 개발 전 화면 확인용)
 * - 응답 모양: 설계 자료 API 명세서(_design/ArgOS_API명세서.html)의 응답 예시와 같게
 * - 값: 화면설계안(js/core.js, js/v-rev.js)의 기본 상태(전체 정상)와 같게
 * - 값을 바꾸면 화면에서 바로 확인 가능 (예: 5공장 CURRENT 의 WARN 을 1로)
 */
import { LEVEL, ROLE } from '@/types/codes'

const { NORMAL } = LEVEL

/* ───────── 로그인 (POST /auth/login) ───────── */

/**
 * 예시 로그인 계정 (비밀번호는 모두 argos1234)
 * - 실제 서비스 계정이 아님. 백엔드가 생기면 이 목록은 쓰지 않음
 * - scope: 담당 범위 (siteId, factoryIds, processIds)
 */
export const MOCK_PASSWORD = 'argos1234'

export const MOCK_USERS = [
  {
    id: 1,
    loginId: 'hq_admin',
    name: '서지훈',
    role: ROLE.HQ_ADMIN,
    scope: { siteId: null, factoryIds: [], processIds: [] },
  },
  {
    id: 7,
    loginId: 'ulsan5_admin',
    name: '한지우',
    role: ROLE.PLANT_ADMIN,
    scope: { siteId: 1, factoryIds: [5], processIds: [] },
  },
]

/* ───────── 사업장 목록 (GET /sites) ───────── */

/** 센서 단계별 개수 { NORMAL, WARN, ALARM } */
const levels = (normal, warn = 0, alarm = 0) => ({ [LEVEL.NORMAL]: normal, [LEVEL.WARN]: warn, [LEVEL.ALARM]: alarm })

export const MOCK_SITES = [
  {
    id: 1,
    code: 'ULS-01',
    name: '울산공장',
    address: '울산광역시 북구 염포로 700',
    lat: 35.5438,
    lng: 129.3697,
    // 5공장 도장 공정 전류 센서 1개가 '주의' (아래 공장·공정 예시 데이터와 맞춤: 센서 154개, 오늘 알림 8건)
    level: LEVEL.WARN,
    factoryCount: 6,
    processCount: 22,
    sensorCount: 154,
    sensorLevels: levels(153, 1),
    todayAlarmCount: 8,
  },
  {
    id: 2,
    code: 'ASN-01',
    name: '아산공장',
    address: '충청남도 아산시 인주면 현대로 1077',
    lat: 36.9237,
    lng: 126.9148,
    level: NORMAL,
    factoryCount: 2,
    processCount: 6,
    sensorCount: 46,
    sensorLevels: levels(46),
    todayAlarmCount: 1,
  },
  {
    id: 3,
    code: 'JNJ-01',
    name: '전주공장',
    address: '전북특별자치도 완주군 봉동읍 완주산단5로 163',
    lat: 35.9198,
    lng: 127.1398,
    level: NORMAL,
    factoryCount: 2,
    processCount: 7,
    sensorCount: 38,
    sensorLevels: levels(38),
    todayAlarmCount: 0,
  },
]

/* ───────── 공정 (GET /factories/{factoryId}/overview) ─────────
 * 지금 상황: 울산공장 5공장 도장 공정의 전류 센서 CT-17 이 '주의' (설계안 시연 '주의' 상황과 같음)
 * 다른 상황을 보고 싶으면 아래 5공장 도장 공정(PNT) 줄과 MOCK_SITES 의 울산공장 값을 같이 고치면 됨
 *   - 정상: levelsByType CURRENT 를 [9, 0, 0] 로, level·equipmentLevels·abnormal 을 정상으로
 *   - 경보: CURRENT 를 [8, 0, 1] 로, level 을 LEVEL.ALARM 으로
 * 5공장의 센서 개수·상태는 이 공정 값들을 더해서 만듦 → 사업장 선택·사업장 현황·공장 화면 숫자가 항상 같음
 */

/** 센서 종류별 단계 개수 (전류·온도·CO) — 숫자 하나면 모두 정상, 배열이면 [정상, 주의, 경보] */
const byType = (current, temp, co) => {
  const toLevels = (v) => (Array.isArray(v) ? levels(...v) : levels(v))
  return { CURRENT: toLevels(current), TEMP: toLevels(temp), CO: toLevels(co) }
}

/** 5공장 공정 4개 (설계안 '공정별 설비 상태' 카드 값) */
const PLANT5_PROCESSES = [
  {
    id: 10, code: 'PRS', name: '프레스 공정', level: NORMAL,
    equipmentCount: 9, equipmentLevels: levels(9), sensorCount: 12, levelsByType: byType(6, 4, 2),
    abnormal: [], thermalMax: 41.2, hasFloorplan: false,
  },
  {
    id: 11, code: 'BDY', name: '차체 공정', level: NORMAL,
    equipmentCount: 12, equipmentLevels: levels(12), sensorCount: 16, levelsByType: byType(8, 5, 3),
    abnormal: [], thermalMax: 46.8, hasFloorplan: false,
  },
  {
    id: 12, code: 'PNT', name: '도장 공정', level: LEVEL.WARN,
    equipmentCount: 14, equipmentLevels: levels(13, 1), sensorCount: 19, levelsByType: byType([8, 1, 0], 6, 4),
    abnormal: [{ sensorId: 117, sensorTag: 'CT-17', type: 'CURRENT', value: 22.4, unit: 'A', level: LEVEL.WARN }],
    thermalMax: 78.4, hasFloorplan: true,
  },
  {
    id: 13, code: 'ASM', name: '의장 공정', level: NORMAL,
    equipmentCount: 11, equipmentLevels: levels(11), sensorCount: 14, levelsByType: byType(7, 4, 3),
    abnormal: [], thermalMax: 39.5, hasFloorplan: false,
  },
]

/** 공장 상세 (공장 ID → 공정 목록, 열화상 카메라) */
export const MOCK_FACTORY_DETAILS = {
  5: {
    processes: PLANT5_PROCESSES,
    cameras: [
      { id: 301, tag: 'IR-01', processId: 12 },
      { id: 302, tag: 'IR-02', processId: 10 },
      { id: 303, tag: 'IR-03', processId: 11 },
      { id: 304, tag: 'IR-04', processId: 13 },
    ],
  },
}

/* ───────── 사업장 펼치기 (GET /sites/{siteId}/tree) ─────────
 * 사업장 현황(GET /sites/{siteId}/overview)도 이 공장 목록으로 만듦 (api/dashboard.js)
 */

let processId = 100
/** 공정 목록 만들기 (이름 → 모두 정상, 이상 센서 없음) */
const processes = (...names) => names.map((name) => ({ id: processId++, name, level: NORMAL, abnormal: [] }))
const CAR = ['프레스 공정', '차체 공정', '도장 공정', '의장 공정']
const ENGINE = ['가공 공정', '조립 공정']

/**
 * 공장 한 줄
 * - code: 지도 구역과 짝을 맞추는 공장 코드 (명세서 overview 예시의 "P5")
 * - todayAlarmCount: 명세서 tree 응답에는 없지만 화면 '오늘 알림' 칸에 필요해서 추가 (backend-notes.md 에 요청)
 */
const factory = (id, code, name, procNames, types, todayAlarmCount) => ({
  id,
  code,
  name,
  level: NORMAL,
  levelsByType: types,
  processes: processes(...procNames),
  todayAlarmCount,
})

/** 종류별 개수 여러 개 더하기 (공정 → 공장) */
function sumByType(list) {
  const sum = (type, level) => list.reduce((n, item) => n + item[type][level], 0)
  const one = (type) => levels(sum(type, NORMAL), sum(type, LEVEL.WARN), sum(type, LEVEL.ALARM))
  return { CURRENT: one('CURRENT'), TEMP: one('TEMP'), CO: one('CO') }
}

/** 5공장: 위 공정 4개를 더해서 만듦 (도장 공정이 주의라 공장도 주의) */
const plant5 = {
  id: 5,
  code: 'P5',
  name: '5공장',
  level: LEVEL.WARN,
  levelsByType: sumByType(PLANT5_PROCESSES.map((p) => p.levelsByType)),
  processes: PLANT5_PROCESSES.map(({ id, name, level, abnormal }) => ({ id, name, level, abnormal })),
  todayAlarmCount: 4,
}

export const MOCK_SITE_TREES = {
  1: {
    siteId: 1,
    factories: [
      factory(1, 'P1', '1공장', CAR, byType(10, 7, 4), 1),
      factory(2, 'P2', '2공장', CAR, byType(8, 6, 4), 2),
      factory(3, 'P3', '3공장', CAR, byType(9, 7, 4), 0),
      factory(4, 'P4', '4공장', CAR, byType(8, 5, 4), 0),
      plant5,
      factory(6, 'EV', '엔진·변속기 공장', ENGINE, byType(8, 5, 4), 1),
    ],
  },
  2: {
    siteId: 2,
    factories: [
      factory(7, 'P1', '승용 1공장', CAR, byType(13, 9, 6), 1),
      factory(8, 'EN', '엔진공장', ENGINE, byType(8, 6, 4), 0),
    ],
  },
  3: {
    siteId: 3,
    factories: [
      factory(9, 'C1', '상용 1공장', CAR, byType(10, 7, 5), 0),
      factory(10, 'C2', '상용 2공장', ['차체 공정', '도장 공정', '의장 공정'], byType(7, 5, 4), 0),
    ],
  },
}

/* ───────── 알림 (GET /alarms, GET /alarms/hourly) ───────── */

/** 오늘 날짜의 시각 문자열 (예: '16:38:20' → '2026-11-16T16:38:20+09:00') */
function todayAt(time) {
  const d = new Date()
  const ymd = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  return `${ymd}T${time}+09:00`
}

/** 알림 한 건 만들기 (siteId·factoryId 는 범위로 거르기 위한 값, 응답에는 안 나감) */
const alarm = (id, factoryId, status, title, location, sensorTag, sensorType, value, unit, threshold, time) => ({
  // 5공장 알림은 모두 도장 공정(processId 12)
  siteId: 1, factoryId, processId: factoryId === 5 ? 12 : null, id, level: LEVEL.WARN, status, title, location,
  equipmentId: id - 1000, sensorId: id - 900, sensorTag, sensorType, value, unit, threshold, raisedAt: todayAt(time),
})

/**
 * 울산공장 오늘 알림 (최근 순) — 설계안 '실시간 알림'과 같은 내용
 * - status: OPEN(발생) → ACKED(확인) → ACTING(조치 중) → CLOSED(조치 완료)
 * - 시간대별 알림(GET /alarms/hourly)은 이 목록으로 계산 (api/dashboard.js)
 */
export const MOCK_ALARMS = [
  alarm(1042, 5, 'ACTING', '전류 주의 기준 초과', '5공장 · 도장 공정 · 상도 건조로 배기팬', 'CT-17', 'CURRENT', 22.4, 'A', 21.6, '16:38:20'),
  alarm(1040, 5, 'CLOSED', '온도 주의 해제', '5공장 · 도장 공정 · 전착 건조로', 'TE-13', 'TEMP', 162, '℃', 160, '14:05:41'),
  alarm(1038, 2, 'CLOSED', '온도 주의 해제', '2공장 · 차체 공정 · 용접 라인', 'TE-204', 'TEMP', 38, '℃', 35, '13:12:05'),
  alarm(1035, 5, 'CLOSED', 'CO 주의 해제', '5공장 · 도장 공정 · 중도 건조로 버너실', 'CO-12', 'CO', 21, 'ppm', 20, '11:32:10'),
  alarm(1031, 1, 'CLOSED', 'CO 주의 해제', '1공장 · 도장 공정 · 버너실', 'CO-112', 'CO', 12, 'ppm', 10, '10:47:31'),
  alarm(1029, 6, 'CLOSED', '전류 주의 해제', '엔진·변속기 공장 · 가공 라인', 'CT-631', 'CURRENT', 9.8, 'A', 9.5, '09:20:14'),
  alarm(1027, 5, 'CLOSED', '전류 주의 해제', '5공장 · 도장 공정 · 전처리 순환펌프', 'CT-11', 'CURRENT', 12.4, 'A', 12, '08:47:55'),
  alarm(1019, 2, 'CLOSED', '온도 주의 해제', '2공장 · 프레스 공정 · 유압 펌프', 'TE-118', 'TEMP', 61, '℃', 60, '02:13:40'),
]
