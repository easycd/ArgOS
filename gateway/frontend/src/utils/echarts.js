/**
 * ECharts 설정
 * - 번들 크기를 줄이기 위해 실제로 쓰는 차트·컴포넌트만 등록
 * - 새 차트 종류(예: 게이지)가 필요하면 아래 use([...]) 에 추가
 * - 화면에서는 전역 등록된 <VChart :option="..." /> 로 사용 (main.js 참고)
 */
import { use } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart, BarChart, PieChart } from 'echarts/charts'
import {
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
  MarkLineComponent, // 주의·경보 기준선 표시용
} from 'echarts/components'
import VChart from 'vue-echarts'

use([
  CanvasRenderer,
  LineChart,
  BarChart,
  PieChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
  MarkLineComponent,
])

export default VChart
