<!--
  요일 · 시간대별 발생 (화면설계안 vStats() #hm)
  - 월~일 × 0~23시 칸, 건수가 많을수록 진한 파랑 (설계안 colr 7단계)
  - 칸에 마우스를 올리면 '수요일 14시 · 5건'
  - 조회할 때 칸 색이 0.4초에 바뀜 (--m-value)
-->
<script setup>
import { computed } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import BaseCard from '@/components/BaseCard.vue'

const props = defineProps({
  /** GET /stats/heatmap { max, cells: [{ dow, hour, count }] } */
  heatmap: { type: Object, default: null },
  sub: { type: String, default: '' },
})

const DAYS = ['월', '화', '수', '목', '금', '토', '일']
/** 알림이 하나도 없으면 칸 대신 안내 (다른 카드와 같게) */
const empty = computed(() => !!props.heatmap && props.heatmap.cells.length === 0)

/** 많을수록 진한 색 (설계안과 같은 단계) */
function color(ratio) {
  if (ratio <= 0) return '#f1f5f9'
  if (ratio < 0.25) return '#dbeafe'
  if (ratio < 0.45) return '#bfdbfe'
  if (ratio < 0.62) return '#93c5fd'
  if (ratio < 0.78) return '#60a5fa'
  if (ratio < 0.9) return '#2563eb'
  return '#1e3a8a'
}

/** 7 × 24 칸 */
const rows = computed(() => {
  const count = new Map((props.heatmap?.cells ?? []).map((c) => [`${c.dow}:${c.hour}`, c.count]))
  const max = props.heatmap?.max || 1
  return DAYS.map((d, i) => ({
    day: d,
    cells: Array.from({ length: 24 }, (_, h) => {
      const n = count.get(`${i + 1}:${h}`) ?? 0
      return { h, n, bg: color(n / max), title: `${d}요일 ${h}시 · ${n}건` }
    }),
  }))
})
</script>

<template>
  <BaseCard title="요일 · 시간대별 발생" :sub="sub">
    <div v-if="empty" class="noval"><AppIcon name="bell" :size="24" /><b>조건에 맞는 알림이 없습니다</b>기간이나 조건을 바꿔 보세요.</div>
    <div v-else class="hm">
      <div v-for="r in rows" :key="r.day" class="r">
        <b>{{ r.day }}</b>
        <i v-for="c in r.cells" :key="c.h" :style="{ background: c.bg }" :title="c.title" />
      </div>
      <div class="x mono">
        <span v-for="h in 8" :key="h">{{ (h - 1) * 3 }}시</span>
      </div>
    </div>
    <div v-if="!empty" class="hml">적음<i />많음</div>
  </BaseCard>
</template>

<style scoped>
.hm {
  padding: 16px 20px 0;
}

.r {
  display: flex;
  align-items: center;
  gap: 3px;
  margin-bottom: 3px;
}

.r b {
  width: 26px;
  font-size: 12.5px;
  font-weight: 500;
  color: var(--color-text-sub);
}

.r i {
  flex: 1;
  height: 33px;
  border-radius: 2px;
  transition:
    background var(--m-value),
    transform 120ms;
}

.r i:hover {
  transform: scale(1.18);
  box-shadow: 0 0 0 2px var(--color-text);
}

.x {
  display: flex;
  margin: 6px 0 0 29px;
  font-size: 11px;
  color: var(--color-text-weak);
}

.x span {
  flex: 1;
}

.noval {
  height: 328px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 13px;
  color: var(--color-text-weak);
}

.noval b {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-sub);
}

.hml {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  padding: 10px 20px 16px;
  font-size: 12px;
  color: var(--color-text-weak);
}

.hml i {
  display: block;
  width: 150px;
  height: 8px;
  border-radius: 2px;
  background: linear-gradient(90deg, #eff4fb, #93c5fd, #2563eb, #1e3a8a);
}
</style>
