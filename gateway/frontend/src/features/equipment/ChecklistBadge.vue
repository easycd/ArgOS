<!--
  체크리스트 진행 배지 (설계안 css/base.css .ckb: 작은 고리 + '체크리스트 진행 2/5' + 담당자)
  - 설비에 진행 중 체크리스트가 있을 때만 제목 줄에 보임
  - 다 끝나면 초록색 (설계안 .ckb.done)
  - 누르면 진행 현황 창(C3) 으로 가야 하지만 그 창은 아직 없음 → 지금은 표시만
-->
<script setup>
import { computed } from 'vue'

const props = defineProps({
  /** { doneCount, totalCount, assignee } */
  checklist: { type: Object, required: true },
})

const done = computed(() => props.checklist.doneCount >= props.checklist.totalCount)

// 고리: 둘레 길이 중 완료 비율만큼 칠함
const R = 11
const LENGTH = 2 * Math.PI * R
const dash = computed(() => `${(LENGTH * props.checklist.doneCount) / props.checklist.totalCount} ${LENGTH}`)
</script>

<template>
  <span class="ckb" :class="{ done }">
    <svg width="28" height="28" viewBox="0 0 28 28" aria-hidden="true">
      <circle cx="14" cy="14" :r="R" fill="none" stroke="#fed7aa" stroke-width="4" />
      <circle
        cx="14"
        cy="14"
        :r="R"
        fill="none"
        class="bar"
        stroke-width="4"
        stroke-linecap="round"
        :stroke-dasharray="dash"
        transform="rotate(-90 14 14)"
      />
    </svg>
    <span>체크리스트 진행</span>
    <span class="mono">{{ checklist.doneCount }}/{{ checklist.totalCount }}</span>
    <small>{{ checklist.assignee }}</small>
  </span>
</template>

<style scoped>
.ckb {
  display: flex;
  align-items: center;
  gap: 9px;
  height: 38px;
  padding: 0 12px 0 8px;
  border: 1px solid #fdba74;
  border-radius: var(--radius-sm);
  background: #fff7ed;
  color: #9a3412;
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
  /* 나타날 때 살짝 튀어 오름 (설계안 extra.css .ckb popin .4s) */
  animation: ckb-pop 400ms cubic-bezier(0.2, 1.2, 0.3, 1) both;
}

.ckb .bar {
  stroke: var(--color-level-warn);
  /* 진행 숫자가 바뀌면 고리가 부드럽게 참 (설계안 .6s) */
  transition: stroke-dasharray 600ms cubic-bezier(0.2, 0.8, 0.2, 1);
}

.ckb .mono {
  font-size: 14px;
}

.ckb small {
  font-size: 12px;
  font-weight: 500;
  color: var(--color-level-warn-text);
}

.ckb.done {
  border-color: #bbf7d0;
  background: #f0fdf4;
  color: var(--color-level-normal-text);
}

.ckb.done .bar {
  stroke: var(--color-level-normal);
}

.ckb.done small {
  color: var(--color-level-normal-text);
}

@media (prefers-reduced-motion: reduce) {
  .ckb {
    animation-name: softin; /* base.css: 투명도만 */
  }
}

@keyframes ckb-pop {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: none;
  }
}
</style>
