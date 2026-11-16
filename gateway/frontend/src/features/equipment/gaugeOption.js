/**
 * 센서 게이지 ECharts 설정 (설계안 js/lib.js gauge() 와 같은 모양)
 * - 바깥 얇은 고리: 기준 눈금 (0~주의 초록, 주의~경보 주황, 경보~끝 빨강)
 * - 안쪽 굵은 고리: 지금 값만큼 칠함 (색 = 센서 단계), 가운데 큰 숫자 + 단위
 * - 220° → -40° (아래가 트인 고리)
 */
import { CHART_COLORS, LEVEL_CHART_COLOR } from '@/utils/chartColors'
import { chartMotion } from '@/utils/echarts'

const ARC = { startAngle: 220, endAngle: -40 }
const HIDE = { pointer: { show: false }, axisTick: { show: false }, splitLine: { show: false }, axisLabel: { show: false } }

/**
 * @param {{ value: number, max: number, warn: number, alarm: number, unit: string, level: string, dec: number }} s
 */
export function gaugeOption({ value, max, warn, alarm, unit, level, dec }) {
  return {
    ...chartMotion(), // 처음 500ms, 값 바뀜 400ms (바늘 대신 고리 길이·숫자가 움직임)
    series: [
      {
        type: 'gauge',
        ...ARC,
        ...HIDE,
        min: 0,
        max,
        radius: '96%',
        progress: { show: false },
        detail: { show: false },
        axisLine: {
          lineStyle: {
            width: 4,
            color: [
              [warn / max, CHART_COLORS.normal],
              [alarm / max, CHART_COLORS.warn],
              [1, CHART_COLORS.alarm],
            ],
          },
        },
      },
      {
        type: 'gauge',
        ...ARC,
        ...HIDE,
        min: 0,
        max,
        radius: '84%',
        axisLine: { roundCap: true, lineStyle: { width: 14, color: [[1, CHART_COLORS.track]] } },
        progress: { show: true, width: 14, roundCap: true, itemStyle: { color: LEVEL_CHART_COLOR[level] ?? CHART_COLORS.normal } },
        detail: {
          valueAnimation: true, // 숫자도 같이 굴러감
          offsetCenter: [0, '-2%'],
          formatter: (x) => `{v|${x.toFixed(dec)}}\n{u|${unit}}`,
          rich: {
            v: { fontFamily: 'Fira Code', fontSize: 34, fontWeight: 600, color: CHART_COLORS.ink, lineHeight: 38 },
            u: { fontSize: 12, color: CHART_COLORS.axis, lineHeight: 16 },
          },
        },
        // 눈금 끝을 넘으면 끝까지만 칠함 (설계안과 같음. 눈금 끝은 경보 기준보다 넉넉해서 보통은 넘지 않음)
        data: [{ value: Math.min(value, max) }],
      },
    ],
  }
}
