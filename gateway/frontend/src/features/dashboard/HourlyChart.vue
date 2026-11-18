<!--
  시간대별 알림 차트 한 줄 (ECharts): 주의·경보 막대(쌓기) + 조치 선
  - hours: 알림이 있는 시간만 온 값 → 12칸(예: 07~18시)을 모두 채워서 그림
  - startHour 부터 12시간 (주간 7 → 07~18, 야간 19 → 19~06)
-->
<script setup>
import { computed } from 'vue'
import { CHART_COLORS } from '@/utils/chartColors'

const props = defineProps({
  /** [{ hour, warn, alarm, action }] */
  hours: { type: Array, required: true },
  startHour: { type: Number, required: true },
})

const pad = (n) => String(n).padStart(2, '0')

// 12칸 채우기: 값이 없는 시간은 0
const slots = computed(() =>
  Array.from({ length: 12 }, (_, i) => {
    const hour = (props.startHour + i) % 24
    const found = props.hours.find((h) => h.hour === hour)
    return { hour, warn: found?.warn ?? 0, alarm: found?.alarm ?? 0, action: found?.action ?? 0 }
  }),
)

// ECharts 설정 (설계안 v-rev.js hourBar() 와 같은 모양)
const option = computed(() => ({
  // 처음 그리기 500ms, 값 바뀜 400ms (화면설계서 R2 --m-chart-in, --m-value)
  animationDuration: 500,
  animationDurationUpdate: 400,
  grid: { left: 26, right: 10, top: 14, bottom: 24 },
  tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
  xAxis: {
    type: 'category',
    data: slots.value.map((s) => pad(s.hour)),
    axisLine: { lineStyle: { color: CHART_COLORS.grid } },
    axisTick: { show: false },
    axisLabel: { color: CHART_COLORS.axis, fontSize: 10.5, interval: 0 },
  },
  yAxis: {
    type: 'value',
    max: 4,
    interval: 2,
    splitLine: { lineStyle: { color: CHART_COLORS.grid } },
    axisLabel: { color: CHART_COLORS.axis, fontSize: 10.5 },
  },
  series: [
    { name: '주의', type: 'bar', stack: 'alarm', barWidth: 18, data: slots.value.map((s) => s.warn), itemStyle: { color: CHART_COLORS.warn } },
    { name: '경보', type: 'bar', stack: 'alarm', barWidth: 18, data: slots.value.map((s) => s.alarm), itemStyle: { color: CHART_COLORS.alarm } },
    {
      name: '조치',
      type: 'line',
      data: slots.value.map((s) => s.action),
      symbol: 'circle',
      symbolSize: 6,
      lineStyle: { color: CHART_COLORS.action, width: 2 },
      itemStyle: { color: CHART_COLORS.action },
    },
  ],
}))
</script>

<template>
  <!-- VChart 는 main.js 에서 전역 등록 (utils/echarts.js). 높이를 정해 줘야 그려짐 -->
  <VChart class="hourly-chart" :option="option" autoresize />
</template>

<style scoped>
.hourly-chart {
  width: 100%;
  height: 104px;
}
</style>
