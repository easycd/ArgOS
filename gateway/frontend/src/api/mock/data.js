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
    // 5공장 도장 공정 전류 센서 1개가 '주의' (아래 MOCK_SITE_TREES 와 맞춤)
    level: LEVEL.WARN,
    factoryCount: 6,
    processCount: 22,
    sensorCount: 112,
    sensorLevels: levels(111, 1),
    todayAlarmCount: 4,
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

/* ───────── 사업장 펼치기 (GET /sites/{siteId}/tree) ─────────
 * 사업장 현황(GET /sites/{siteId}/overview)도 이 공장 목록으로 만듦 (api/dashboard.js) → 값이 항상 같음
 *
 * 지금 상황: 울산공장 5공장 도장 공정의 전류 센서 CT-17 이 '주의' (설계안 시연 '주의' 상황과 같음)
 * 다른 상황을 보고 싶으면 아래 5공장 줄을 고치면 됨
 *   - 정상: byType(9, 6, 4) 로, 공장·도장 공정 level 을 NORMAL, abnormal 을 [] 로
 *   - 경보: byType([8, 0, 1], 6, 4) 로, 공장·도장 공정 level 을 LEVEL.ALARM 으로
 *   (MOCK_SITES 의 울산공장 level·sensorLevels 도 같이 맞추기)
 */

let processId = 1
/** 공정 목록 만들기 (이름 → 모두 정상, 이상 센서 없음) */
const processes = (...names) => names.map((name) => ({ id: processId++, name, level: NORMAL, abnormal: [] }))
const CAR = ['프레스 공정', '차체 공정', '도장 공정', '의장 공정']
const ENGINE = ['가공 공정', '조립 공정']

/** 센서 종류별 단계 개수 (전류·온도·CO) — 숫자 하나면 모두 정상, 배열이면 [정상, 주의, 경보] */
const byType = (current, temp, co) => {
  const toLevels = (v) => (Array.isArray(v) ? levels(...v) : levels(v))
  return { CURRENT: toLevels(current), TEMP: toLevels(temp), CO: toLevels(co) }
}

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

/** 5공장: 도장 공정 전류 센서 1개 '주의' */
const plant5 = {
  ...factory(5, 'P5', '5공장', CAR, byType([8, 1, 0], 6, 4), 1),
  level: LEVEL.WARN,
}
plant5.processes = plant5.processes.map((p) =>
  p.name === '도장 공정'
    ? {
        ...p,
        level: LEVEL.WARN,
        abnormal: [{ sensorId: 117, tag: 'CT-17', type: 'CURRENT', value: 22.4, unit: 'A', level: LEVEL.WARN }],
      }
    : p,
)

export const MOCK_SITE_TREES = {
  1: {
    siteId: 1,
    factories: [
      factory(1, 'P1', '1공장', CAR, byType(10, 7, 4), 1),
      factory(2, 'P2', '2공장', CAR, byType(8, 6, 4), 1),
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

/**
 * 울산공장 오늘 알림 (최근 순) — 설계안 '실시간 알림' 4건과 같은 내용
 * - status: OPEN(발생) → ACKED(확인) → ACTING(조치 중) → CLOSED(조치 완료)
 */
export const MOCK_ALARMS = {
  1: [
    {
      id: 1042, level: LEVEL.WARN, status: 'ACTING', title: '전류 주의 기준 초과',
      location: '5공장 · 도장 공정 · 상도 건조로 배기팬', equipmentId: 31, sensorId: 117,
      sensorTag: 'CT-17', sensorType: 'CURRENT', value: 22.4, unit: 'A', threshold: 21.6, raisedAt: todayAt('16:38:20'),
    },
    {
      id: 1038, level: LEVEL.WARN, status: 'CLOSED', title: '온도 주의 해제',
      location: '2공장 · 차체 공정 · 용접 라인', equipmentId: 12, sensorId: 204,
      sensorTag: 'TE-204', sensorType: 'TEMP', value: 38, unit: '℃', threshold: 35, raisedAt: todayAt('13:12:05'),
    },
    {
      id: 1031, level: LEVEL.WARN, status: 'CLOSED', title: 'CO 주의 해제',
      location: '1공장 · 도장 공정 · 버너실', equipmentId: 8, sensorId: 112,
      sensorTag: 'CO-112', sensorType: 'CO', value: 12, unit: 'ppm', threshold: 10, raisedAt: todayAt('10:47:31'),
    },
    {
      id: 1027, level: LEVEL.WARN, status: 'CLOSED', title: '전류 주의 해제',
      location: '엔진·변속기 공장 · 가공 라인', equipmentId: 52, sensorId: 631,
      sensorTag: 'CT-631', sensorType: 'CURRENT', value: 9.8, unit: 'A', threshold: 9.5, raisedAt: todayAt('09:20:14'),
    },
  ],
}

/**
 * 울산공장 시간대별 알림 (주간 07~19시, 야간 19~07시) — 알림이 있는 시간만 담음 (명세서와 같은 모양)
 */
export const MOCK_HOURLY = {
  1: {
    day: {
      alarmCount: 4,
      actionCount: 3,
      hours: [
        { hour: 9, warn: 1, alarm: 0, action: 1 },
        { hour: 10, warn: 1, alarm: 0, action: 1 },
        { hour: 13, warn: 1, alarm: 0, action: 1 },
        { hour: 16, warn: 1, alarm: 0, action: 0 },
      ],
    },
    night: {
      alarmCount: 2,
      actionCount: 2,
      hours: [
        { hour: 20, warn: 1, alarm: 0, action: 1 },
        { hour: 2, warn: 1, alarm: 0, action: 1 },
      ],
    },
  },
}
