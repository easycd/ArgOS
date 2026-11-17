/**
 * 기준값 저장 (PUT /equipment/{id}/thresholds)
 * - 이 설비만: 지금 설비 한 번
 * - 건조로 3대 모두: 같은 공정의 건조로마다 그 설비 기준을 받아서(판 번호 포함) 같은 종류 센서에
 *   '바꾼 칸만' 같은 값을 넣어 저장 (안 바꾼 칸은 그 설비에 저장된 값 그대로)
 *   (명세서·백엔드에 '여러 설비 한 번에' API 가 없어 설비마다 부름 — backend-notes 11장)
 * - 지속 조건(초)은 그 계절 저장된 값을 그대로 보냄
 */
import { getThresholds, saveThresholds } from '@/api/thresholds'
import { num, savedOf } from './thresholdForm'

/** 설비 기준 + 종류별 바꾼 값 → PUT 요청 본문 */
function bodyOf(thresholds, changedByType, season, reason) {
  return {
    season,
    version: thresholds.version,
    reason,
    sensors: thresholds.sensors.map((s) => {
      // 그 설비에 저장된 값 위에 바꾼 칸만 덮어씀
      const v = { ...savedOf(s, season), ...changedByType[s.type] }
      const now = s.seasons[season]
      return { sensorId: s.sensorId, warn: v.warn, alarm: v.alarm, warnHoldSec: now.warnHoldSec, alarmHoldSec: now.alarmHoldSec }
    }),
  }
}

/**
 * @param {object} p
 * @param {object} p.thresholds 지금 설비의 GET /equipment/{id}/thresholds
 * @param {object} p.drafts     입력 칸 { 센서 id: { warn, alarm } }
 * @param {string} p.season
 * @param {number[]} p.equipmentIds 저장할 설비 (이 설비만이면 [지금 설비])
 * @param {string} p.reason
 * @param {string} p.by 예시 데이터 기록용 이름
 */
export async function saveAll({ thresholds, drafts, season, equipmentIds, reason, by }) {
  // 종류별(전류·온도·CO) 바꾼 칸만 모음 — 예: { TEMP: { warn: 158 } }
  const changedByType = {}
  for (const s of thresholds.sensors) {
    const saved = savedOf(s, season)
    for (const field of ['warn', 'alarm']) {
      const v = num(drafts[s.sensorId][field])
      if (v !== saved[field]) changedByType[s.type] = { ...changedByType[s.type], [field]: v }
    }
  }
  for (const id of equipmentIds) {
    const t = id === thresholds.equipmentId ? thresholds : await getThresholds(id)
    if (!t.sensors.length) continue
    await saveThresholds(id, bodyOf(t, changedByType, season, reason), by)
  }
}
