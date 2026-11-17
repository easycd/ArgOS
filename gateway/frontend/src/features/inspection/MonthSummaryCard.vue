<!--
  이번 달 점검 현황 (화면설계안 vInspect() left() — 도넛 + 완료·예정·지연)
  - 도넛 가운데 완료율, 아래 3칸 건수 (지연은 빨강)
  - 숫자가 바뀌면 도넛 조각 길이가 0.4초에 바뀜 (--m-value)
-->
<script setup>
import { computed } from 'vue'
import BaseCard from '@/components/BaseCard.vue'

const props = defineProps({
  /** GET /inspections/summary { month, rate, done, planned, delayed } */
  summary: { type: Object, default: null },
})

const SIZE = 132
const STROKE = 15
const R = (SIZE - STROKE) / 2
const C = 2 * Math.PI * R

/** 조각 3개: 시작 위치(offset)와 길이 */
const parts = computed(() => {
  const s = props.summary
  if (!s) return []
  const total = s.done + s.planned + s.delayed || 1
  let start = 0
  return [
    { key: 'done', n: s.done, color: 'var(--color-level-normal)' },
    { key: 'planned', n: s.planned, color: '#3b82f6' },
    { key: 'delayed', n: s.delayed, color: 'var(--color-level-alarm)' },
  ].map((p) => {
    const len = (p.n / total) * C
    const out = { ...p, dash: `${Math.max(0, len - 2)} ${C}`, offset: -start }
    start += len
    return out
  })
})
const monthLabel = computed(() => (props.summary ? `${props.summary.month.slice(0, 4)}년 ${Number(props.summary.month.slice(5))}월` : ''))
</script>

<template>
  <BaseCard title="이번 달 점검 현황" :sub="monthLabel">
    <div class="donut">
      <svg :width="SIZE" :height="SIZE" :viewBox="`0 0 ${SIZE} ${SIZE}`" aria-hidden="true">
        <circle :cx="SIZE / 2" :cy="SIZE / 2" :r="R" fill="none" stroke="#eef2f6" :stroke-width="STROKE" />
        <circle
          v-for="p in parts"
          :key="p.key"
          :cx="SIZE / 2"
          :cy="SIZE / 2"
          :r="R"
          fill="none"
          :stroke="p.color"
          :stroke-width="STROKE"
          :stroke-dasharray="p.dash"
          :stroke-dashoffset="p.offset"
          :transform="`rotate(-90 ${SIZE / 2} ${SIZE / 2})`"
          class="seg"
        />
      </svg>
      <div class="mid">
        <b class="mono">{{ summary?.rate ?? '–' }}<small>%</small></b>
        <span>완료율</span>
      </div>
    </div>
    <div class="smr">
      <div><b class="mono">{{ summary?.done ?? '–' }}</b><span><i class="g" />완료</span></div>
      <div><b class="mono">{{ summary?.planned ?? '–' }}</b><span><i class="b" />예정</span></div>
      <div><b class="mono red">{{ summary?.delayed ?? '–' }}</b><span><i class="r" />지연</span></div>
    </div>
  </BaseCard>
</template>

<style scoped>
.donut {
  position: relative;
  display: flex;
  justify-content: center;
  padding: 18px 0 16px;
}

.seg {
  transition:
    stroke-dasharray var(--m-value),
    stroke-dashoffset var(--m-value);
}

.mid {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: var(--color-text-weak);
}

.mid b {
  font-size: 26px;
  font-weight: 600;
  color: var(--color-text);
}

.mid small {
  font-size: 13px;
  color: var(--color-text-weak);
}

.smr {
  display: flex;
  height: 74px;
  border-top: 1px solid #f1f5f9;
}

.smr div {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 3px;
  font-size: 12.5px;
  color: var(--color-text-sub);
  border-right: 1px solid #f1f5f9;
}

.smr div:last-child {
  border: none;
}

.smr b {
  font-size: 22px;
  font-weight: 600;
  color: var(--color-text);
}

.smr b.red {
  color: var(--color-level-alarm);
}

.smr i {
  display: inline-block;
  width: 8px;
  height: 8px;
  margin-right: 5px;
  border-radius: 2px;
}

.g {
  background: var(--color-level-normal);
}

.b {
  background: #3b82f6;
}

.r {
  background: var(--color-level-alarm);
}
</style>
