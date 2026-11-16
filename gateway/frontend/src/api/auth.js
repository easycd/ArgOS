/**
 * 인증 API (설계 자료 API 명세서 A1 기준)
 * - mock 모드에서는 예시 계정(api/mock/data.js)으로 로그인
 * - 리프레시 토큰: 웹은 서버가 HttpOnly 쿠키(argos_rt)로 줌 → 프론트는 저장하지 않음
 */
import http from './http'
import { USE_MOCK, mockFail, mockOk } from './mock'
import { MOCK_PASSWORD, MOCK_USERS } from './mock/data'
import { ROLE } from '@/types/codes'

/**
 * 로그인
 * @param {{ loginId: string, password: string }} payload
 * @returns {Promise<{ accessToken, expiresIn, pwResetRequired, firstPage, user }>}
 *   user: { id, loginId, name, role, scope: { siteId, factoryIds, processIds } }
 */
export function login({ loginId, password }) {
  if (USE_MOCK) {
    const found = MOCK_USERS.find((u) => u.loginId === loginId)
    if (!found || password !== MOCK_PASSWORD) {
      return mockFail({ code: 'AUTH_INVALID', message: '아이디 또는 비밀번호가 맞지 않습니다', status: 401 })
    }
    return mockOk({
      accessToken: `mock-access-${found.id}`,
      expiresIn: 1800,
      pwResetRequired: false,
      firstPage: found.role === ROLE.HQ_ADMIN ? 'SITE_SELECT' : 'FACTORY_DASHBOARD',
      user: found,
    })
  }
  // client: 웹(WEB) / 앱(APP) 구분 — 서버가 권한별 접속 기기를 검사함
  return http.post('/auth/login', { loginId, password, client: 'WEB' })
}

/** 로그아웃 (서버에서 리프레시 토큰 삭제) */
export function logout() {
  if (USE_MOCK) return mockOk(null)
  return http.post('/auth/logout')
}
