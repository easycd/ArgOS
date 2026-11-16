/**
 * 도장 공정 3D 배치도 그림(assets/images/paint-map.svg) 안의 설비·센서 위치 정보
 * - 화면설계안 js/v-dash.js EQD, js/lib.js EQ_GROUPS 와 같은 값 (그림이 설계안 고정 그림이라 프론트에 둠)
 * - key: 그림 안 설비 이름 (API 의 설비 code 'PNT-TOP-OVEN' → 'top-oven', svgKeyOf 참고)
 * - ids: 그림에서 이 설비에 속한 요소 id (건물, 배기팬, 버너 등)
 * - halo: 상태 테두리를 그릴 묶음 (첫 번째 id 기준으로 둘레를 그림)
 */

export const PAINT_EQUIPMENT = {
  pretreat: { ids: ['eq-pretreat', 'pump-pretreat'] },
  'ed-tank': { ids: ['eq-ed-tank', 'pump-ed-tank'] },
  'ed-oven': { ids: ['eq-ed-oven', 'fan-ed-oven', 'burner-ed-oven'] },
  sealing: { ids: ['eq-sealing'] },
  'primer-booth': { ids: ['eq-primer-booth', 'fan-primer-booth'] },
  'primer-oven': { ids: ['eq-primer-oven', 'fan-primer-oven', 'burner-primer-oven'] },
  'top-booth': { ids: ['eq-top-booth', 'fan-top-booth'] },
  'top-oven': { ids: ['eq-top-oven', 'fan-top-oven', 'burner-top-oven', 'ir-top-oven'] },
  ahu: { ids: ['eq-ahu'] },
  'paint-mix': { ids: ['eq-paint-mix'] },
  incinerator: { ids: ['eq-incinerator'] },
}

/**
 * 상태 테두리 묶음 (설계안 EQ_GROUPS)
 * - 버너는 건물과 따로 테두리를 그림 (버너만 경보일 수 있어서)
 */
export const HALO_GROUPS = [
  ['eq-pretreat', 'pump-pretreat'],
  ['eq-ed-tank', 'pump-ed-tank'],
  ['eq-ed-oven', 'fan-ed-oven'],
  ['burner-ed-oven'],
  ['eq-sealing'],
  ['eq-primer-booth', 'fan-primer-booth'],
  ['eq-primer-oven', 'fan-primer-oven'],
  ['burner-primer-oven'],
  ['eq-top-booth', 'fan-top-booth'],
  ['eq-top-oven', 'fan-top-oven'],
  ['burner-top-oven'],
  ['eq-ahu'],
  ['eq-paint-mix'],
  ['eq-incinerator'],
]

/** 설비 code → 그림 안 설비 이름 ('PNT-TOP-OVEN' → 'top-oven') */
export function svgKeyOf(code) {
  return code.replace(/^PNT-/, '').toLowerCase()
}

/** 그림 요소 id → 설비 이름 ('fan-top-oven' → 'top-oven') */
export function keyOfSvgId(id) {
  return Object.keys(PAINT_EQUIPMENT).find((key) => PAINT_EQUIPMENT[key].ids.includes(id)) ?? null
}
