<!--
  시간대별 알림 카드: 주간(07~19시) · 야간(19~07시) 두 줄 (GET /alarms/hourly)
  - 줄마다 왼쪽에 이름·시간·알림/조치 건수, 오른쪽에 차트(HourlyChart)
-->
<script setup>
import HourlyChart from './HourlyChart.vue'
import BaseCard from '@/components/BaseCard.vue'
import { CHART_COLORS } from '@/utils/chartColors'

defineProps({
  /** { day: { alarmCount, actionCount, hours }, night: { ... } } */
  hourly: { type: Object, required: true },
})

// 두 줄 설정: 이름, 시간 표시, 시작 시각, 응답의 키
const SHIFTS = [
  { key: 'day', label: '주간', range: '07–19시', startHour: 7 },
  { key: 'night', label: '야간', range: '19–07시', startHour: 19 },
]

// 범례 (차트 색과 같게)
const LEGEND = [
  { label: '주의', color: CHART_COLORS.warn },
  { label: '경보', color: CHART_COLORS.alarm },
  { label: '조치', color: CHART_COLORS.action },
]
</script>

<template>
  <BaseCard title="시간대별 알림" sub="주간 · 야간">
    <template #actions>
      <span v-for="l in LEGEND" :key="l.label" class="legend"><i :style="{ background: l.color }" />{{ l.label }}</span>
    </template>

    <div class="shifts">
      <div v-for="s in SHIFTS" :key="s.key" class="shift">
        <div class="label">
          <b>{{ s.label }}</b>
          <span class="mono">{{ s.range }}</span>
          <em>
            알림 <b class="mono">{{ hourly[s.key].alarmCount }}</b> ·
            조치 <b class="mono">{{ hourly[s.key].actionCount }}</b>
          </em>
        </div>
        <HourlyChart :hours="hourly[s.key].hours" :start-hour="s.startHour" />
      </div>
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

.shifts {
  padding: 8px 12px 4px 8px;
}

.shift {
  display: flex;
  align-items: flex-start;
  height: 140px;
}

.label {
  width: 84px;
  flex: none;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 14px 0 0 8px;
}

.label > b {
  font-size: 14px;
}

.label > span {
  font-size: 11px;
  color: var(--color-text-weak);
}

.label em {
  margin-top: 8px;
  font-size: 11.5px;
  font-style: normal;
  line-height: 17px;
  color: var(--color-text-sub);
}

.label em b {
  font-size: 13px;
  color: var(--color-text);
}
</style>
