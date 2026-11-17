<!--
  공정별 설비 상태 카드 안의 공정 하나 (설계안 v-dash.js vPlant() 의 공정 카드)
  - 위: 공정 이름 + 상태 배지
  - 가운데: 설비 단계 도넛(정상·주의·경보 설비 수) + 개수 목록
  - 아래: 센서 종류별(전류·온도·CO) 단계 막대와 '정상 6 / 주의 1' 표시, 센서 수·열화상 카메라
  - 누르면 select 이벤트
-->
<script setup>
import LevelBadge from '@/components/LevelBadge.vue'
import SensorDonut from '@/features/site/SensorDonut.vue'
import StageBar from '@/features/site/StageBar.vue'
import StageCounts from '@/features/site/StageCounts.vue'
import { keyOf } from '@/features/site/stages'
import { LEVEL, SENSOR_TYPES } from '@/types/codes'

defineProps({
  /** 공장 현황의 공정 하나 */
  process: { type: Object, required: true },
  /** 이 공정의 열화상 카메라 태그 (예: IR-01) */
  cameraTag: { type: String, default: '' },
})

const emit = defineEmits(['select'])

/** 종류별 한 줄 오른쪽 글자: 경보가 있으면 '경보 1', 주의가 있으면 '주의 1', 아니면 '정상 6' */
function typeSummary(counts) {
  if (counts[LEVEL.ALARM]) return { text: `경보 ${counts[LEVEL.ALARM]}`, cls: 'is-alarm' }
  if (counts[LEVEL.WARN]) return { text: `주의 ${counts[LEVEL.WARN]}`, cls: 'is-warn' }
  return { text: `정상 ${counts[LEVEL.NORMAL]}`, cls: '' }
}
</script>

<template>
  <button type="button" class="process-item" :class="`is-${keyOf(process.level)}`" @click="emit('select', process)">
    <span class="head">
      {{ process.name }}
      <LevelBadge :level="process.level" />
    </span>

    <span class="equipment">
      <SensorDonut :counts="process.equipmentLevels" label="설비" :size="104" :stroke="13" />
      <StageCounts :counts="process.equipmentLevels" vertical class="counts" />
    </span>

    <span class="types">
      <span v-for="t in SENSOR_TYPES" :key="t.type" class="type">
        <span class="name">{{ t.label }}</span>
        <StageBar :counts="process.levelsByType[t.type]" />
        <b class="mono" :class="typeSummary(process.levelsByType[t.type]).cls">
          {{ typeSummary(process.levelsByType[t.type]).text }}
        </b>
      </span>
    </span>

    <span class="foot">
      <span>센서 <b class="mono">{{ process.sensorCount }}</b></span>
      <span>열화상 <b class="mono">{{ cameraTag }}</b></span>
    </span>
  </button>
</template>

<style scoped>
.process-item {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  padding: 13px 16px 12px;
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: #fff;
  text-align: left;
  cursor: pointer;
  transition:
    border-color 0.15s,
    box-shadow 0.15s;
}

.process-item:hover {
  border-color: #93c5fd;
  box-shadow: 0 2px 10px rgba(37, 99, 235, 0.12);
}

/* 주의·경보 공정은 테두리·배경을 상태 색으로 */
.process-item.is-warn {
  border-color: var(--color-level-warn);
  background: rgba(255, 237, 213, 0.33);
}

.process-item.is-alarm,
.process-item.is-fire {
  border-color: var(--color-level-alarm);
  background: rgba(254, 226, 226, 0.33);
}

.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  font-size: 16px;
  font-weight: 700;
}

.equipment {
  display: flex;
  align-items: center;
  gap: 18px;
  margin-top: 14px;
}

.counts {
  flex: 1;
}

/* 센서 종류별 막대 */
.types {
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px dashed var(--color-border);
}

.type {
  height: 24px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12.5px;
  color: var(--color-text-sub);
}

.type .name {
  width: 30px;
  font-weight: 600;
}

.type b {
  width: 74px;
  text-align: right;
  font-weight: 600;
  color: var(--color-text-sub);
}

.type b.is-warn {
  color: var(--color-level-warn-text);
}

.type b.is-alarm {
  color: var(--color-level-alarm-text);
}

.foot {
  display: flex;
  justify-content: space-between;
  margin-top: 8px;
  font-size: 12px;
  color: #64748b;
}

.foot b {
  color: var(--color-text);
}
</style>
