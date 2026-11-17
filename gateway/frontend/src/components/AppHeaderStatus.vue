<!--
  상단 바 오른쪽: 수신 상태 + 시계
  - 수신 상태: 실시간 연결(SSE) 작업 전이라 예시 데이터 모드에서는 회색 '예시 데이터'로 표시
  - TODO: SSE 연결 후 연결 상태(수신 중 / 끊김)에 맞게 표시
  - 시계: 1초마다 갱신
-->
<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import { USE_MOCK } from '@/api/mock'
import { formatClock } from '@/utils/format'

const now = ref(formatClock(new Date()))
const timer = setInterval(() => (now.value = formatClock(new Date())), 1000)
// '2026-11-17 (화) 13:23:39' → 날짜 '2026-11-17 (화)' + 시각 '13:23:39' (좁은 화면에서 날짜만 숨기려고 나눔)
const date = computed(() => now.value.slice(0, now.value.lastIndexOf(' ')))
const time = computed(() => now.value.slice(now.value.lastIndexOf(' ') + 1))
onBeforeUnmount(() => clearInterval(timer))
</script>

<template>
  <div class="live" :class="{ wait: USE_MOCK }" :title="USE_MOCK ? '예시 데이터' : '실시간 수신 중'">
    <i />
    <span class="lbl">{{ USE_MOCK ? '예시 데이터' : '실시간 수신 중' }}</span>
  </div>
  <span class="clock mono" :title="now"><span class="date">{{ date }}</span>{{ time }}</span>
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

.date {
  margin-right: 0.5em; /* 날짜와 시각 사이 */
}

/* 1920 보다 좁은 화면: 날짜를 숨기고 시각만 (마우스를 올리면 전체) */
@media (max-width: 1800px) {
  .date {
    display: none;
  }
}

/* 더 좁으면 '예시 데이터' 글자도 숨기고 점만 */
@media (max-width: 1600px) {
  .lbl {
    display: none;
  }
}
</style>
