<!--
  사업장 안 화면의 공통 레이아웃: 상단 바 + 본문
  - 상단 바: 로고 + 사업장 이름(SitePill) + 메뉴(AppNav) + 오른쪽 상태·사용자 (AppHeader)
  - 본문: 선택한 화면(RouterView)
-->
<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { getSiteName } from '@/api/sites'
import AppHeader from '@/components/AppHeader.vue'
import AppNav from '@/components/AppNav.vue'
import SitePill from '@/components/SitePill.vue'

const route = useRoute()

// 주소의 사업장 ID (/sites/:siteId/...)
const siteId = computed(() => route.params.siteId)

// 상단 바에 보여 줄 사업장 이름: 사업장 ID 가 바뀔 때마다 조회 (실패하면 비워 둠)
const siteName = ref('')
watch(
  siteId,
  async (id) => {
    siteName.value = ''
    try {
      siteName.value = await getSiteName(id)
    } catch {
      // 조회 실패 시 이름 없이 표시
    }
  },
  { immediate: true },
)
</script>

<template>
  <div class="main-layout">
    <AppHeader>
      <SitePill :name="siteName" />
      <AppNav />
    </AppHeader>

    <main class="content">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
.content {
  padding: 16px 20px 24px;
}
</style>
