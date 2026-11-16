<!--
  설비 상세 화면 (예: 상도 건조로 — 설계안 'equip')
  - 지금은 제목만 있는 자리 표시, 다음 작업에서 만듦
-->
<script setup>
import { useRoute } from 'vue-router'
import AppIcon from '@/components/AppIcon.vue'

const route = useRoute()
const { siteId, factoryId, processId } = route.params
</script>

<template>
  <section>
    <RouterLink :to="{ name: 'process', params: { siteId, factoryId, processId } }" class="back">
      <AppIcon name="cr" :size="14" class="flip" />설비 배치도로
    </RouterLink>
    <h1 class="page-title">설비 상세</h1>
    <p class="placeholder">준비 중입니다. (다음 작업) · 설비 번호 {{ route.params.equipmentId }}</p>
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
