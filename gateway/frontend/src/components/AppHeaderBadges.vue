<!--
  상단 바 채팅·알림 아이콘 + 빨간 숫자 (설계안 .bell em)
  - 숫자: GET /notifications/summary (안 읽은 채팅, 아직 조치 안 끝난 알림)
  - 알림이 있으면 종 아이콘이 흔들림
  - TODO: 채팅 패널, 알림 목록 펼치기는 해당 화면 작업 때 연결
-->
<script setup>
import { onMounted, ref } from 'vue'
import AppIcon from './AppIcon.vue'
import { getNotificationSummary } from '@/api/notifications'

const summary = ref({ unackedAlarmCount: 0, unreadChatCount: 0 })

onMounted(async () => {
  try {
    summary.value = await getNotificationSummary()
  } catch {
    // 숫자를 못 받아도 아이콘은 그대로 둠
  }
})

function onChat() {}
function onBell() {}
</script>

<template>
  <button type="button" class="icon-btn" aria-label="채팅" @click="onChat">
    <AppIcon name="chat" />
    <em v-if="summary.unreadChatCount">{{ summary.unreadChatCount }}</em>
  </button>
  <button
    type="button"
    class="icon-btn"
    :class="{ ring: summary.unackedAlarmCount > 0 }"
    aria-label="알림"
    @click="onBell"
  >
    <AppIcon name="bell" />
    <em v-if="summary.unackedAlarmCount">{{ summary.unackedAlarmCount }}</em>
  </button>
</template>

<style scoped>
.icon-btn {
  position: relative;
  display: grid;
  place-items: center;
  padding: 0;
  border: none;
  background: none;
  color: var(--color-text-sub);
  cursor: pointer;
}

/* 빨간 숫자 */
em {
  position: absolute;
  top: -6px;
  right: -8px;
  min-width: 17px;
  height: 17px;
  display: grid;
  place-items: center;
  border: 2px solid #fff;
  border-radius: 9px;
  background: var(--color-level-alarm);
  color: #fff;
  font-size: 10px;
  font-style: normal;
  font-weight: 700;
}

/* 알림이 있으면 종이 흔들림 */
.ring .app-icon {
  transform-origin: 50% 10%;
  animation: bellring 1.2s ease-in-out infinite;
}

@keyframes bellring {
  0%,
  60%,
  100% {
    transform: rotate(0);
  }
  10%,
  30%,
  50% {
    transform: rotate(14deg);
  }
  20%,
  40% {
    transform: rotate(-14deg);
  }
}
</style>
