/**
 * 사업장·공장 API
 * - 주소 이름 규칙: 사업장 /sites, 공장 /factories
 * - 응답 필드는 백엔드와 합의 전 가정 (docs/backend-notes.md 참고)
 */
import http from './http'
import { USE_MOCK, mockFail, mockOk } from './mock'
import { MOCK_SITES } from './mock/data'

/** 사업장 목록 (사업장 선택 화면) */
export function getSites() {
  if (USE_MOCK) return mockOk(MOCK_SITES)
  return http.get('/sites')
}

/**
 * 공장 기본 정보 (상단 바의 공장 이름 등)
 * @returns {Promise<{ id: string, name: string, siteId: string, level: string }>}
 */
export function getFactory(factoryId) {
  if (USE_MOCK) {
    for (const site of MOCK_SITES) {
      const factory = site.factories.find((f) => f.id === factoryId)
      if (factory) return mockOk({ id: factory.id, name: factory.name, siteId: site.id, level: factory.level })
    }
    return mockFail({ code: 'FACTORY_NOT_FOUND', message: '공장을 찾을 수 없습니다.', status: 404 })
  }
  return http.get(`/factories/${factoryId}`)
}
