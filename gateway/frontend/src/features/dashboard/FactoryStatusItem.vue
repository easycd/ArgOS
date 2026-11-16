<!--
  전체 공장 상태 카드 안의 공장 하나
  - 이름 + 상태 배지, 전류·온도·CO 작은 도넛 3개, 아래 줄에 센서 수·오늘 알림
  - 누르면 select 이벤트 (들어갈 수 있는 공장이면 이동, 아니면 지도 말풍선)
-->
<script setup>
import LevelBadge from '@/components/LevelBadge.vue'
import SensorDonut from '@/features/site/SensorDonut.vue'
import { keyOf } from '@/features/site/stages'
import { LEVEL, SENSOR_TYPES } from '@/types/codes'

defineProps({
  /** 사업장 현황의 공장 하나 */
  factory: { type: Object, required: true },
})

const emit = defineEmits(['select'])

/** 도넛 아래 이름: 경보·주의가 있으면 개수도 같이 (예: '전류 주의 1') */
function typeLabel(label, counts) {
  if (counts[LEVEL.ALARM]) return `${label} 경보 ${counts[LEVEL.ALARM]}`
  if (counts[LEVEL.WARN]) return `${label} 주의 ${counts[LEVEL.WARN]}`
  return label
}

/** 도넛 아래 이름 색 */
function typeClass(counts) {
  if (counts[LEVEL.ALARM]) return 'is-alarm'
  if (counts[LEVEL.WARN]) return 'is-warn'
  return ''
}
</script>

<template>
  <button type="button" class="factory-item" :class="`is-${keyOf(factory.level)}`" @click="emit('select', factory)">
    <span class="head">
      {{ factory.name }}
      <LevelBadge :level="factory.level" />
    </span>

    <span class="donuts">
      <span v-for="t in SENSOR_TYPES" :key="t.type" class="donut">
        <SensorDonut :counts="factory.levelsByType[t.type]" :size="54" :stroke="7" />
        <small :class="typeClass(factory.levelsByType[t.type])">
          {{ typeLabel(t.label, factory.levelsByType[t.type]) }}
        </small>
      </span>
    </span>

    <span class="foot">
      <span>센서 <b class="mono">{{ factory.sensorCount }}</b></span>
      <span>오늘 알림 <b class="mono alarms">{{ factory.todayAlarmCount }}</b></span>
    </span>
  </button>
</template>

<style scoped>
.factory-item {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  padding: 14px 12px 13px;
  border: 1.5px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: #fff;
  text-align: left;
  cursor: pointer;
  transition:
    border-color 0.15s,
    box-shadow 0.15s;
}

.factory-item:hover {
  border-color: #93c5fd;
  box-shadow: 0 2px 10px rgba(37, 99, 235, 0.12);
}

/* 주의·경보 공장은 테두리·배경을 상태 색으로 */
.factory-item.is-warn {
  border-color: var(--color-level-warn);
  background: rgba(255, 237, 213, 0.4);
}

.factory-item.is-alarm,
.factory-item.is-fire {
  border-color: var(--color-level-alarm);
  background: rgba(254, 226, 226, 0.4);
}

.head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  font-size: 15px;
  font-weight: 700;
  white-space: nowrap;
}

.donuts {
  display: flex;
  justify-content: space-between;
  margin: auto 0;
  padding: 12px 0;
}

.donut {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.donut small {
  margin-top: 5px;
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-sub);
  white-space: nowrap;
}

.donut small.is-warn {
  color: var(--color-level-warn-text);
}

.donut small.is-alarm {
  color: var(--color-level-alarm-text);
}

.foot {
  display: flex;
  justify-content: space-between;
  padding-top: 12px;
  border-top: 1px dashed var(--color-border);
  font-size: 12px;
  color: #64748b;
  white-space: nowrap;
}

.foot b {
  color: var(--color-text);
}

.factory-item.is-warn .foot .alarms {
  color: var(--color-level-warn-text);
}

.factory-item.is-alarm .foot .alarms,
.factory-item.is-fire .foot .alarms {
  color: var(--color-level-alarm-text);
}
</style>
