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
    level: NORMAL,
    factoryCount: 6,
    processCount: 22,
    sensorCount: 112,
    sensorLevels: levels(112),
    todayAlarmCount: 2,
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

/* ───────── 사업장 펼치기 (GET /sites/{siteId}/tree) ───────── */

let processId = 1
/** 공정 목록 만들기 (이름 → 모두 정상, 이상 센서 없음) */
const processes = (...names) => names.map((name) => ({ id: processId++, name, level: NORMAL, abnormal: [] }))
const CAR = ['프레스 공정', '차체 공정', '도장 공정', '의장 공정']
const ENGINE = ['가공 공정', '조립 공정']

/** 센서 종류별 단계 개수 (전류·온도·CO) */
const byType = (current, temp, co) => ({ CURRENT: levels(current), TEMP: levels(temp), CO: levels(co) })

/**
 * 공장 한 줄
 * - todayAlarmCount: 명세서 tree 응답에는 없지만 화면 '오늘 알림' 칸에 필요해서 추가 (backend-notes.md 에 요청)
 */
const factory = (id, name, procNames, types, todayAlarmCount) => ({
  id,
  name,
  level: NORMAL,
  levelsByType: types,
  processes: processes(...procNames),
  todayAlarmCount,
})

export const MOCK_SITE_TREES = {
  1: {
    siteId: 1,
    factories: [
      factory(1, '1공장', CAR, byType(10, 7, 4), 0),
      factory(2, '2공장', CAR, byType(8, 6, 4), 1),
      factory(3, '3공장', CAR, byType(9, 7, 4), 0),
      factory(4, '4공장', CAR, byType(8, 5, 4), 0),
      factory(5, '5공장', CAR, byType(9, 6, 4), 0),
      factory(6, '엔진·변속기 공장', ENGINE, byType(8, 5, 4), 1),
    ],
  },
  2: {
    siteId: 2,
    factories: [
      factory(7, '승용 1공장', CAR, byType(13, 9, 6), 1),
      factory(8, '엔진공장', ENGINE, byType(8, 6, 4), 0),
    ],
  },
  3: {
    siteId: 3,
    factories: [
      factory(9, '상용 1공장', CAR, byType(10, 7, 5), 0),
      factory(10, '상용 2공장', ['차체 공정', '도장 공정', '의장 공정'], byType(7, 5, 4), 0),
    ],
  },
}
