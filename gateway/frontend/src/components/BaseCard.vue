<!--
  카드 틀: 흰 배경 + 테두리 + 제목줄(선택)
  - 사용 예:
    <BaseCard title="사업장 목록">
      <template #actions><button>...</button></template>
      본문
    </BaseCard>
-->
<script setup>
defineProps({
  /** 카드 제목 (없으면 제목줄을 그리지 않음) */
  title: { type: String, default: '' },
})
</script>

<template>
  <section class="base-card">
    <header v-if="title || $slots.actions" class="card-header">
      <h2 class="card-title">{{ title }}</h2>
      <div class="card-actions"><slot name="actions" /></div>
    </header>
    <div class="card-body">
      <slot />
    </div>
  </section>
</template>

<style scoped>
.base-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 12px 16px;
  border-bottom: 1px solid var(--color-border);
}

.card-title {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
}

.card-body {
  padding: 16px;
}
</style>
