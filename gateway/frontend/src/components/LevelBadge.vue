<!--
  상태 배지: 정상 / 주의 / 경보 / 화재
  - 색과 이름은 types/codes.js 의 LEVEL_META 한 곳에서 가져옴
  - 사용 예: <LevelBadge level="WARN" />
-->
<script setup>
import { computed } from 'vue'
import { LEVEL_META } from '@/types/codes'

const props = defineProps({
  /** NORMAL / WARN / ALARM / FIRE */
  level: { type: String, required: true },
})

// 알 수 없는 값이 오면 회색 '-' 로 표시 (화면이 깨지지 않게)
const meta = computed(() => LEVEL_META[props.level] ?? { label: '-', color: 'var(--color-text-sub)' })
</script>

<template>
  <span class="level-badge" :style="{ '--level-color': meta.color }">
    <span class="dot" />
    {{ meta.label }}
  </span>
</template>

<style scoped>
.level-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 2px 8px;
  border: 1px solid var(--level-color);
  border-radius: var(--radius-sm);
  color: var(--level-color);
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}

.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--level-color);
}
</style>
