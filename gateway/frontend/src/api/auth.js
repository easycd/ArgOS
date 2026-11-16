/**
 * 인증 API
 * - 주소와 요청·응답 필드는 백엔드와 합의 전 가정 (docs/backend-notes.md 참고)
 * - mock 모드에서는 예시 계정(api/mock/data.js)으로 로그인
 */
import http from './http'
import { USE_MOCK, mockFail, mockOk } from './mock'
import { MOCK_PASSWORD, MOCK_USERS } from './mock/data'

/**
 * 로그인
 * @param {{ loginId: string, password: string }} payload
 * @returns {Promise<{ accessToken: string, refreshToken: string, user: object }>}
 *   user: { id, name, role, factoryId }
 */
export function login(payload) {
  if (USE_MOCK) {
    const found = MOCK_USERS.find((u) => u.loginId === payload.loginId)
    if (!found || payload.password !== MOCK_PASSWORD) {
      return mockFail({ code: 'AUTH_INVALID', message: '아이디 또는 비밀번호가 올바르지 않습니다.', status: 401 })
    }
    // loginId 는 화면에 필요 없으므로 user 에서 제외
    const { loginId, ...user } = found
    return mockOk({ accessToken: `mock-access-${user.id}`, refreshToken: `mock-refresh-${user.id}`, user })
  }
  return http.post('/auth/login', payload)
}

/** 로그아웃 (서버에 리프레시 토큰 폐기 요청) */
export function logout() {
  if (USE_MOCK) return mockOk(null)
  return http.post('/auth/logout')
}
