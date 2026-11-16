/**
 * 예시 데이터(mock) 모드 공통 함수
 *
 * - 백엔드 개발 전이므로 기본값은 mock 모드 (API 모듈이 예시 데이터를 돌려줌)
 * - 실제 백엔드에 붙일 때: .env 에 VITE_USE_MOCK=false → API 모듈이 http(Axios)로 요청
 * - 화면은 항상 src/api 모듈만 부르므로 모드가 바뀌어도 화면 코드는 그대로
 */
import { ApiError } from '../http'

/** true 면 예시 데이터 사용 */
export const USE_MOCK = import.meta.env.VITE_USE_MOCK !== 'false'

/** 실제 네트워크처럼 보이도록 넣는 지연 시간(ms) */
const DELAY = 200

/**
 * 성공 응답 흉내: http.js 가 { success, data } 에서 data 만 꺼내 주는 것과 같은 모양으로 반환
 * - 화면이 받은 값을 고쳐도 원본 예시 데이터가 바뀌지 않도록 복사본을 돌려줌
 */
export function mockOk(data) {
  return new Promise((resolve) => {
    setTimeout(() => resolve(structuredClone(data)), DELAY)
  })
}

/** 실패 응답 흉내: http.js 와 같은 ApiError 를 던짐 */
export function mockFail({ code, message, status = 400 }) {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new ApiError({ code, message, status })), DELAY)
  })
}
