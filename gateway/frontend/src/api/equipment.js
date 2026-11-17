/**
 * 설비 상세 API (설계 자료 API 명세서 B4 '설비 상세' 기준)
 * - GET /equipment/{equipmentId}         : 설비 정보 · 센서 · 기준값 · 진행 중 체크리스트
 * - GET /equipment/{equipmentId}/events  : 오늘 이벤트 이력 (알람 · 조치 · 기준값 조정)
 * - GET /thermal/{cameraId}/latest       : 열화상 최신 장면 (최고·최저 온도)
 * - GET /sensors/series                  : 센서 추이 (전날 겹쳐 보기 compare=yesterday)
 */
import http from './http'
import { USE_MOCK, mockFail, mockOk } from './mock'
import { serverNow } from './clock'
import { TOP_OVEN_ID, mockEquipment, mockEquipmentEvents, thermalOf } from './mock/equipmentData'
import { buildSeries } from './mock/equipmentSeries'
import { scenario } from './mock/scenario'
import { LEVEL } from '@/types/codes'

const notFound = () => mockFail({ code: 'EQUIPMENT_NOT_FOUND', message: '없는 설비입니다.', status: 404 })

/** 설비 정보: { id, code, name, processId, seq, path, level, runState, sensors: [...], cameraId, activeChecklist } */
export function getEquipment(equipmentId) {
  if (USE_MOCK) {
    const data = mockEquipment(equipmentId) // 지금 예시 상황으로 만듦
    return data ? mockOk(data) : notFound()
  }
  return http.get(`/equipment/${equipmentId}`)
}

/** 오늘 이벤트 이력: [{ at, type, level, text, detail, by, status, alarmId }] (최근이 위) */
export function getEquipmentEvents(equipmentId) {
  if (USE_MOCK) return mockOk(mockEquipmentEvents(equipmentId))
  return http.get(`/equipment/${equipmentId}/events`, { params: { date: 'today' } })
}

/**
 * 열화상 최신 장면: { imageUrl, capturedAt, max, min, avg, maxPoint, scale, zone }
 * - equipmentId: 이 설비 구역의 최고·최저 온도를 받기 위해 붙임 (명세서에 없음, backend-notes 참고)
 */
export function getThermalLatest(cameraId, equipmentId) {
  if (USE_MOCK) return mockOk(thermalOf(cameraId, equipmentId))
  return http.get(`/thermal/${cameraId}/latest`, { params: { equipmentId } })
}

/** 범위 → 요청 기간·간격 ('1h' = 최근 1시간 1분 간격, '6h' = 최근 6시간, 'today' = 오늘 0시부터) */
function periodOf(range) {
  const to = serverNow() // 시연 시계 기준 (PC 시계면 서버 데이터와 날짜가 어긋남)
  const from = new Date(to)
  if (range === '1h') from.setHours(to.getHours() - 1)
  else if (range === '6h') from.setHours(to.getHours() - 6)
  else from.setHours(0, 0, 0, 0)
  return { from: from.toISOString(), to: to.toISOString(), step: range === '1h' ? '1m' : '10m' }
}

/**
 * 센서 추이
 * @param {{ equipment: object, range: '1h'|'6h'|'today' }} params equipment 는 getEquipment 응답
 * @returns {Promise<{ step, series: [{ sensorId, tag, unit, warn, alarm, points: [[시각, 값]], compare: [[시각, 값]] }] }>}
 * - 전날 값(compare)은 늘 같이 받고, '전날 같이 보기' 스위치는 화면에서 보이기만 바꿈
 */
export function getSensorSeries({ equipment, range }) {
  if (USE_MOCK) {
    // 상도 건조로가 주의일 때만 16:30 부터 값이 오르는 그래프, 그 밖에는 평소 값 근처
    const rising = equipment.id === TOP_OVEN_ID && scenario.state === LEVEL.WARN
    return mockOk(buildSeries(equipment.sensors, rising, range))
  }
  const ids = equipment.sensors.map((s) => s.id).join(',')
  return http.get('/sensors/series', { params: { ids, ...periodOf(range), compare: 'yesterday' } })
}
