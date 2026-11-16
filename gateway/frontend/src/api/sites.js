/**
 * 사업장·공장 API (설계 자료 API 명세서 A2 기준)
 * - 주소 이름 규칙: 사업장 /sites, 공장 /factories (DB 의 plant 테이블 = 사업장)
 */
import http from './http'
import { USE_MOCK, mockFail, mockOk } from './mock'
import { MOCK_SITES, MOCK_SITE_TREES } from './mock/data'

/** 사업장 목록: 지도·도넛·목록 머리줄 (GET /sites) */
export function getSites() {
  if (USE_MOCK) return mockOk(MOCK_SITES)
  return http.get('/sites')
}

/** 사업장 펼치기: 공장 → 공정 → 이상 센서 (GET /sites/{siteId}/tree) */
export function getSiteTree(siteId) {
  if (USE_MOCK) {
    const tree = MOCK_SITE_TREES[siteId]
    return tree ? mockOk(tree) : mockFail({ code: 'NOT_FOUND', message: '사업장을 찾을 수 없습니다.', status: 404 })
  }
  return http.get(`/sites/${siteId}/tree`)
}

/**
 * 공장 이름 (상단 바 표시용)
 * - 명세서에는 공장 하나만 조회하는 API 가 없음
 * - TODO: 공장 대시보드 작업 때 GET /factories/{factoryId}/overview 응답으로 바꿈
 * @returns {Promise<{ id: number, name: string, siteId: number, siteName: string }>}
 */
export async function getFactoryName(factoryId) {
  const id = Number(factoryId)
  if (USE_MOCK) {
    for (const site of MOCK_SITES) {
      const factory = MOCK_SITE_TREES[site.id]?.factories.find((f) => f.id === id)
      if (factory) return mockOk({ id, name: factory.name, siteId: site.id, siteName: site.name })
    }
    return mockFail({ code: 'NOT_FOUND', message: '공장을 찾을 수 없습니다.', status: 404 })
  }
  const overview = await http.get(`/factories/${id}/overview`)
  return { id, name: overview.name, siteId: overview.siteId, siteName: overview.siteName }
}
