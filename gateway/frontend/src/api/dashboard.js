/**
 * 대시보드 API (설계 자료 API 명세서 B1 '울산공장 현황' 기준)
 * - GET /sites/{siteId}/overview : 지도·공장 카드·센서 종류별 도넛
 * - GET /alarms                  : 실시간 알림 목록 (오늘, 최근 순)
 * - GET /alarms/hourly           : 시간대별 알림 (주간·야간)
 */
import http from './http'
import { USE_MOCK, mockFail, mockOk } from './mock'
import { MOCK_ALARMS, MOCK_SITES, MOCK_SITE_TREES } from './mock/data'
import { factoryLevels, sumLevels } from '@/features/site/siteStats'

const SENSOR_TYPES = ['CURRENT', 'TEMP', 'CO']

/**
 * 예시 데이터로 사업장 현황 응답 만들기
 * - 사업장 펼치기(tree) 예시 데이터를 그대로 써서 사업장 선택 화면과 숫자가 항상 같게 함
 */
function mockOverview(siteId) {
  const site = MOCK_SITES.find((s) => s.id === siteId)
  const tree = MOCK_SITE_TREES[siteId]
  if (!site || !tree) return null

  // 사업장 전체 센서 종류별 개수 = 공장들의 같은 종류 개수 합
  const levelsByType = Object.fromEntries(
    SENSOR_TYPES.map((type) => [type, sumLevels(tree.factories.map((f) => f.levelsByType[type]))]),
  )

  return {
    site: { id: site.id, name: site.name, level: site.level, mapUrl: null },
    levelsByType,
    factories: tree.factories.map((f) => {
      const counts = factoryLevels(f)
      return {
        id: f.id,
        code: f.code,
        name: f.name,
        level: f.level,
        levelsByType: f.levelsByType,
        sensorCount: counts.NORMAL + counts.WARN + counts.ALARM,
        todayAlarmCount: f.todayAlarmCount,
        processes: f.processes.map(({ id, name, level }) => ({ id, name, level })),
      }
    }),
  }
}

/** 사업장 현황 */
export function getSiteOverview(siteId) {
  const id = Number(siteId)
  if (USE_MOCK) {
    const overview = mockOverview(id)
    return overview ? mockOk(overview) : mockFail({ code: 'NOT_FOUND', message: '사업장을 찾을 수 없습니다.', status: 404 })
  }
  return http.get(`/sites/${id}/overview`)
}

/**
 * 범위(사업장 또는 공장)에 맞는 예시 알림 고르기
 * - 명세서: 범위는 siteId · factoryId 중 하나만 보냄
 */
function mockAlarmsOf({ siteId, factoryId }) {
  if (factoryId) return MOCK_ALARMS.filter((a) => a.factoryId === Number(factoryId))
  return MOCK_ALARMS.filter((a) => a.siteId === Number(siteId))
}

/** 범위 파라미터: factoryId 가 있으면 공장, 없으면 사업장 */
const scopeParams = ({ siteId, factoryId }) => (factoryId ? { factoryId } : { siteId })

/**
 * 오늘 알림 목록 (최근 순)
 * @param {{ siteId?: number, factoryId?: number, size?: number }} params
 * @returns {Promise<{ items: Array, page: number, size: number, total: number }>}
 */
export function getAlarms({ siteId, factoryId, size = 20 }) {
  if (USE_MOCK) {
    // 예시 데이터에만 있는 범위 값(siteId·factoryId)은 빼고 응답 모양만 남김
    const all = mockAlarmsOf({ siteId, factoryId }).map(({ siteId: _s, factoryId: _f, ...item }) => item)
    return mockOk({ items: all.slice(0, size), page: 0, size, total: all.length })
  }
  return http.get('/alarms', { params: { ...scopeParams({ siteId, factoryId }), date: 'today', size } })
}

/**
 * 예시 알림 목록으로 시간대별 알림 만들기 (주간 07~18시, 야간 19~06시)
 * - 주의 → warn, 경보·화재 → alarm, 조치 완료(CLOSED) → action
 */
function mockHourlyOf(alarms) {
  const shift = () => ({ alarmCount: 0, actionCount: 0, hours: [] })
  const result = { day: shift(), night: shift() }
  for (const a of alarms) {
    const hour = Number(a.raisedAt.slice(11, 13))
    const s = hour >= 7 && hour < 19 ? result.day : result.night
    let row = s.hours.find((h) => h.hour === hour)
    if (!row) s.hours.push((row = { hour, warn: 0, alarm: 0, action: 0 }))
    if (a.level === 'WARN') row.warn += 1
    else row.alarm += 1
    s.alarmCount += 1
    if (a.status === 'CLOSED') {
      row.action += 1
      s.actionCount += 1
    }
  }
  return result
}

/**
 * 시간대별 알림 (주간 07~19시, 야간 19~07시)
 * @param {{ siteId?: number, factoryId?: number }} params
 * @returns {Promise<{ day: { alarmCount, actionCount, hours }, night: { ... } }>}
 */
export function getHourlyAlarms({ siteId, factoryId }) {
  if (USE_MOCK) return mockOk(mockHourlyOf(mockAlarmsOf({ siteId, factoryId })))
  return http.get('/alarms/hourly', { params: { ...scopeParams({ siteId, factoryId }), date: 'today' } })
}
