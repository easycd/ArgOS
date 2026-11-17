<!--
  상단 바 오른쪽: 수신 상태 + 시계
  - 수신 상태: 예시 데이터 모드는 회색 '예시 데이터', 실제 서버는 SSE 연결 상태('실시간 수신 중' / '연결 중…')
  - 시계: 1초마다 갱신
-->
<script setup>
import { onBeforeUnmount, ref } from 'vue'
import { USE_MOCK } from '@/api/mock'
import { serverNow } from '@/api/clock'
import { live } from '@/api/live'
import { formatClock } from '@/utils/format'

// 시연 시계 기준 (서버 데이터의 시각과 맞춤)
const now = ref(formatClock(serverNow()))
const timer = setInterval(() => (now.value = formatClock(serverNow())), 1000)
onBeforeUnmount(() => clearInterval(timer))
</script>

<template>
  <div class="live" :class="{ wait: USE_MOCK || !live.connected }">
    <i />
    <span>{{ USE_MOCK ? '예시 데이터' : live.connected ? '실시간 수신 중' : '연결 중…' }}</span>
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
