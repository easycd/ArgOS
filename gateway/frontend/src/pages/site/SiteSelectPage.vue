<!--
  사업장 선택 화면 (본사 관리자 전용)
  - 화면설계안 js/v-rev.js vRegion() 의 평상시(화재 아님) 화면 기준
  - 배치: 왼쪽 위 지도(SiteMapCard) / 왼쪽 아래 센서 단계(SiteSensorCard) / 오른쪽 목록(SiteListCard)
  - 이 파일은 데이터 불러오기와 화면 이동만 담당, 모양은 features/site 의 각 카드가 담당
  - 이번 범위는 울산공장 5공장만 진입 가능, 나머지는 '준비 중' 안내
-->
<script setup>
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getSites } from '@/api/sites'
import AppNotice from '@/components/AppNotice.vue'
import SiteListCard from '@/features/site/SiteListCard.vue'
import SiteMapCard from '@/features/site/SiteMapCard.vue'
import SiteSensorCard from '@/features/site/SiteSensorCard.vue'
import { useNotice } from '@/utils/useNotice'

const router = useRouter()

/** 지금 진입 가능한 사업장·공장 (설계 범위: 울산공장 5공장만) */
const AVAILABLE_SITE_ID = 1
const AVAILABLE_FACTORY_ID = 5

// 사업장 목록 (GET /sites)
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

// 짧은 안내 문구
const { message: noticeMessage, show: showNotice } = useNotice()

/**
 * 사업장으로 이동 (지도 핀, 도넛 카드, '이동' 버튼)
 * - 설계안: 울산공장 → 울산공장(사업장) 현황 화면
 * - TODO: 사업장 현황 화면(GET /sites/{siteId}/overview)이 생기면 그쪽으로.
 *         지금은 진입 가능한 5공장 대시보드로 이동
 */
function enterSite(siteId) {
  if (siteId !== AVAILABLE_SITE_ID) {
    const site = sites.value.find((s) => s.id === siteId)
    showNotice(`${site?.name ?? '이 사업장'} 화면은 준비 중입니다. 지금은 울산공장만 볼 수 있습니다.`)
    return
  }
  router.push({ name: 'dashboard', params: { factoryId: AVAILABLE_FACTORY_ID } })
}

/** 공장 줄을 눌렀을 때 (FactoryRow 가 진입 가능한 공장만 이벤트를 보냄) */
function enterFactory(factory) {
  router.push({ name: 'dashboard', params: { factoryId: factory.id } })
}
</script>

<template>
  <div class="site-select">
    <p v-if="loading" class="state">불러오는 중</p>
    <p v-else-if="errorMessage" class="state error">{{ errorMessage }}</p>

    <template v-else>
      <div class="left">
        <SiteMapCard :sites="sites" :current-id="AVAILABLE_SITE_ID" @select="enterSite" />
        <SiteSensorCard :sites="sites" @select="enterSite" />
      </div>
      <SiteListCard
        :sites="sites"
        :current-site-id="AVAILABLE_SITE_ID"
        :link-factory-id="AVAILABLE_FACTORY_ID"
        @enter="enterSite"
        @enter-factory="enterFactory"
      />
    </template>

    <AppNotice :message="noticeMessage" />
  </div>
</template>

<style scoped>
/* 배치: 왼쪽 700px 열 + 오른쪽 목록 (설계안 1920 화면 기준), 좁은 화면에서는 위아래로 */
.site-select {
  display: grid;
  grid-template-columns: minmax(0, 700px) minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}

@media (max-width: 1200px) {
  .site-select {
    grid-template-columns: minmax(0, 1fr);
  }
}

.left {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.state {
  grid-column: 1 / -1;
  color: var(--color-text-sub);
}

.state.error {
  color: var(--color-level-alarm-text);
}
</style>
