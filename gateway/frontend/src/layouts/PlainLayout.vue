<!--
  메뉴 없는 상단 바 + 본문 레이아웃
  - 사업장 선택 화면에서 사용 (설계안의 'hdr plain': 로고 + 화면 제목, 메뉴 없음)
  - 제목은 라우트 meta.title 에서 가져옴
-->
<script setup>
import { useRoute } from 'vue-router'
import AppHeader from '@/components/AppHeader.vue'

const route = useRoute()
</script>

<template>
  <div class="plain-layout">
    <AppHeader :title="route.meta.title" />
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
