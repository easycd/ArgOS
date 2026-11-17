<!--
  도장 공정 3D 배치도 (축측 그림 + 설비 상태 테두리)
  - 그림: 화면설계안 assets/svgs.js 의 도장 공정 배치도를 정적 SVG 로 만든 것 (assets/images/paint-map.svg)
    3D 엔진(Three.js 등)을 쓰지 않고 설계안처럼 비스듬히 그린 그림 위에 표시만 함
  - 설비 상태: 설비 둘레에 상태 색 테두리 (면은 칠하지 않음). 주의·경보 설비만 테두리 빛번짐
  - 센서 이름표: 주의·경보 센서는 이름표 테두리를 상태 색으로
  - 마우스를 올리면 설비 이름·상태·센서 값 말풍선, 누르면 select(설비), 배기팬을 누르면 fan(설비, 위치)
  - 공장 관리(editable): 설비를 끌어서 격자 칸 단위로 옮김 → drag(설비 이름, { a, b }) / 끝나면 dragend
    · offsets { 설비 이름: { a, b } }: 저장된(또는 옮기는 중인) 칸 이동 — 대시보드도 이 값으로 그림
    · 격자 방향은 설계안 공장 관리와 같음 (GU · GV, 그림 좌표)
    · selected: 고른 설비 파란 그림자, inactive: 사용 안 함 설비 흐리게, thin: 테두리를 더 얇게
-->
<script setup>
import { nextTick, onMounted, ref, watch } from 'vue'
import { HALO_GROUPS, PAINT_EQUIPMENT, keyOfSvgId } from './paintLayout'
import paintSvg from '@/assets/images/paint-map.svg?raw'
import { LEVEL, LEVEL_META, SENSOR_TYPES } from '@/types/codes'

const props = defineProps({
  /** 화면용 설비 목록 [{ key, name, level, fan, sensors: [{ tag, type, value, unit, level }] }] (ProcessPage 에서 만듦) */
  equipment: { type: Array, required: true },
  /** 이 설비만 크게 보기 (설비 상세 '설비 위치'). 그림 안 설비 이름 (예: 'top-oven'), 비우면 전체 */
  focus: { type: String, default: '' },
  /** 설비별 격자 칸 이동 { 'top-oven': { a: 1, b: 0 } } (없으면 그림 그대로) */
  offsets: { type: Object, default: () => ({}) },
  /** 끌어서 옮기기 (공장 관리) */
  editable: { type: Boolean, default: false },
  /** 격자에 맞추기 (끌 때 칸 단위로) */
  snap: { type: Boolean, default: true },
  /** 고른 설비 이름 */
  selected: { type: String, default: '' },
  /** 사용 안 함 설비 이름들 (흐리게) */
  inactive: { type: Array, default: () => [] },
  /** 테두리를 더 얇게 (공장 관리) */
  thin: { type: Boolean, default: false },
})

const emit = defineEmits(['select', 'fan', 'drag', 'dragend'])

// 격자 한 칸 방향 (그림 좌표, 설계안 v-pages2.js GU · GV)
const GU = [62.43, 19.57]
const GV = [-18.4, 24.25]
const gridXY = (p) => [p.a * GU[0] + p.b * GV[0], p.a * GU[1] + p.b * GV[1]]
/** 그림 좌표 이동(dx, dy) → 격자 칸(a, b) */
function solve(dx, dy) {
  const det = GU[0] * GV[1] - GV[0] * GU[1]
  return [(dx * GV[1] - GV[0] * dy) / det, (GU[0] * dy - dx * GU[1]) / det]
}

const box = ref(null)

// 상태 → 테두리 색 / 그림의 data-level 값
const COLOR = {
  [LEVEL.NORMAL]: '#16A34A',
  [LEVEL.WARN]: '#F97316',
  [LEVEL.ALARM]: '#DC2626',
  [LEVEL.FIRE]: '#DC2626',
}
const TAG_LEVEL = { [LEVEL.NORMAL]: 'normal', [LEVEL.WARN]: 'warn', [LEVEL.ALARM]: 'danger', [LEVEL.FIRE]: 'danger' }

const byKey = (key) => props.equipment.find((e) => e.key === key)

/**
 * 상태 테두리 만들기 (처음 한 번)
 * - 설비 모양을 복사해서 원래 그림 뒤에 두껍게 깔면 둘레만 테두리처럼 보임 (설계안 paintMap 과 같은 방식)
 * - 복사본은 면을 칠하지 않고 선만 그림 → 색은 나중에 applyLevels 에서 바꿈
 */
function buildHalos(svg) {
  for (const ids of HALO_GROUPS) {
    const first = svg.querySelector(`#${ids[0]}`)
    if (!first) continue
    const halo = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    halo.setAttribute('class', 'halo')
    halo.setAttribute('data-halo', ids[0])
    for (const id of ids) {
      const el = svg.querySelector(`#${id}`)
      if (!el || (id !== ids[0] && first.contains(el))) continue
      const copy = el.cloneNode(true)
      copy.removeAttribute('id')
      copy.querySelectorAll('[id]').forEach((n) => n.removeAttribute('id'))
      copy.querySelectorAll('text, title').forEach((n) => n.remove())
      copy.querySelectorAll('polygon, path, rect, circle, ellipse, line, polyline').forEach((n) => {
        const width = parseFloat(n.getAttribute('stroke-width') || 1)
        ;['fill', 'stroke', 'filter', 'opacity', 'stroke-dasharray', 'marker-end'].forEach((a) => n.removeAttribute(a))
        n.setAttribute('fill', 'none') // 면 채우기 금지
        n.setAttribute('stroke-linejoin', 'round')
        n.setAttribute('stroke-linecap', 'round')
        n.style.strokeWidth = `calc(${width}px + var(--halo-width))`
      })
      halo.appendChild(copy)
    }
    first.parentNode.insertBefore(halo, first)
  }
}

/** 설비를 누를 수 있게 표시 (data-eq) */
function markEquipment(svg) {
  for (const [key, { ids }] of Object.entries(PAINT_EQUIPMENT)) {
    ids.forEach((id) => {
      const el = svg.querySelector(`#${id}`)
      if (!el) return
      el.classList.add('eqh')
      el.setAttribute('data-eq', key)
    })
  }
}

/** 설비 상태·센서 상태를 그림에 반영 */
function applyLevels() {
  const svg = box.value?.querySelector('svg')
  if (!svg) return
  svg.querySelectorAll('.halo').forEach((halo) => {
    const svgId = halo.getAttribute('data-halo')
    const eq = byKey(keyOfSvgId(svgId))
    // 버너실은 설비 전체가 아니라 CO 센서 단계로 색을 정함 (전류만 주의면 버너는 정상)
    const level = svgId.startsWith('burner-')
      ? (eq?.sensors.find((s) => s.type === 'CO')?.level ?? LEVEL.NORMAL)
      : (eq?.level ?? LEVEL.NORMAL)
    const calm = level === LEVEL.NORMAL
    halo.style.setProperty('--halo-width', props.thin ? (calm ? '3px' : '4px') : calm ? '5px' : '8px') // 정상은 얇게
    halo.style.stroke = COLOR[level]
    halo.style.color = COLOR[level] // 빛번짐(drop-shadow)이 이 색을 씀
    halo.classList.toggle('glow', !calm) // 빛번짐은 주의·경보 테두리에만
    halo.classList.toggle('fast', level === LEVEL.ALARM || level === LEVEL.FIRE) // 경보·화재는 더 빠르게 깜빡임
  })
  for (const eq of props.equipment) {
    // 그림 안 설비 이름표 (공장 관리에서 이름을 바꾸면 그 이름으로) — 번호(숫자)가 아닌 글자
    const label = [...(svg.querySelector(`#eq-${eq.key}`)?.querySelectorAll('text') ?? [])].find((t) => !/^\d+$/.test(t.textContent))
    if (label && eq.name && label.textContent !== eq.name) label.textContent = eq.name
    for (const s of eq.sensors) {
      svg.querySelector(`#tag-${s.tag}`)?.setAttribute('data-level', TAG_LEVEL[s.level] ?? 'normal')
    }
  }
}

/**
 * focus 설비만 크게: 그 설비 그림 + 센서 이름표를 감싸는 사각형으로 viewBox 를 좁힘
 * - 여백은 설계안 vEquip() 과 같은 식 (가로 420 · 세로 285 보다 작으면 가운데에 두고 양옆을 채움)
 */
function zoomToFocus(svg) {
  if (!props.focus) return
  const eq = byKey(props.focus)
  const selectors = [
    ...(PAINT_EQUIPMENT[props.focus]?.ids ?? []).map((id) => `#${id}`),
    ...(eq?.sensors ?? []).map((s) => `#tag-${s.tag}`),
  ]
  let box2 = null
  for (const sel of selectors) {
    const el = svg.querySelector(sel)
    if (!el) continue
    const b = el.getBBox()
    box2 = box2
      ? { x0: Math.min(box2.x0, b.x), y0: Math.min(box2.y0, b.y), x1: Math.max(box2.x1, b.x + b.width), y1: Math.max(box2.y1, b.y + b.height) }
      : { x0: b.x, y0: b.y, x1: b.x + b.width, y1: b.y + b.height }
  }
  if (!box2) return
  const w = box2.x1 - box2.x0
  const h = box2.y1 - box2.y0
  const padX = Math.max(40, (420 - w) / 2)
  const padY = Math.max(24, (285 - h) / 2)
  svg.setAttribute('viewBox', `${box2.x0 - padX} ${box2.y0 - padY} ${w + padX * 2} ${h + padY * 2}`)
}

/* ───────── 칸 이동 · 고름 · 사용 안 함 ───────── */
/** 설비 하나에 속한 그림 요소 (건물·팬·버너 + 상태 테두리 + 센서 이름표) */
function partsOf(svg, key) {
  const ids = PAINT_EQUIPMENT[key]?.ids ?? []
  const els = ids.map((id) => svg.querySelector(`#${id}`)).filter(Boolean)
  const top = els.filter((el) => !els.some((o) => o !== el && o.contains(el)))
  const halos = [...svg.querySelectorAll('.halo')].filter((h) => keyOfSvgId(h.getAttribute('data-halo')) === key)
  const tags = (byKey(key)?.sensors ?? []).map((s) => svg.querySelector(`#tag-${s.tag}`)).filter(Boolean)
  return [...top, ...halos, ...tags]
}

function applyOffsets() {
  const svg = box.value?.querySelector('svg')
  if (!svg) return
  for (const key of Object.keys(PAINT_EQUIPMENT)) {
    const [x, y] = gridXY(props.offsets[key] ?? { a: 0, b: 0 })
    const off = props.inactive.includes(key)
    for (const el of partsOf(svg, key)) {
      el.style.transform = x || y ? `translate(${x}px, ${y}px)` : ''
      el.style.opacity = off ? '0.4' : ''
      el.classList.toggle('sel', props.editable && key === props.selected)
    }
  }
}

/** 설비 기준 칸 번호 (설계안처럼 소각설비를 가로 16 · 세로 6 으로 두고 셈) — 공장 관리 위치 X · Y 표시 */
function gridBase() {
  const svg = box.value?.querySelector('svg')
  if (!svg) return {}
  const center = (key) => {
    let x0 = Infinity
    let y0 = Infinity
    let x1 = -Infinity
    let y1 = -Infinity
    for (const id of PAINT_EQUIPMENT[key].ids) {
      const el = svg.querySelector(`#${id}`)
      if (!el) continue
      const b = el.getBBox()
      x0 = Math.min(x0, b.x)
      y0 = Math.min(y0, b.y)
      x1 = Math.max(x1, b.x + b.width)
      y1 = Math.max(y1, b.y + b.height)
    }
    return [(x0 + x1) / 2, (y0 + y1) / 2]
  }
  const ci = center('incinerator')
  return Object.fromEntries(
    Object.keys(PAINT_EQUIPMENT).map((key) => {
      const c = center(key)
      const [a, b] = solve(c[0] - ci[0], c[1] - ci[1])
      return [key, [Math.max(1, 16 + Math.round(a)), Math.max(1, 6 + Math.round(b))]]
    }),
  )
}
defineExpose({ gridBase })

/* ───────── 끌어서 옮기기 (editable) ───────── */
let drag = null // { key, start: [x, y], from: { a, b }, scale }
function onDown(event) {
  if (!props.editable) return
  const key = event.target.closest('.eqh')?.getAttribute('data-eq')
  if (!key) return
  const svg = box.value.querySelector('svg')
  const m = svg.getScreenCTM()
  drag = { key, start: [event.clientX, event.clientY], from: { ...(props.offsets[key] ?? { a: 0, b: 0 }) }, scale: m ? m.a : 1, moved: false }
  box.value.setPointerCapture(event.pointerId)
  tip.value = null
  emit('select', byKey(key) ?? { key })
}
function onDrag(event) {
  if (!drag) return
  const dx = (event.clientX - drag.start[0]) / drag.scale
  const dy = (event.clientY - drag.start[1]) / drag.scale
  const [a, b] = solve(dx, dy)
  const round = (v) => (props.snap ? Math.round(v) : Math.round(v * 10) / 10)
  const next = { a: drag.from.a + round(a), b: drag.from.b + round(b) }
  if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true
  emit('drag', drag.key, next)
}
function onUp() {
  if (!drag) return
  if (drag.moved) emit('dragend', drag.key)
  drag = null
}

onMounted(() => {
  const svg = box.value.querySelector('svg')
  buildHalos(svg)
  markEquipment(svg)
  applyLevels()
  applyOffsets()
  zoomToFocus(svg)
})
watch(() => props.equipment, () => nextTick(applyLevels), { deep: true })
watch(() => [props.offsets, props.selected, props.inactive], () => nextTick(applyOffsets), { deep: true })

/* ───────── 마우스 올리면 말풍선 ───────── */
const tip = ref(null) // { x, y, eq }

function onMove(event) {
  if (drag) return
  const key = event.target.closest('.eqh')?.getAttribute('data-eq')
  const eq = key && byKey(key)
  if (!eq) {
    tip.value = null
    return
  }
  const rect = box.value.getBoundingClientRect()
  tip.value = { x: event.clientX - rect.left, y: event.clientY - rect.top, eq }
}

/** 말풍선 센서 값: '전류 22.4 A · 온도 146 ℃' */
function tipValues(eq) {
  if (!eq.sensors.length) return '연결된 센서 없음'
  return eq.sensors
    .map((s) => `${SENSOR_TYPES.find((t) => t.type === s.type)?.label ?? s.type} ${s.value} ${s.unit}`)
    .join(' · ')
}

/* ───────── 클릭: 배기팬이면 팬 창, 아니면 설비 선택 ───────── */
function onClick(event) {
  if (props.editable) return // 공장 관리는 누르는 순간(pointerdown) 고름
  const el = event.target.closest('.eqh')
  if (!el) return
  const eq = byKey(el.getAttribute('data-eq'))
  if (!eq) return
  const isFan = !!event.target.closest('[id^="fan-"]')
  if (isFan && eq.fan) {
    const rect = box.value.getBoundingClientRect()
    emit('fan', eq, { x: event.clientX - rect.left, y: event.clientY - rect.top })
    return
  }
  emit('select', eq)
}
</script>

<template>
  <div class="paint-map-box">
    <!-- SVG 문자열이 저장소 안 고정 그림이라 v-html 사용 (사용자 입력 아님) -->
    <div
      ref="box"
      class="svg"
      :class="{ editable }"
      @mousemove="onMove"
      @mouseleave="tip = null"
      @click="onClick"
      @pointerdown="onDown"
      @pointermove="onDrag"
      @pointerup="onUp"
      @pointercancel="onUp"
      v-html="paintSvg"
    />

    <div v-if="tip" class="tip" :style="{ left: `${tip.x}px`, top: `${tip.y}px` }">
      <b>{{ tip.eq.name }}</b> · {{ LEVEL_META[tip.eq.level]?.label }}<br />
      <span class="mono">{{ tipValues(tip.eq) }}</span>
    </div>
  </div>
</template>

<style scoped>
.paint-map-box {
  position: relative;
  width: 100%;
  height: 100%;
}

.svg,
.svg :deep(svg) {
  display: block;
  width: 100%;
  height: 100%;
}

/* v-html 로 넣은 SVG 에는 scoped 스타일이 안 닿아서 :deep() 사용 */
.svg :deep(.eqh) {
  cursor: pointer;
}

/* 공장 관리: 설비를 잡아 끌 수 있음 */
.svg.editable {
  touch-action: none;
}

.svg.editable :deep(.eqh) {
  cursor: grab;
}

/* 칸 이동은 0.15초에 따라감 */
.svg :deep(.eqh),
.svg :deep(.halo),
.svg :deep([id^='tag-']) {
  transition:
    transform 150ms ease-out,
    opacity 250ms;
}

/* 고른 설비: 파란 그림자 (면은 칠하지 않음) */
.svg :deep(.eqh.sel) {
  filter: drop-shadow(0 0 6px rgba(37, 99, 235, 0.9)) drop-shadow(0 0 2px rgba(37, 99, 235, 0.9));
}

.svg :deep(.eqh:hover) {
  filter: brightness(0.96) drop-shadow(0 4px 8px rgba(15, 23, 42, 0.25));
}

/* 주의·경보 테두리만 빛번짐 + 천천히 깜빡임 */
.svg :deep(.halo.glow) {
  filter: drop-shadow(0 0 6px currentColor) drop-shadow(0 0 12px currentColor);
  animation: halo-pulse var(--m-pulse-warn) ease-in-out infinite;
}

/* 경보·화재: 0.8초 (화면설계서 R2 --m-pulse-alarm) */
.svg :deep(.halo.glow.fast) {
  animation-duration: var(--m-pulse-alarm);
}

@keyframes halo-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.6;
  }
}

/* 마우스 말풍선 */
.tip {
  position: absolute;
  z-index: 8;
  transform: translate(-50%, calc(-100% - 12px));
  padding: 8px 11px;
  border-radius: var(--radius-sm);
  background: var(--color-text);
  color: #fff;
  font-size: 12.5px;
  line-height: 19px;
  white-space: nowrap;
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.28);
  pointer-events: none;
  animation: pop-in var(--m-pop-in) both; /* motion.css */
}

.tip b {
  font-size: 13.5px;
}

.tip .mono {
  color: #cbd5e1;
}
</style>
