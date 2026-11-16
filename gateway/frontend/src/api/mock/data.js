/**
 * 예시 데이터 (백엔드 개발 전 화면 확인용)
 * - 필드 이름·모양은 docs/backend-notes.md 의 응답 예시와 같게 유지
 * - 값을 바꾸면 화면에서 바로 확인 가능 (예: level 을 'ALARM' 으로)
 */
import { LEVEL, ROLE } from '@/types/codes'

/**
 * 예시 로그인 계정 (비밀번호는 모두 argos1234)
 * - 실제 서비스 계정이 아님. 백엔드가 생기면 이 목록은 쓰지 않음
 */
export const MOCK_PASSWORD = 'argos1234'

export const MOCK_USERS = [
  { id: 1, loginId: 'hq_admin', name: '본사 관리자', role: ROLE.HQ_ADMIN, factoryId: null },
  { id: 2, loginId: 'ulsan5_admin', name: '울산 5공장 담당자', role: ROLE.PLANT_ADMIN, factoryId: 'ulsan-5' },
]

/**
 * 사업장 목록 (GET /sites)
 * - lat, lng: 지도에 점을 찍기 위한 위경도
 * - level: 사업장 안 공장 중 가장 높은 상태
 * - 이번 범위는 울산 5공장만 진입 가능 (enabled)
 */
export const MOCK_SITES = [
  {
    id: 'ulsan',
    name: '울산',
    lat: 35.54,
    lng: 129.31,
    level: LEVEL.WARN,
    alarmCount: 2,
    factories: [{ id: 'ulsan-5', name: '울산 5공장', level: LEVEL.WARN, alarmCount: 2, enabled: true }],
  },
  {
    id: 'asan',
    name: '아산',
    lat: 36.79,
    lng: 127.0,
    level: LEVEL.NORMAL,
    alarmCount: 0,
    factories: [],
  },
  {
    id: 'jeonju',
    name: '전주',
    lat: 35.82,
    lng: 127.15,
    level: LEVEL.NORMAL,
    alarmCount: 0,
    factories: [],
  },
]
