/**
 * 인증 API
 * - 주소와 요청·응답 필드는 백엔드와 합의 전 가정 → 확정되면 여기만 수정
 */
import http from './http'

/**
 * 로그인
 * @param {{ loginId: string, password: string }} payload
 * @returns {Promise<{ accessToken: string, refreshToken: string, user: object }>}
 *   user 예시: { id, name, role, factoryId }
 */
export function login(payload) {
  return http.post('/auth/login', payload)
}

/** 로그아웃 (서버에 리프레시 토큰 폐기 요청) */
export function logout() {
  return http.post('/auth/logout')
}
