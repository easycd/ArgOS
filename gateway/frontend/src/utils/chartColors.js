/**
 * 차트(ECharts)용 색
 * - ECharts 는 캔버스에 그려서 CSS 변수(var(--...))를 읽지 못함 → 실제 색 값을 여기 둠
 * - 값은 assets/styles/tokens.css 와 같게 유지할 것 (색을 바꾸면 두 곳 다 바꾸기)
 */
export const CHART_COLORS = Object.freeze({
  warn: '#f97316', // --color-level-warn
  alarm: '#dc2626', // --color-level-alarm
  action: '#2563eb', // --color-primary (조치 건수 선)
  axis: '#94a3b8', // --color-text-weak
  grid: '#eef2f6',
  text: '#475569', // --color-text-sub
})
