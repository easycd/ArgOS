<!--
  사업장 선택 화면 (본사 관리자 전용)
  - 설계: 한반도 지도에 울산·아산·전주 표시 → 사업장 선택 → 공장 진입
  - 지금은 사업장 목록만 (지도는 설계 자료 받은 뒤 구현)
  - 데이터: GET /sites (지금은 예시 데이터)
-->
<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getSites } from '@/api/sites'
import BaseCard from '@/components/BaseCard.vue'
import LevelBadge from '@/components/LevelBadge.vue'
import { useAuthStore } from '@/stores/auth'

const router = useRouter()
const auth = useAuthStore()

const sites = ref([])
const loading = ref(true)
const errorMessage = ref('')

onMounted(async () => {
  try {
    sites.value = await getSites()
  } catch (error) {
    errorMessage.value = error.message
  } finally {
    loading.value = false
  }
})

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

    <BaseCard title="사업장 목록">
      <p v-if="loading" class="message">불러오는 중</p>
      <p v-else-if="errorMessage" class="message error">{{ errorMessage }}</p>

      <ul v-else class="site-list">
        <li v-for="site in sites" :key="site.id" class="site">
          <div class="site-info">
            <strong>{{ site.name }}</strong>
            <LevelBadge :level="site.level" />
            <span class="alarm mono">알림 {{ site.alarmCount }}</span>
          </div>
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
            <span v-if="site.factories.length === 0" class="message">준비 중</span>
          </div>
        </li>
      </ul>
    </BaseCard>
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
  gap: 12px;
  padding: 12px 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
}

.site-info,
.factories {
  display: flex;
  align-items: center;
  gap: 8px;
}

.alarm,
.message {
  color: var(--color-text-sub);
}

.message {
  margin: 0;
}

.error {
  color: var(--color-level-alarm);
}
</style>
