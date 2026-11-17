/**
 * 통계·이력 관리 API (설계 자료 API 명세서 D1, 백엔드 gateway/backend .../stats/StatsController)
 * - GET /stats/summary    : 요약 4칸 (직전 같은 길이 기간 대비 diff)
 * - GET /stats/trend      : 알림 추이 (unit HOUR · DAY · WEEK — 비우면 서버가 기간으로 정함)
 * - GET /stats/by-process : 공정별 · 센서 종류별 건수
 * - GET /stats/heatmap    : 요일(월=1) × 시간(0~23) 건수
 * - GET /stats/alarms     : 알림 이력 표 (page 는 0부터)
 * - GET /stats/export     : CSV 파일 (format=xlsx 도 지금은 CSV)
 * - GET /reports/monthly  : 월별 보고서 PDF (명세서에만 있음, 백엔드 아직 없음)
 *
 * 조건(criteria) 모양: { from, to ('YYYY-MM-DD'), siteId, factoryId, processId, sensorType, level, shift }
 * - 빈 값('' · null)은 보내지 않음
 * - siteId 는 백엔드가 아직 받지 않음 (backend-notes 12장) — 예시 데이터는 사업장으로 거름
 */
import http from './http'
import { USE_MOCK, mockFail, mockOk } from './mock'
import {
  alarms as mockAlarmsPage,
  byProcess,
  exportCsv,
  heatmap,
  monthlyReport,
  monthlyReports,
  rangeError,
  summary,
  trend,
} from './mock/statsData'

/** 빈 값 빼기 */
const clean = (obj) => Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== '' && v != null))

/** 예시 모드 공통: 기간 검사 → 계산 결과 */
function mock(c, fn) {
  const error = rangeError(c)
  return error ? mockFail(error) : mockOk(fn(c))
}

export function getStatsSummary(c) {
  if (USE_MOCK) return mock(c, summary)
  return http.get('/stats/summary', { params: clean(c) })
}

/** @returns {{ unit, points: [{ key, warn, alarm, day, night }] }} */
export function getStatsTrend(c) {
  if (USE_MOCK) return mock(c, (x) => trend(x))
  return http.get('/stats/trend', { params: clean(c) })
}

/** @returns {Array<{ processId, processName, CURRENT, TEMP, CO, IR, total }>} 많은 순 */
export function getStatsByProcess(c) {
  if (USE_MOCK) return mock(c, byProcess)
  return http.get('/stats/by-process', { params: clean(c) })
}

/** @returns {{ max, cells: [{ dow, hour, count }] }} 0건 칸은 없음 */
export function getStatsHeatmap(c) {
  if (USE_MOCK) return mock(c, heatmap)
  return http.get('/stats/heatmap', { params: clean(c) })
}

/**
 * 알림 이력 표
 * @param {object} c 조건 + { status: 'ACTIVE' | 'CLOSED' | '' (탭, 추가 요청), page (0부터), size, sort }
 * @returns {{ items, page, size, total }}
 */
export function getStatsAlarms(c) {
  if (USE_MOCK) return mock(c, mockAlarmsPage)
  return http.get('/stats/alarms', { params: clean(c) })
}

/**
 * 내보내기 → { fileName, blob }
 * - 백엔드는 xlsx 를 골라도 CSV 를 줌 → 파일은 언제나 .csv
 */
export async function exportStats(c, format = 'csv') {
  if (USE_MOCK) {
    const error = rangeError(c)
    if (error) return mockFail(error)
    const r = exportCsv(c)
    if (r.error) return mockFail(r.error)
    const data = await mockOk(r.data)
    return { fileName: data.fileName, blob: new Blob([data.text], { type: 'text/csv;charset=utf-8' }) }
  }
  const blob = await http.get('/stats/export', { params: clean({ ...c, format }), responseType: 'blob' })
  return { fileName: `ArgOS_alarm_${c.from.replace(/-/g, '')}_${c.to.replace(/-/g, '')}.csv`, blob }
}

/** 고를 수 있는 달 [{ month, ready, issuedAt, willIssueAt }] (예시 데이터만 — 백엔드 목록 API 없음) */
export function getMonthlyReports() {
  if (USE_MOCK) return mockOk(monthlyReports())
  return Promise.resolve(monthlyReports())
}

/** 월별 보고서 미리보기 내용 (예시 데이터만 — 명세서는 미리보기 없이 PDF 만) */
export function getMonthlyReport(month) {
  return mockOk(monthlyReport(month))
}

/** 월별 보고서 PDF → Blob (명세서 GET /reports/monthly, 백엔드 아직 없음) */
export function downloadMonthlyReport({ month, factoryId }) {
  if (USE_MOCK) return mockFail({ code: 'NOT_READY', message: '예시 데이터에는 PDF 파일이 없습니다. 백엔드 연결 후 내려받을 수 있습니다.', status: 400 })
  return http.get('/reports/monthly', { params: clean({ month, factoryId }), responseType: 'blob' })
}
