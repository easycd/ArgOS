/**
 * 공장 API (설계 자료 API 명세서 B2 '5공장 공정 현황' 기준)
 * - GET /factories/{factoryId}/overview : 공정 건물 상태, 공정 카드, 열화상 카메라
 * - 이 공장의 알림·시간대별 알림은 api/dashboard.js 의 getAlarms·getHourlyAlarms 에 factoryId 로
 */
import http from './http'
import { USE_MOCK, mockFail, mockOk } from './mock'
import { MOCK_FACTORY_DETAILS, MOCK_SITE_TREES } from './mock/data'

/**
 * 공장 현황
 * @returns {Promise<{ factory: { id, name, level }, processes: Array, cameras: Array }>}
 *   processes[]: { id, code, name, level, equipmentCount, equipmentLevels, sensorCount,
 *                  levelsByType, abnormal, thermalMax, hasFloorplan }
 */
export function getFactoryOverview(factoryId) {
  const id = Number(factoryId)
  if (USE_MOCK) {
    const detail = MOCK_FACTORY_DETAILS[id]
    const factory = Object.values(MOCK_SITE_TREES)
      .flatMap((tree) => tree.factories)
      .find((f) => f.id === id)
    if (!detail || !factory) {
      return mockFail({ code: 'NOT_FOUND', message: '공정 배치도가 등록되지 않은 공장입니다.', status: 404 })
    }
    return mockOk({
      factory: { id: factory.id, name: factory.name, level: factory.level },
      processes: detail.processes,
      cameras: detail.cameras,
    })
  }
  return http.get(`/factories/${id}/overview`)
}
