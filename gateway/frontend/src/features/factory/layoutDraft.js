/**
 * 공장 관리 — 저장 전 변경 모으기 (화면설계안 v-pages2.js vLayout() changes())
 * - saved: GET layout 의 설비 (저장된 값), draft: 화면에서 고친 값 { 설비 id: { grid, name, kind, active } }
 * - 변경 줄: 위치 이동(칸 수·방향 + 함께 옮겨지는 센서), 이름 변경, 정보 변경(종류·사용 상태)
 * - 저장 본문: 명세서 PUT /processes/{id}/layout 의 equipment.update
 */

/** 설비 종류 고르기 (설계안 bindSelect 목록) */
export const KIND_OPTIONS = ['건조로', '도장 부스', '전처리 설비', '전착 설비', '실링 설비', '공조 설비', '도료 공급 설비', '배기 처리 설비', '기타 설비']

const same = (a, b) => JSON.stringify(a) === JSON.stringify(b)

/** 설비 하나의 지금 값 (저장값 위에 고친 값) */
export function currentOf(eq, draft) {
  return { grid: eq.grid ?? { a: 0, b: 0 }, name: eq.name, kind: eq.kind, active: eq.active !== false, ...draft[eq.id] }
}

/**
 * 변경 목록
 * @param {Array} equipment GET layout 의 equipment (+ key, sensors)
 * @param {object} draft
 * @param {object} base 설비 이름(key) → 기준 칸 [X, Y] (PaintMap.gridBase)
 * @returns {Array<{ id, key, type, title, detail }>}
 */
export function changesOf(equipment, draft, base = {}) {
  const out = []
  for (const eq of equipment) {
    const now = currentOf(eq, draft)
    const was = currentOf(eq, {})
    if (!same(now.grid, was.grid)) {
      const [x0, y0] = base[eq.key] ?? [0, 0]
      const da = now.grid.a - was.grid.a
      const db = now.grid.b - was.grid.b
      const parts = []
      if (da) parts.push(`가로 ${x0 + was.grid.a} → ${x0 + now.grid.a} (${Math.abs(da)}칸 ${da > 0 ? '오른쪽' : '왼쪽'})`)
      if (db) parts.push(`세로 ${y0 + was.grid.b} → ${y0 + now.grid.b} (${Math.abs(db)}칸 ${db > 0 ? '아래' : '위'})`)
      const tags = (eq.sensors ?? []).map((s) => s.tag)
      out.push({ id: eq.id, key: eq.key, type: 'move', title: `${now.name} 위치 이동`, detail: parts.join(' · ') + (tags.length ? ` · 센서 ${tags.join(', ')} 함께 이동` : '') })
    }
    if (now.name !== was.name) out.push({ id: eq.id, key: eq.key, type: 'name', title: '설비 이름 변경', detail: `${was.name} → ${now.name}` })
    const meta = []
    if (now.kind !== was.kind) meta.push(`종류 ${now.kind}`)
    if (now.active !== was.active) meta.push(now.active ? '사용 상태 사용' : '사용 상태 사용 안 함')
    if (meta.length) out.push({ id: eq.id, key: eq.key, type: 'meta', title: `${now.name} 정보 변경`, detail: meta.join(' · ') })
  }
  return out
}

/** 저장 본문 (바뀐 설비만) */
export function bodyOf(version, equipment, draft) {
  const update = equipment
    .filter((eq) => draft[eq.id] && !same(currentOf(eq, draft), currentOf(eq, {})))
    .map((eq) => {
      const now = currentOf(eq, draft)
      // grid 는 화면 반응형 값이라 보통 객체로 복사 (예시 데이터가 structuredClone 으로 복사함)
      return { id: eq.id, grid: { a: now.grid.a, b: now.grid.b }, name: now.name, kind: now.kind, active: now.active }
    })
  return { version, equipment: { create: [], update, delete: [] }, sensors: { create: [], update: [], delete: [] } }
}
