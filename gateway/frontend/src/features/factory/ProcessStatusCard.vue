<!--
  공정별 설비 상태 카드: 공정마다 설비 단계 도넛 + 센서 종류별 단계
  - 공정을 누르면 select 이벤트 (페이지가 이동 또는 안내)
-->
<script setup>
import { computed } from 'vue'
import ProcessStatusItem from './ProcessStatusItem.vue'
import BaseCard from '@/components/BaseCard.vue'
import { STAGES } from '@/features/site/stages'

const props = defineProps({
  factoryName: { type: String, required: true },
  processes: { type: Array, required: true },
  /** 열화상 카메라 [{ tag, processId }] */
  cameras: { type: Array, default: () => [] },
})

const emit = defineEmits(['select'])

// 공장 전체 설비 수 (제목줄)
const equipmentTotal = computed(() => props.processes.reduce((n, p) => n + p.equipmentCount, 0))

const cameraOf = (process) => props.cameras.find((c) => c.processId === process.id)?.tag ?? ''
</script>

<template>
  <BaseCard title="공정별 설비 상태" :sub="`${factoryName} · 설비 ${equipmentTotal}대 · 센서 종류별 단계`">
    <template #actions>
      <span v-for="s in STAGES" :key="s.level" class="legend"><i :style="{ background: s.color }" />{{ s.label }}</span>
    </template>

    <div class="list">
      <ProcessStatusItem
        v-for="p in processes"
        :key="p.id"
        :process="p"
        :camera-tag="cameraOf(p)"
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
  gap: 14px;
  padding: 16px 20px 18px;
}
</style>
