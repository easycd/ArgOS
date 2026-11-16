<!--
  사업장 선택 화면 (본사 관리자 전용)
  - 설계: 한반도 지도에 울산·아산·전주 표시 → 사업장 선택 → 공장 진입
  - 지금은 자리 표시용 목록만. 지도는 다음 단계에서 구현
  - 이번 범위는 울산 5공장만 진입 가능
-->
<script setup>
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { SITES } from '@/features/site/sites'

const router = useRouter()
const auth = useAuthStore()

function enterFactory(factoryId) {
  router.push({ name: 'dashboard', params: { factoryId } })
}

async function onLogout() {
  await auth.logout()
  router.push({ name: 'login' })
}
</script>

<template>
  <section class="site-select">
    <div class="header">
      <h1 class="page-title">사업장 선택</h1>
      <button type="button" class="btn" @click="onLogout">로그아웃</button>
    </div>

    <!-- TODO: 한반도 지도 (다음 단계) -->
    <div class="map-placeholder">지도 영역</div>

    <ul class="site-list">
      <li v-for="site in SITES" :key="site.id" class="site">
        <strong>{{ site.name }}</strong>
        <div class="factories">
          <button
            v-for="factory in site.factories"
            :key="factory.id"
            type="button"
            class="btn btn-primary"
            :disabled="!factory.enabled"
            @click="enterFactory(factory.id)"
          >
            {{ factory.name }}
          </button>
          <span v-if="site.factories.length === 0" class="empty">준비 중</span>
        </div>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.site-select {
  width: 100%;
  max-width: 720px;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.map-placeholder {
  height: 240px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
  border: 1px dashed var(--color-border);
  border-radius: var(--radius-md);
  color: var(--color-text-sub);
  background: var(--color-surface);
}

.site-list {
  margin: 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.site {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.factories {
  display: flex;
  gap: 8px;
}

.empty {
  color: var(--color-text-sub);
}
</style>
