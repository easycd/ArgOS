<!--
  설비 정보 (화면설계안 vLayout() panel())
  - 사용 상태 스위치, 설비 이름, 종류, 위치(격자 칸 X · Y — 숫자로 고치면 배치도도 0.3초에 옮겨짐)
  - 담당자 · 연결된 센서(지금 값·단계) — 보기만
  - 이 설비의 변경 내용 (저장 전)
  - 고른 설비가 없으면 '선택한 설비가 없습니다'
  - 바꾼 값은 change(필드, 값) 로 화면에 알림 → 화면이 저장 전 변경에 모음
-->
<script setup>
import { KIND_OPTIONS } from './layoutDraft'
import AppIcon from '@/components/AppIcon.vue'
import { LEVEL_META, SENSOR_TYPES } from '@/types/codes'
import { toast } from '@/utils/toast'

const props = defineProps({
  /** 고른 설비 { id, key, name, kind, active, grid, sensors, managers } (지금 값) — 없으면 null */
  eq: { type: Object, default: null },
  /** 이 설비의 기준 칸 [X, Y] */
  base: { type: Array, default: () => [0, 0] },
  /** 이 설비의 저장 전 변경 [{ type, title, detail }] */
  changes: { type: Array, default: () => [] },
})

const emit = defineEmits(['change'])

const typeLabel = (t) => SENSOR_TYPES.find((x) => x.type === t)?.label ?? t
const TYPE_BADGE = { move: '위치 변경됨', name: '이름 변경됨', meta: '정보 변경됨' }

function onName(e) {
  const v = e.target.value.trim()
  if (!v) {
    e.target.value = props.eq.name
    toast('설비 이름을 입력해 주세요.', { type: 'warn' })
    return
  }
  emit('change', 'name', v)
}

/** 위치 X · Y 숫자 → 격자 칸 이동 */
function onPos(axis, e) {
  const v = Math.round(Number(e.target.value))
  if (!Number.isFinite(v)) {
    toast('위치는 숫자로 입력해 주세요.', { type: 'warn' })
    e.target.value = axis === 'x' ? props.base[0] + props.eq.grid.a : props.base[1] + props.eq.grid.b
    return
  }
  const grid = { ...props.eq.grid }
  if (axis === 'x') grid.a = Math.max(1, Math.min(24, v)) - props.base[0]
  else grid.b = Math.max(1, Math.min(13, v)) - props.base[1]
  emit('change', 'grid', grid)
}
</script>

<template>
  <section class="pcard base-card rise">
    <header class="ch">
      <h3>설비 정보</h3>
      <span v-if="changes.length" class="m-chip info badge">{{ TYPE_BADGE[changes[0].type] }}</span>
    </header>

    <div v-if="!eq" class="empty">
      <AppIcon name="layers" :size="26" />
      <b>선택한 설비가 없습니다</b>
      배치도나 목록에서 설비를 선택하세요.<br />끌어서 위치를 옮길 수 있습니다.
    </div>

    <div v-else :key="eq.id" class="pn">
      <div class="lrow">
        <span>사용 상태</span>
        <b :class="{ ok: eq.active }">{{ eq.active ? '사용 중' : '사용 안 함' }}</b>
        <button type="button" class="tg" :class="{ on: eq.active }" role="switch" :aria-checked="eq.active" aria-label="사용 상태" @click="emit('change', 'active', !eq.active)" />
      </div>

      <label class="fl" for="eq-name">설비 이름</label>
      <input id="eq-name" class="inp" :value="eq.name" maxlength="30" @change="onName" @keydown.enter="$event.target.blur()" />

      <label class="fl" for="eq-kind">종류</label>
      <select id="eq-kind" class="inp" :value="eq.kind" @change="emit('change', 'kind', $event.target.value)">
        <option v-for="k in KIND_OPTIONS" :key="k" :value="k">{{ k }}</option>
      </select>

      <div class="fl">위치 <small>격자 칸</small></div>
      <div class="pos">
        <label :class="{ edt: eq.grid.a }"><span>X</span><input type="number" min="1" max="24" class="mono" :value="base[0] + eq.grid.a" @change="onPos('x', $event)" /></label>
        <label :class="{ edt: eq.grid.b }"><span>Y</span><input type="number" min="1" max="13" class="mono" :value="base[1] + eq.grid.b" @change="onPos('y', $event)" /></label>
      </div>

      <div class="fl">담당자 <small>{{ eq.managers.length }}명</small></div>
      <div class="mgs">
        <span v-for="m in eq.managers" :key="m.name" class="mg"><i>{{ m.name[0] }}</i>{{ m.name }}</span>
        <span v-if="!eq.managers.length" class="weak">지정된 담당자 없음</span>
      </div>

      <div class="fl">센서 <small>{{ eq.sensors.length }}개</small></div>
      <div v-if="eq.sensors.length" class="sens">
        <div v-for="s in eq.sensors" :key="s.tag" class="sn">
          <b class="mono">{{ s.tag }}</b>
          <span>{{ typeLabel(s.type) }}</span>
          <span class="mono val">{{ s.value ?? '–' }} {{ s.unit }}</span>
          <span class="lv" :style="{ background: LEVEL_META[s.level]?.color }" :title="LEVEL_META[s.level]?.label" />
        </div>
      </div>
      <p v-else class="weak">연결된 센서가 없습니다</p>

      <div class="fl">변경 내용</div>
      <TransitionGroup v-if="changes.length" tag="div" name="chg" class="chgs">
        <div v-for="c in changes" :key="c.type" class="ci">
          <AppIcon :name="c.type === 'move' ? 'layers' : 'edit'" :size="15" />
          <span><b>{{ c.title }}</b><small>{{ c.detail }}</small></span>
        </div>
      </TransitionGroup>
      <p v-else class="weak">바꾼 내용이 없습니다.</p>
    </div>

    <footer class="bt">
      <AppIcon name="info" :size="15" />저장하면 대시보드 배치도에 바로 반영됩니다
    </footer>
  </section>
</template>

<style scoped>
.pcard {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  border: 1px solid var(--color-border-card);
  border-radius: var(--radius-md);
  background: var(--color-surface);
}

.ch {
  height: 48px;
  flex: none;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 20px;
  border-bottom: 1px solid var(--color-border);
}

.ch h3 {
  font-size: 16px;
  font-weight: 700;
}

.badge {
  margin-left: auto;
  animation: pop-in var(--m-pop-in) both;
}

.empty {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 13px;
  line-height: 20px;
  color: var(--color-text-weak);
  text-align: center;
}

.empty b {
  font-size: 14px;
  color: var(--color-text-sub);
}

/* 다른 설비를 고르면 오른쪽에서 밀려 들어옴 */
.pn {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 18px 20px;
  animation: pn-in var(--m-panel) both;
}

@keyframes pn-in {
  from {
    opacity: 0;
    transform: translateX(12px);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

.lrow {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-bottom: 14px;
  border-bottom: 1px solid #f1f5f9;
  font-size: 13.5px;
}

.lrow span {
  color: var(--color-text-sub);
}

.lrow b {
  color: var(--color-text-weak);
}

.lrow b.ok {
  color: var(--color-level-normal-text);
}

.fl {
  display: block;
  margin: 16px 0 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-sub);
}

.fl small {
  margin-left: 4px;
  font-weight: 400;
  color: var(--color-text-weak);
}

.inp {
  width: 100%;
  height: 38px;
  padding: 0 10px;
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-sm);
  background: #fff;
  font-size: 13.5px;
  color: var(--color-text);
}

.pos {
  display: flex;
  gap: 8px;
}

.pos label {
  flex: 1;
  height: 38px;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 10px;
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-sm);
  transition:
    border-color 150ms,
    background 200ms;
}

/* 옮긴 축은 파랗게 */
.pos label.edt {
  border-color: var(--color-primary);
  background: var(--color-primary-soft);
}

.pos span {
  font-size: 12px;
  color: var(--color-text-weak);
}

.pos input {
  flex: 1;
  min-width: 0;
  border: none;
  background: none;
  font-size: 13.5px;
  outline: none;
}

.mgs {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.mg {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  padding: 0 10px 0 4px;
  border: 1px solid var(--color-border);
  border-radius: 15px;
  font-size: 13px;
}

.mg i {
  width: 22px;
  height: 22px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: #eef2f6;
  font-size: 11px;
  font-style: normal;
  font-weight: 600;
  color: var(--color-text-sub);
}

.sens {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
}

.sn {
  height: 38px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 12px;
  border-top: 1px solid #f1f5f9;
  font-size: 13px;
}

.sn:first-child {
  border-top: none;
}

.sn b {
  width: 56px;
  font-size: 12.5px;
}

.val {
  margin-left: auto;
  color: var(--color-text-sub);
}

.lv {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.chgs {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.ci {
  display: flex;
  gap: 8px;
  padding: 8px 10px;
  border-radius: var(--radius-sm);
  background: var(--color-primary-soft);
  font-size: 13px;
}

.ci svg {
  flex: none;
  margin-top: 2px;
  color: var(--color-primary);
}

.ci span {
  display: flex;
  flex-direction: column;
}

.ci small {
  margin-top: 2px;
  font-size: 12px;
  color: var(--color-text-sub);
}

.chg-enter-active {
  transition:
    opacity 250ms,
    transform 250ms;
}

.chg-enter-from {
  opacity: 0;
  transform: translateY(-4px);
}

.weak {
  margin: 0;
  font-size: 13px;
  color: var(--color-text-weak);
}

.bt {
  flex: none;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 14px 20px 18px;
  border-top: 1px solid var(--color-border);
  font-size: 12.5px;
  color: var(--color-text-weak);
}

/* 스위치 */
.tg {
  position: relative;
  width: 40px;
  height: 22px;
  margin-left: auto;
  padding: 0;
  border: none;
  border-radius: 11px;
  background: #cbd5e1;
  cursor: pointer;
  transition: background 200ms;
}

.tg::after {
  content: '';
  position: absolute;
  top: 3px;
  left: 3px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #fff;
  transition: transform 200ms;
}

.tg.on {
  background: var(--color-level-normal);
}

.tg.on::after {
  transform: translateX(18px);
}

@media (prefers-reduced-motion: reduce) {
  .pn {
    animation: none;
  }
}
</style>
