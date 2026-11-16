<!--
  상단 바 오른쪽: 수신 상태 + 시계
  - 수신 상태: 실시간 연결(SSE) 작업 전이라 예시 데이터 모드에서는 회색 '예시 데이터'로 표시
  - TODO: SSE 연결 후 연결 상태(수신 중 / 끊김)에 맞게 표시
  - 시계: 1초마다 갱신
-->
<script setup>
import { onBeforeUnmount, ref } from 'vue'
import { USE_MOCK } from '@/api/mock'
import { formatClock } from '@/utils/format'

const now = ref(formatClock(new Date()))
const timer = setInterval(() => (now.value = formatClock(new Date())), 1000)
onBeforeUnmount(() => clearInterval(timer))
</script>

<template>
  <div class="live" :class="{ wait: USE_MOCK }">
    <i />
    <span>{{ USE_MOCK ? '예시 데이터' : '실시간 수신 중' }}</span>
  </div>
  <span class="clock mono">{{ now }}</span>
</template>

<style scoped>
.live {
  display: flex;
  align-items: center;
  gap: 7px;
}

/* 초록 점 = 수신 중, 회색 점 = 대기(예시 데이터) */
.live i {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-level-normal);
  box-shadow: 0 0 0 4px var(--color-level-normal-soft);
}

.live.wait i {
  background: var(--color-text-weak);
  box-shadow: 0 0 0 4px #f1f5f9;
}

.clock {
  color: var(--color-text);
}
</style>
