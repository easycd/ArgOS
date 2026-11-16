/**
 * 대시보드 API (설계 자료 API 명세서 B1 '울산공장 현황' 기준)
 * - GET /sites/{siteId}/overview : 지도·공장 카드·센서 종류별 도넛
 * - GET /alarms                  : 실시간 알림 목록 (오늘, 최근 순)
 * - GET /alarms/hourly           : 시간대별 알림 (주간·야간)
 */
import http from './http'
import { USE_MOCK, mockFail, mockOk } from './mock'
import { MOCK_ALARMS, MOCK_HOURLY, MOCK_SITES, MOCK_SITE_TREES } from './mock/data'
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
 * 오늘 알림 목록 (최근 순)
 * @param {{ siteId: number, size?: number }} params
 * @returns {Promise<{ items: Array, page: number, size: number, total: number }>}
 */
export function getAlarms({ siteId, size = 20 }) {
  if (USE_MOCK) {
    const items = (MOCK_ALARMS[Number(siteId)] ?? []).slice(0, size)
    return mockOk({ items, page: 0, size, total: items.length })
  }
  return http.get('/alarms', { params: { siteId, date: 'today', size } })
}

/**
 * 시간대별 알림 (주간 07~19시, 야간 19~07시)
 * @returns {Promise<{ day: { alarmCount, actionCount, hours }, night: { ... } }>}
 */
export function getHourlyAlarms({ siteId }) {
  if (USE_MOCK) {
    const hourly = MOCK_HOURLY[Number(siteId)] ?? {
      day: { alarmCount: 0, actionCount: 0, hours: [] },
      night: { alarmCount: 0, actionCount: 0, hours: [] },
    }
    return mockOk(hourly)
  }
  return http.get('/alarms/hourly', { params: { siteId, date: 'today' } })
}
