/**
 * 공장 관리 저장값 예시 (명세서 H1 PUT /processes/{processId}/layout — 백엔드에는 GET 만 있음)
 * - 설비별로 바뀐 것만 둠: { 설비 id: { grid: { a, b }, name, kind, active } }
 *   · grid: 배치도 격자 칸 이동 (명세서는 pos{x,y,z} 미터 — 그림 배치도라 칸 단위로 둠, backend-notes 15장)
 * - processData.js 가 GET layout 을 만들 때 이 값을 덮어씀 → 대시보드 배치도에도 바로 반영
 * - 상태는 이 파일 안에만 있음 (새로고침하면 처음으로)
 */

export const LAYOUT = {
  version: 14,
  /** { 설비 id: { grid, name, kind, active } } */
  edits: {},
}

/** 설비 하나의 저장값 (없으면 빈 객체) */
export const editsOf = (id) => LAYOUT.edits[id] ?? {}

/**
 * PUT /processes/{processId}/layout
 * @param {{ version, equipment: { update: [{ id, grid?, name?, kind?, active? }] } }} body
 */
export function saveLayout(processId, body) {
  if (Number(processId) !== 12) return { error: { code: 'NOT_FOUND', message: '배치도가 등록되지 않은 공정입니다.', status: 404 } }
  if (body.version !== LAYOUT.version) {
    return { error: { code: 'LAYOUT_CONFLICT', message: '다른 사람이 먼저 저장했습니다. 다시 불러와 주세요.', status: 409 } }
  }
  const updates = body.equipment?.update ?? []
  for (const u of updates) {
    const cur = { ...LAYOUT.edits[u.id] }
    for (const f of ['grid', 'name', 'kind', 'active']) if (u[f] !== undefined) cur[f] = structuredClone(u[f])
    LAYOUT.edits[u.id] = cur
  }
  LAYOUT.version += 1
  return { data: { version: LAYOUT.version, created: { equipment: {}, sensors: {} }, changedCount: updates.length } }
}
