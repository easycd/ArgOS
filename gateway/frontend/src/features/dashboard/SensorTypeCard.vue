<!--
  센서별 단계 현황 카드: 전류·온도·CO 마다 도넛 + 정상·주의·경보 개수
  - 주의·경보가 있는 종류는 칸 테두리·배경을 상태 색으로 (설계안 .sdn)
-->
<script setup>
import { computed } from 'vue'
import BaseCard from '@/components/BaseCard.vue'
import SensorDonut from '@/features/site/SensorDonut.vue'
import StageCounts from '@/features/site/StageCounts.vue'
import { sumLevels, totalOf } from '@/features/site/siteStats'
import { LEVEL, SENSOR_TYPES } from '@/types/codes'

const props = defineProps({
  siteName: { type: String, default: '' },
  /** { CURRENT: {NORMAL,WARN,ALARM}, TEMP: {...}, CO: {...} } */
  levelsByType: { type: Object, required: true },
})

// 전체 합계 (제목줄)
const total = computed(() => sumLevels(Object.values(props.levelsByType)))

/** 칸 색: 경보가 있으면 빨강, 주의가 있으면 주황 */
function tileClass(counts) {
  if (counts[LEVEL.ALARM]) return 'is-alarm'
  if (counts[LEVEL.WARN]) return 'is-warn'
  return ''
}
</script>

<template>
  <BaseCard title="센서별 단계 현황" :sub="`${siteName} 센서 ${totalOf(total)}개`">
    <template #actions>
      <StageCounts :counts="total" />
    </template>

    <div class="tiles">
      <div v-for="t in SENSOR_TYPES" :key="t.type" class="tile" :class="tileClass(levelsByType[t.type])">
        <SensorDonut :counts="levelsByType[t.type]" :label="t.label" :size="92" :stroke="11" />
        <StageCounts :counts="levelsByType[t.type]" vertical class="counts" />
      </div>
    </div>
  </BaseCard>
</template>

<style scoped>
.tiles {
  display: flex;
  gap: 12px;
  padding: 16px 20px;
}

.tile {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  transition:
    border-color 0.2s,
    background 0.2s;
}

.tile.is-warn {
  border-color: var(--color-level-warn);
  background: #fff7ed;
}

.tile.is-alarm {
  border-color: var(--color-level-alarm);
  background: #fef2f2;
}

.counts {
  flex: 1;
}
</style>
