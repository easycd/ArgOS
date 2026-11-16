/**
 * 상단 바 숫자 API (설계 자료 API 명세서 I1 '상단 바')
 * - GET /notifications/summary : 알림 벨·채팅 아이콘·체크리스트 진행 표시에 쓰는 숫자
 * - TODO: 실시간(SSE) 연결 후에는 처음 한 번만 부르고 숫자는 SSE 로 갱신
 */
import http from './http'
import { USE_MOCK, mockOk } from './mock'
import { MOCK_ALARMS } from './mock/data'

/**
 * @returns {Promise<{ unackedAlarmCount: number, activeChecklistCount: number, unreadChatCount: number, activeFire: object|null }>}
 */
export function getNotificationSummary() {
  if (USE_MOCK) {
    return mockOk({
      // 예시 알림 중 아직 조치가 끝나지 않은 것 (5공장 CT-17 주의 1건)
      unackedAlarmCount: MOCK_ALARMS.filter((a) => a.status !== 'CLOSED').length,
      activeChecklistCount: 1,
      unreadChatCount: 2,
      activeFire: null,
    })
  }
  return http.get('/notifications/summary')
}
