<!--
  상단 바 채팅·알림 아이콘 + 빨간 숫자 (설계안 .bell em)
  - 알림 숫자: GET /notifications/summary (아직 조치 안 끝난 알림). 알림이 있으면 종 아이콘이 흔들림
  - 채팅: 누르면 오른쪽 채팅 패널 열기·닫기 (features/chat/ChatPanel.vue), 숫자는 안 읽은 채팅 (stores/chat.js 대화방 합계)
    채팅을 쓰지 않는 사람(공정 담당자)에게는 채팅 아이콘이 없음
  - TODO: 알림 목록 펼치기는 해당 화면 작업 때 연결
-->
<script setup>
import { onMounted, ref } from 'vue'
import AppIcon from './AppIcon.vue'
import { getNotificationSummary } from '@/api/notifications'
import { useChatStore } from '@/stores/chat'
import { useLiveReload } from '@/utils/useLiveReload'

const summary = ref({ unackedAlarmCount: 0, unreadChatCount: 0 })
const chat = useChatStore()

async function load() {
  try {
    summary.value = await getNotificationSummary()
  } catch {
    // 숫자를 못 받아도 아이콘은 그대로 둠
  }
}

onMounted(load)
useLiveReload(load) // 알림이 생기거나 끝나면 숫자도 다시

function onBell() {}
</script>

<template>
  <button
    v-if="chat.enabled"
    type="button"
    class="icon-btn"
    :class="{ on: chat.open }"
    aria-label="채팅"
    :aria-expanded="chat.open"
    @click="chat.toggle()"
  >
    <AppIcon name="chat" />
    <!-- 새 글이 오면 숫자가 톡 커졌다 돌아옴 (화면설계서 I1 '120% 300ms') -->
    <em v-if="chat.unread" :key="chat.unread" class="pop">{{ chat.unread }}</em>
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

/* 채팅 패널이 열려 있으면 아이콘 파랗게 */
.icon-btn.on {
  color: var(--color-primary);
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

em.pop {
  animation: badge-pop 300ms ease-out;
}

@keyframes badge-pop {
  40% {
    transform: scale(1.2);
  }
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
