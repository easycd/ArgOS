/**
 * 공장 관리 저장값 예시 (명세서 H1 PUT /processes/{processId}/layout — 백엔드에는 GET 만 있음)
 * - 설비별로 바뀐 것만 둠: { 설비 id: { pos: { x, y, z }, name, type, active } }
 *   · 이름은 DB equipment 테이블 · 백엔드 layout 응답과 같음: pos = pos_x · pos_y(배치도 화면 좌표), type = equipment_type, active = is_active
 * - processData.js 가 GET layout 을 만들 때 이 값을 덮어씀 → 대시보드 배치도에도 바로 반영
 * - 상태는 이 파일 안에만 있음 (새로고침하면 처음으로)
 */

export const LAYOUT = {
  version: 14,
  /** { 설비 id: { pos, name, type, active } } */
  edits: {},
}

/** 설비 하나의 저장값 (없으면 빈 객체) */
export const editsOf = (id) => LAYOUT.edits[id] ?? {}

/**
 * PUT /processes/{processId}/layout
 * @param {{ version, equipment: { update: [{ id, pos?: { x, y }, name?, type?, active? }] } }} body
 */
export function saveLayout(processId, body) {
  if (Number(processId) !== 12) return { error: { code: 'NOT_FOUND', message: '배치도가 등록되지 않은 공정입니다.', status: 404 } }
  if (body.version !== LAYOUT.version) {
    return { error: { code: 'LAYOUT_CONFLICT', message: '다른 사람이 먼저 저장했습니다. 다시 불러와 주세요.', status: 409 } }
  }
  const updates = body.equipment?.update ?? []
  for (const u of updates) {
    const cur = { ...LAYOUT.edits[u.id] }
    for (const f of ['name', 'type', 'active']) if (u[f] !== undefined) cur[f] = u[f]
    // 위치: 응답은 pos { x, y, z } (z 는 이 화면에서 안 바꿈)
    if (u.pos) cur.pos = { x: u.pos.x, y: u.pos.y, z: null }
    LAYOUT.edits[u.id] = cur
  }
  LAYOUT.version += 1
  return { data: { version: LAYOUT.version, created: { equipment: {}, sensors: {} }, changedCount: updates.length } }
}
