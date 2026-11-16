<!--
  공장 진입 후 공통 레이아웃: 상단 바 + 본문
  - 상단 바 왼쪽: 로고, 공장 이름, 메뉴 6개
  - 상단 바 오른쪽: 체크리스트 확인, 채팅(자리만), 사용자 정보, 로그아웃
  - 본문: 선택한 메뉴 화면(RouterView)
-->
<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getFactoryName } from '@/api/sites'
import { FACTORY_MENUS } from '@/router/menus'
import { useAuthStore } from '@/stores/auth'
import { ROLE, ROLE_LABEL } from '@/types/codes'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

// 주소의 공장 ID (/factories/:factoryId/...)
const factoryId = computed(() => route.params.factoryId)

// 상단 바에 보여 줄 공장 이름: 공장 ID 가 바뀔 때마다 API 로 조회 (실패하면 ID 그대로 표시)
const factoryName = ref('')
watch(
  factoryId,
  async (id) => {
    factoryName.value = id
    try {
      const factory = await getFactoryName(id)
      factoryName.value = `${factory.siteName} ${factory.name}` // 예: 울산공장 5공장
    } catch {
      // 조회 실패 시 ID 표시 유지
    }
  },
  { immediate: true },
)

// 본사 관리자만 다른 사업장으로 돌아갈 수 있음
const canChangeSite = computed(() => auth.role === ROLE.HQ_ADMIN)

async function onLogout() {
  await auth.logout()
  router.push({ name: 'login' })
}

// TODO: 체크리스트 확인, 채팅 화면은 설계 확정 후 연결
function onChecklist() {}
function onChat() {}
</script>

<template>
  <div class="main-layout">
    <header class="topbar">
      <div class="topbar-left">
        <span class="logo">ArgOS</span>

        <RouterLink v-if="canChangeSite" :to="{ name: 'site-select' }" class="factory-name" title="사업장 선택으로 이동">
          {{ factoryName }}
        </RouterLink>
        <span v-else class="factory-name">{{ factoryName }}</span>

        <!-- 메뉴 6개: router/menus.js 의 FACTORY_MENUS 순서대로 -->
        <nav class="menu">
          <RouterLink
            v-for="menu in FACTORY_MENUS"
            :key="menu.name"
            :to="{ name: menu.name, params: { factoryId } }"
            class="menu-item"
            active-class="is-active"
          >
            {{ menu.label }}
          </RouterLink>
        </nav>
      </div>

      <div class="topbar-right">
        <button type="button" class="btn" @click="onChecklist">체크리스트</button>
        <button type="button" class="btn" @click="onChat">채팅</button>
        <span class="user">
          {{ auth.user?.name }}
          <small>{{ ROLE_LABEL[auth.role] }}</small>
        </span>
        <button type="button" class="btn" @click="onLogout">로그아웃</button>
      </div>
    </header>

    <main class="content">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.topbar {
  position: sticky;
  top: 0;
  z-index: 10;
  height: var(--topbar-height);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 0 20px;
  background: var(--color-surface);
  border-bottom: 1px solid var(--color-border);
}

.topbar-left,
.topbar-right {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.logo {
  font-size: 18px;
  font-weight: 800;
}

.factory-name {
  padding: 4px 10px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  color: var(--color-text);
  text-decoration: none;
  white-space: nowrap;
}

.menu {
  display: flex;
  gap: 4px;
  overflow-x: auto; /* 화면이 좁으면 메뉴만 가로 스크롤 */
}

.menu-item {
  padding: 8px 12px;
  border-radius: var(--radius-sm);
  color: var(--color-text-sub);
  text-decoration: none;
  white-space: nowrap;
}

.menu-item:hover {
  background: var(--color-bg);
}

.menu-item.is-active {
  color: var(--color-text);
  font-weight: 700;
  background: var(--color-bg);
}

.user {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
  white-space: nowrap;
}

.user small {
  color: var(--color-text-sub);
}

.content {
  padding: 24px;
}
</style>
