/**
 * 권한별 첫 화면
 * - 로그인 직후, 권한 없는 주소로 들어왔을 때, 로고를 눌렀을 때 이동할 곳
 * - 별도 파일로 둔 이유: 상단 바 같은 컴포넌트가 router/index.js 를 import 하면 순환이 생김
 */
import { ROLE } from '@/types/codes'

/** 공장 담당자의 담당 공장 ID 목록 (로그인 응답 user.scope.factoryIds) */
export function factoryIdsOf(user) {
  return user?.scope?.factoryIds ?? []
}

export function homeRouteOf(user) {
  if (user?.role === ROLE.HQ_ADMIN) {
    return { name: 'site-select' }
  }
  // 공장 담당자: 담당 공장 중 첫 번째 공장 대시보드
  const [factoryId] = factoryIdsOf(user)
  if (user?.role === ROLE.PLANT_ADMIN && factoryId) {
    return { name: 'dashboard', params: { factoryId } }
  }
  return { name: 'login' }
}
