<!--
  상단 바 (화면설계안 js/shell.js buildHeader, css/base.css .hdr 기준)
  - 왼쪽: 로고(누르면 권한별 첫 화면), 제목(title 이 있을 때. 예: 사업장 선택)
  - 가운데: 기본 슬롯 (공장 화면의 메뉴 등을 넣을 자리)
  - 오른쪽: 수신 상태, 시계, 채팅, 알림, 사용자 메뉴(로그아웃)
-->
<script setup>
import { onBeforeUnmount, ref } from 'vue'
import { useRouter } from 'vue-router'
import { USE_MOCK } from '@/api/mock'
import AppIcon from './AppIcon.vue'
import { homeRouteOf } from '@/router/home'
import { useAuthStore } from '@/stores/auth'
import { ROLE_LABEL } from '@/types/codes'
import { formatClock } from '@/utils/format'

defineProps({
  /** 로고 옆 제목 (메뉴가 없는 화면에서 사용) */
  title: { type: String, default: '' },
})

const router = useRouter()
const auth = useAuthStore()

// 시계: 1초마다 갱신
const now = ref(formatClock(new Date()))
const timer = setInterval(() => (now.value = formatClock(new Date())), 1000)
onBeforeUnmount(() => clearInterval(timer))

// 사용자 메뉴 열림 여부
const userMenuOpen = ref(false)

function goHome() {
  router.push(homeRouteOf(auth.user))
}

async function onLogout() {
  userMenuOpen.value = false
  await auth.logout()
  router.push({ name: 'login' })
}

// TODO: 채팅 패널, 알림 목록은 해당 화면 작업 때 연결
function onChat() {}
function onBell() {}
</script>

<template>
  <header class="app-header">
    <button type="button" class="logo" aria-label="첫 화면으로" @click="goHome">
      <span class="mark"><AppIcon name="eye" :size="22" /></span>
      <b>ArgOS</b>
    </button>
    <div v-if="title" class="title">{{ title }}</div>

    <slot />

    <div class="right">
      <!-- 수신 상태: 실시간 연결(SSE) 작업 전이라 예시 데이터 모드에서는 '예시 데이터'로 표시 -->
      <!-- TODO: SSE 연결 후 연결 상태(수신 중 / 끊김)에 맞게 표시 -->
      <div class="live" :class="{ wait: USE_MOCK }">
        <i />
        <span>{{ USE_MOCK ? '예시 데이터' : '실시간 수신 중' }}</span>
      </div>
      <span class="clock mono">{{ now }}</span>

      <button type="button" class="icon-btn" aria-label="채팅" @click="onChat">
        <AppIcon name="chat" />
      </button>
      <button type="button" class="icon-btn" aria-label="알림" @click="onBell">
        <AppIcon name="bell" />
      </button>

      <div class="user-wrap">
        <button type="button" class="user" :aria-expanded="userMenuOpen" @click="userMenuOpen = !userMenuOpen">
          <span class="avatar"><AppIcon name="user" /></span>
          <span>{{ ROLE_LABEL[auth.role] }}</span>
          <AppIcon name="cd" :size="14" class="chev" />
        </button>
        <div v-if="userMenuOpen" class="menu" role="menu">
          <div class="menu-head">{{ auth.user?.name }} · {{ auth.user?.loginId }}</div>
          <button type="button" class="menu-item" role="menuitem" @click="onLogout">
            <AppIcon name="logout" :size="16" />로그아웃
          </button>
        </div>
      </div>
    </div>
  </header>
</template>

<style scoped>
.app-header {
  position: sticky;
  top: 0;
  z-index: 10;
  height: var(--topbar-height);
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 0 24px;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
}

.logo {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0;
  border: none;
  background: none;
  cursor: pointer;
}

.logo b {
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.3px;
}

.mark {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  background: var(--color-primary-hover);
  color: #fff;
  display: grid;
  place-items: center;
}

.title {
  margin-left: 14px;
  padding-left: 18px;
  border-left: 1px solid var(--color-border);
  font-size: 15px;
  font-weight: 600;
  color: #334155;
  white-space: nowrap;
}

.right {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 18px;
  font-size: 13px;
  color: var(--color-text-sub);
  white-space: nowrap;
}

/* 수신 상태 점 */
.live {
  display: flex;
  align-items: center;
  gap: 7px;
}

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

.icon-btn {
  display: grid;
  place-items: center;
  padding: 0;
  border: none;
  background: none;
  color: var(--color-text-sub);
  cursor: pointer;
}

/* 사용자 메뉴 */
.user-wrap {
  position: relative;
}

.user {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0;
  border: none;
  background: none;
  color: var(--color-text);
  font-weight: 500;
  cursor: pointer;
}

.avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--color-border);
  color: var(--color-text-sub);
  display: grid;
  place-items: center;
}

.chev {
  color: var(--color-text-weak);
}

.menu {
  position: absolute;
  right: 0;
  top: calc(100% + 8px);
  width: 210px;
  padding: 6px;
  background: #fff;
  border: 1px solid var(--color-border-card);
  border-radius: var(--radius-md);
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.12);
}

.menu-head {
  padding: 8px 10px;
  font-size: 12.5px;
  color: var(--color-text-weak);
}

.menu-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  border: none;
  border-radius: var(--radius-sm);
  background: none;
  font-size: 14px;
  cursor: pointer;
}

.menu-item:hover {
  background: var(--color-surface-sub);
}
</style>
