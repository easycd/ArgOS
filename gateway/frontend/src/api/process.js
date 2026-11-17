/**
 * 공정 3D 배치도 API (설계 자료 API 명세서 B3 '도장 공정 3D 배치도' 기준)
 * - GET  /processes/{processId}/layout : 설비·센서 목록 (잘 안 바뀌는 값)
 * - GET  /processes/{processId}/status : 지금 값·단계, 배기팬 상태
 * - POST /equipment/{equipmentId}/fan  : 배기팬 켜기·끄기·회전수 (명령 접수만, 결과는 SSE command.result)
 * - GET  /inspections/today            : 오늘 설비 점검 목록
 */
import http from './http'
import { USE_MOCK, mockFail, mockOk } from './mock'
import { mockProcess } from './mock/processData'

const notFound = () => mockFail({ code: 'NOT_FOUND', message: '설비 배치도가 등록되지 않은 공정입니다.', status: 404 })

/** 배치도: { processId, name, equipment: [...], sensors: [...] } */
export function getProcessLayout(processId) {
  const data = mockProcess(processId)
  if (USE_MOCK) return data ? mockOk(data.layout) : notFound()
  return http.get(`/processes/${processId}/layout`)
}

/** 지금 값·단계: { processId, level, equipment: [{ id, level, runState, fan }], sensors: [{ id, tag, value, level, warn, alarm }] } */
export function getProcessStatus(processId) {
  const data = mockProcess(processId) // 부를 때마다 지금 예시 상황으로 만듦
  if (USE_MOCK) return data ? mockOk(data.status) : notFound()
  return http.get(`/processes/${processId}/status`)
}

/**
 * 배기팬 명령
 * @param {number} equipmentId
 * @param {{ power?: 'ON'|'OFF', rpm?: number }} command 끄기·켜기 또는 회전수(600~1800) 중 하나
 * @returns {Promise<{ commandId: number, status: 'SENT' }>}
 * - 예시 데이터 모드에서는 실제 설비에 아무 명령도 보내지 않고 '접수됨'만 돌려줌
 */
export function sendFanCommand(equipmentId, command) {
  if (USE_MOCK) {
    if (command.rpm != null && (command.rpm < 600 || command.rpm > 1800)) {
      return mockFail({ code: 'RPM_OUT_OF_RANGE', message: '회전수는 600~1,800 사이로 입력해 주세요.', status: 400 })
    }
    return mockOk({ commandId: Date.now() % 100000, status: 'SENT' })
  }
  return http.post(`/equipment/${equipmentId}/fan`, command)
}

/** 오늘 설비 점검: { doneCount, totalCount, items: [{ scheduleId, time, equipmentName, title, assignee, status }] } */
export function getTodayInspections(processId) {
  const data = mockProcess(processId)
  if (USE_MOCK) return mockOk(data?.inspections ?? { doneCount: 0, totalCount: 0, items: [] })
  return http.get('/inspections/today', { params: { processId } })
}
