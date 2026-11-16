<!--
  카드 틀 (화면설계안 css/base.css 의 .card / .ch 모양)
  - 제목줄: 제목(title) + 회색 설명(sub) + 오른쪽 끝 영역(actions 슬롯)
  - 사용 예:
    <BaseCard title="사업장 목록" sub="3곳">
      <template #actions><button>...</button></template>
      본문
    </BaseCard>
-->
<script setup>
defineProps({
  /** 카드 제목 (없으면 제목줄을 그리지 않음) */
  title: { type: String, default: '' },
  /** 제목 옆 회색 설명 */
  sub: { type: String, default: '' },
})
</script>

<template>
  <section class="base-card">
    <header v-if="title" class="card-head">
      <h3>{{ title }}</h3>
      <!-- 설명: 글자만이면 sub, 링크 등이 필요하면 sub 슬롯 -->
      <span v-if="sub || $slots.sub" class="sub"><slot name="sub">{{ sub }}</slot></span>
      <div v-if="$slots.actions" class="actions"><slot name="actions" /></div>
    </header>
    <slot />
  </section>
</template>

<style scoped>
.base-card {
  background: var(--color-surface);
  border: 1px solid var(--color-border-card);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.card-head {
  height: 48px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 20px;
  border-bottom: 1px solid var(--color-border);
  white-space: nowrap;
}

h3 {
  font-size: 16px;
  font-weight: 700;
  letter-spacing: -0.2px;
}

.sub {
  font-size: 13px;
  color: var(--color-text-weak);
}

.actions {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  color: var(--color-text-sub);
}
</style>
