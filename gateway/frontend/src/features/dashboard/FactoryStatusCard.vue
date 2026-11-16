<!--
  전체 공장 상태 카드: 공장마다 전류·온도·CO 단계를 작은 도넛으로
  - 공장을 누르면 select 이벤트 (페이지가 이동 또는 말풍선 처리)
-->
<script setup>
import FactoryStatusItem from './FactoryStatusItem.vue'
import BaseCard from '@/components/BaseCard.vue'
import { STAGES } from '@/features/site/stages'

defineProps({
  factories: { type: Array, required: true },
})

const emit = defineEmits(['select'])
</script>

<template>
  <BaseCard title="전체 공장 상태" sub="공장별 센서 단계 · 전류 · 온도 · CO">
    <template #actions>
      <span v-for="s in STAGES" :key="s.level" class="legend">
        <i :style="{ background: s.color }" />{{ s.label }}
      </span>
    </template>

    <div class="list">
      <FactoryStatusItem
        v-for="factory in factories"
        :key="factory.id"
        :factory="factory"
        @select="emit('select', $event)"
      />
    </div>
  </BaseCard>
</template>

<style scoped>
.legend {
  display: flex;
  align-items: center;
  gap: 6px;
}

.legend i {
  width: 12px;
  height: 12px;
  border-radius: 3px;
}

.list {
  display: flex;
  gap: 12px;
  padding: 20px;
}
</style>
