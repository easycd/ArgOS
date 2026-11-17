/**
 * 알림 대응 API — 알림 (설계 자료 API 명세서 C1, 백엔드 gateway/backend .../alarm/AlarmController)
 * - GET  /alarms?status=OPEN,ACKED,ACTING : 지금 대응 중인 알림 (상단 바 상태 띠, 주의 창 자동 열기)
 * - GET  /alarms/{alarmId}                : 조치 내역 (실시간 알림 줄 펼치기)
 * - GET  /alarms/{alarmId}/detail         : 주의 상세 (원인, 그때 센서값, 열화상 1장, 추이, 원인 후보)
 * - POST /alarms/{alarmId}/ack            : 주의 확인 (2초 길게 누르기)
 */
import http from './http'
import { USE_MOCK, mockFail, mockOk } from './mock'
import { alarmDetail, alarmTimeline } from './mock/alertData'
import { mockAlarms } from './mock/data'
import { ackAlarm as mockAck } from './mock/scenario'

const ACTIVE = ['OPEN', 'ACKED', 'ACTING']
const notFound = () => mockFail({ code: 'ALARM_NOT_FOUND', message: '없는 알림입니다.', status: 404 })

/**
 * 지금 대응 중인 알림 (오늘, 조치 완료 전)
 * @param {{ siteId?: number, factoryId?: number }} scope 공장 담당자는 담당 범위를 넘김 (서버도 범위를 거름)
 * @returns {Promise<Array>} GET /alarms 의 items 와 같은 모양 (checklist, assignee 포함)
 */
export async function getActiveAlarms({ siteId, factoryId } = {}) {
  if (USE_MOCK) {
    const list = mockAlarms().filter(
      (a) => ACTIVE.includes(a.status) && (!siteId || a.siteId === Number(siteId)) && (!factoryId || a.factoryId === Number(factoryId)),
    )
    return mockOk(list)
  }
  const params = { status: ACTIVE.join(','), date: 'today', size: 50, ...(factoryId ? { factoryId } : siteId ? { siteId } : {}) }
  const page = await http.get('/alarms', { params })
  return page.items
}

/** 조치 내역: { id, status, title, timeline: [{ step, at, by, text }], checklist } */
export function getAlarmTimeline(alarmId) {
  if (USE_MOCK) {
    const data = alarmTimeline(alarmId)
    return data ? mockOk(data) : notFound()
  }
  return http.get(`/alarms/${alarmId}`)
}

/** 주의 상세 */
export function getAlarmDetail(alarmId) {
  if (USE_MOCK) {
    const data = alarmDetail(alarmId)
    return data ? mockOk(data) : notFound()
  }
  return http.get(`/alarms/${alarmId}/detail`)
}

/**
 * 주의 확인
 * @param {number} alarmId
 * @param {string} userName 예시 데이터에서 '누가 확인했는지' 기록용 (실제 서버는 토큰으로 앎)
 */
export function ackAlarm(alarmId, userName) {
  if (USE_MOCK) {
    if (!mockAck(userName)) return mockFail({ code: 'ALREADY_ACKED', message: '이미 다른 사람이 확인한 알림입니다.', status: 409 })
    return mockOk({ id: Number(alarmId), status: 'ACKED' })
  }
  return http.post(`/alarms/${alarmId}/ack`)
}
