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
 * 사업장 이름 (상단 바의 사업장 표시용)
 * - 명세서에 이름만 주는 API 가 없어서, 실제 연결 시에는 사업장 현황 응답의 site.name 을 씀
 *   (공장 담당자는 GET /sites 를 못 부르므로 overview 사용)
 * - TODO: 백엔드와 '이름만 주는 가벼운 API' 또는 GET /me 의 scope.siteName 사용 여부 합의
 * @returns {Promise<string>}
 */
export async function getSiteName(siteId) {
  const id = Number(siteId)
  if (USE_MOCK) {
    const site = MOCK_SITES.find((s) => s.id === id)
    return site ? mockOk(site.name) : mockFail({ code: 'NOT_FOUND', message: '사업장을 찾을 수 없습니다.', status: 404 })
  }
  const overview = await http.get(`/sites/${id}/overview`)
  return overview.site.name
}
