<!--
  센서 게이지 하나 (설계안 vEquip() '센서 현재값'의 .g)
  - 고리 게이지 + '전류 CT-17' + 기준 글자 두 줄
    · 정상: '평소 18.0 A'  / 주의·경보: '주의 기준 21.6 A 초과' (주황·빨강 굵게)
    · '주의 21.6 · 경보 27 A'
  - sensor 가 없으면(이 설비에 그 종류 센서가 없음) 점선 동그라미 + '전류 센서 없음'
-->
<script setup>
import { computed } from 'vue'
import { gaugeOption } from './gaugeOption'
import AppIcon from '@/components/AppIcon.vue'
import { LEVEL } from '@/types/codes'

const props = defineProps({
  /** 센서 종류 정보 (types/codes.js SENSOR_TYPES 한 줄) */
  type: { type: Object, required: true },
  /** 설비 상세의 센서 (없으면 null) */
  sensor: { type: Object, default: null },
  /** 지금 값 (실시간으로 바뀌는 값, 없으면 sensor.value) */
  value: { type: Number, default: null },
})

const now = computed(() => props.value ?? props.sensor?.value)

const option = computed(() =>
  gaugeOption({
    value: now.value,
    max: props.sensor.max,
    warn: props.sensor.warn,
    alarm: props.sensor.alarm,
    unit: props.sensor.unit,
    level: props.sensor.level,
    dec: props.type.dec,
  }),
)

const fmt = (v) => Number(v).toFixed(props.type.dec)

/** 첫째 줄: 평소 값 또는 넘은 기준 */
const stateText = computed(() => {
  const s = props.sensor
  if (s.level === LEVEL.WARN) return `주의 기준 ${s.warn} ${s.unit} 초과`
  if (s.level === LEVEL.ALARM || s.level === LEVEL.FIRE) return `경보 기준 ${s.alarm} ${s.unit} 초과`
  return `평소 ${fmt(s.usual)} ${s.unit}`
})
</script>

<template>
  <div class="gauge">
    <template v-if="sensor">
      <VChart class="chart" :option="option" autoresize />
      <div class="name">
        <AppIcon :name="type.icon" :size="15" />{{ type.label }} <span class="mono">{{ sensor.tag }}</span>
      </div>
      <div class="th" :class="{ warn: sensor.level === LEVEL.WARN, alarm: sensor.level === LEVEL.ALARM || sensor.level === LEVEL.FIRE }">
        {{ stateText }}
      </div>
      <div class="th">주의 {{ sensor.warn }} · 경보 {{ sensor.alarm }} {{ sensor.unit }}</div>
    </template>

    <template v-else>
      <div class="none">
        <span class="ring"><AppIcon :name="type.icon" :size="24" /></span>
      </div>
      <div class="name off">{{ type.label }} 센서 없음</div>
      <div class="th">이 설비에는 연결되지 않았습니다</div>
    </template>
  </div>
</template>

<style scoped>
.gauge {
  text-align: center;
  min-width: 0;
}

.chart {
  height: 250px;
}

.name {
  margin-top: -10px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  font-size: 14px;
  font-weight: 700;
  white-space: nowrap;
}

.name .app-icon {
  color: var(--color-text-sub);
}

.name .mono {
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text-weak);
}

.name.off {
  margin-top: 0;
  color: var(--color-text-weak);
}

.th {
  margin-top: 5px;
  font-size: 12px;
  color: var(--color-text-weak);
  white-space: nowrap;
}

.th.warn {
  color: var(--color-level-warn-text);
  font-weight: 700;
}

.th.alarm {
  color: var(--color-level-alarm-text);
  font-weight: 700;
}

/* 센서 없음: 점선 동그라미 */
.none {
  height: 250px;
  display: grid;
  place-items: center;
}

.ring {
  width: 150px;
  height: 150px;
  border: 2px dashed var(--color-border-strong);
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: var(--color-border-strong);
}
</style>
