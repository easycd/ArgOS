<!--
  공정 3D 설비 배치도 화면 (예: 5공장 도장 공정 — 설계안 'dash/process')
  - 지금은 제목만 있는 자리 표시, 다음 작업에서 만듦
-->
<script setup>
import { useRoute } from 'vue-router'
import AppIcon from '@/components/AppIcon.vue'

const route = useRoute()
</script>

<template>
  <section>
    <RouterLink
      :to="{ name: 'dashboard', params: { siteId: route.params.siteId, factoryId: route.params.factoryId } }"
      class="back"
    >
      <AppIcon name="cr" :size="14" class="flip" />공정 배치도로
    </RouterLink>
    <h1 class="page-title">3D 설비 배치도</h1>
    <p class="placeholder">준비 중입니다. (다음 작업)</p>
  </section>
</template>

<style scoped>
.back {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 12px;
  color: var(--color-primary);
  font-size: 13px;
  text-decoration: none;
}

.flip {
  transform: rotate(180deg);
}

.placeholder {
  color: var(--color-text-sub);
}
</style>
