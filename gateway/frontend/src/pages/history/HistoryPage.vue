<!--
  통계·이력 관리 화면 (화면설계안 v-pages.js vStats(), 화면설계서 '통계·이력 관리', API 명세서 D1)
  - 이 화면은 조건을 들고 데이터를 불러오고 화면을 옮기는 일만 함. 그리는 부분은 features/history/
  - 배치 (설계안 1920): 조건 줄 / 요약 4칸 / 일별 추이 1180 | 공정별 684 / 알림 이력 1180 | 요일·시간대 684
  - 기간 단추·선택 상자를 바꾸면 바로 조회 (설계안), '조회' 단추는 같은 조건으로 다시 불러오기
  - 공장 담당자는 공장이 담당 공장으로 고정, 본사 관리자는 '전체 공장' 도 고를 수 있음 (처음은 5공장 — 설계안)
  - 주소에 ?factoryId=&processId= 가 있으면 그 공장·공정을 골라 둔 채로 시작 (factoryId=all → 전체 공장)
    (대시보드 '오늘 알림 내역' 카드의 '과거 알림' 단추, 2026-11-19)
  - 알림 상황이 바뀌면 조용히 다시 불러옴 (useLiveReload)
-->
<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getSiteTree } from '@/api/sites'
import { getStatsAlarms, getStatsByProcess, getStatsHeatmap, getStatsSummary, getStatsTrend } from '@/api/stats'
import { useAuthStore } from '@/stores/auth'
import { ROLE } from '@/types/codes'
import { toast } from '@/utils/toast'
import { useLiveReload } from '@/utils/useLiveReload'
import AlarmHistoryTable from '@/features/history/AlarmHistoryTable.vue'
import ExportModal from '@/features/history/ExportModal.vue'
import FilterBar from '@/features/history/FilterBar.vue'
import HeatmapCard from '@/features/history/HeatmapCard.vue'
import KpiCards from '@/features/history/KpiCards.vue'
import MonthlyReportModal from '@/features/history/MonthlyReportModal.vue'
import ProcessCard from '@/features/history/ProcessCard.vue'
import TrendCard from '@/features/history/TrendCard.vue'
import { PERIOD_LABEL, criteriaOf, rangeOf, ymd } from '@/features/history/historyFilter'

const PER_PAGE = 6 // 표 한 쪽 행 수 (설계안)

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()
const siteId = computed(() => route.params.siteId)

/* ───────── 조건 ───────── */
const lockFactory = computed(() => auth.role !== ROLE.HQ_ADMIN)
const factories = ref([])
const filter = reactive({ period: '30d', ...rangeOf('30d'), factoryId: '', processId: '', sensorType: '', level: '', shift: '' })
const criteria = computed(() => criteriaOf(filter, siteId.value))

/** 조건 줄에서 바꾼 값 반영 → 바로 조회 */
function change(patch) {
  Object.assign(filter, patch)
  if (patch.period && patch.period !== 'custom') Object.assign(filter, rangeOf(patch.period))
  query()
}

/* ───────── 카드 데이터 (요약·추이·공정별·요일시간) ───────── */
const data = reactive({ summary: null, trend: null, byProcess: null, heatmap: null })
const busy = ref(false)
let seq = 0 // 늦게 온 이전 조회 결과는 버림

async function query({ silent = false } = {}) {
  const my = ++seq
  if (!silent) busy.value = true
  const c = criteria.value
  try {
    const [summary, trend, byProcess, heatmap] = await Promise.all([
      getStatsSummary(c),
      getStatsTrend(c),
      getStatsByProcess(c),
      getStatsHeatmap(c),
    ])
    if (my !== seq) return
    Object.assign(data, { summary, trend, byProcess, heatmap })
  } catch (error) {
    // 조회 실패: 이전 결과는 그대로 두고 알림만 (화면설계서 '조회 실패')
    if (my === seq) toast(`조회하지 못했습니다. ${error.message}`, { type: 'err' })
  } finally {
    if (my === seq) busy.value = false
  }
  if (my !== seq) return
  // 새 조건이면 표는 1쪽부터 (쪽이 바뀌면 아래 watch 가 표를 불러옴)
  if (!silent && table.page !== 1) table.page = 1
  else loadTable()
}

/* ───────── 알림 이력 표 (탭·쪽은 표만 다시 불러옴) ───────── */
const table = reactive({ rows: null, total: 0, tab: '', page: 1, busy: false, serverTime: '' })
let tableSeq = 0

async function loadTable() {
  const my = ++tableSeq
  table.busy = true
  try {
    const r = await getStatsAlarms({ ...criteria.value, status: table.tab, page: table.page - 1, size: PER_PAGE })
    if (my !== tableSeq) return
    table.rows = r.items
    table.total = r.total
    table.serverTime = r.serverTime ?? '' // 있으면 '경과' 분을 서버 시계로 (없으면 PC 시계)
  } catch (error) {
    if (my === tableSeq) toast(error.message, { type: 'err' })
  } finally {
    if (my === tableSeq) table.busy = false
  }
}
watch(() => [table.tab, table.page], loadTable)

/** 행 누르기 → 설비 상세 (지금 화면이 있는 5공장 도장 공정 설비만) */
function openRow(row) {
  if (row.factoryId === 5 && row.processId === 12 && row.equipmentId) {
    router.push({ name: 'equipment', params: { siteId: siteId.value, factoryId: 5, processId: 12, equipmentId: row.equipmentId } })
    return
  }
  toast('이 설비의 상세 화면은 준비 중입니다. 지금은 5공장 도장 공정만 볼 수 있습니다.', { type: 'info' })
}

/* ───────── 카드 설명 · 화면용 값 ───────── */
const periodLabel = computed(() => PERIOD_LABEL[filter.period])
const isToday = computed(() => filter.from === filter.to && filter.to === ymd(new Date()))
/** 오늘(시간별)이면 아직 오지 않은 시간 칸은 뺌 (지금 시각과 마지막 알림 시각 중 늦은 쪽까지) */
const trendView = computed(() => {
  const t = data.trend
  if (!t || t.unit !== 'HOUR' || !isToday.value) return t
  const hourOf = (p) => Number(p.key.slice(11, 13))
  const lastWithData = Math.max(-1, ...t.points.filter((p) => p.warn + p.alarm > 0).map(hourOf))
  const end = Math.max(new Date().getHours(), lastWithData)
  return { ...t, points: t.points.filter((p) => hourOf(p) <= end) }
})
const trendSub = computed(() => periodLabel.value + ({ HOUR: ' · 시간별', WEEK: ' · 주별' }[data.trend?.unit] ?? ''))
const factoryName = computed(() => factories.value.find((f) => f.id === Number(filter.factoryId))?.name ?? '전체 공장')
const rangeText = computed(() => (filter.from === filter.to ? filter.from : `${filter.from} ~ ${filter.to}`))

/* ───────── 내보내기 · 월별 보고서 창 ───────── */
const exportOpen = ref(false)
const reportOpen = ref(false)

/**
 * 주소로 받은 공장·공정 미리 고르기 (대시보드 '과거 알림' 단추)
 * - 고를 수 있는 공장·공정일 때만 반영 (공장 담당자의 다른 공장 · 없는 공정은 무시하고 처음 값 그대로)
 */
function applyQuery() {
  const { factoryId, processId } = route.query
  if (factoryId === 'all') {
    if (!lockFactory.value) filter.factoryId = ''
    return
  }
  const factory = factories.value.find((f) => String(f.id) === String(factoryId))
  if (!factory) return
  filter.factoryId = String(factory.id)
  if (factory.processes?.some((p) => String(p.id) === String(processId))) filter.processId = String(processId)
}

/* ───────── 처음 불러오기 ───────── */
onMounted(async () => {
  try {
    const tree = await getSiteTree(siteId.value)
    const mine = auth.user?.scope?.factoryIds ?? []
    factories.value = lockFactory.value ? tree.factories.filter((f) => mine.includes(f.id)) : tree.factories
    // 공장 담당자: 담당 공장 / 본사 관리자: 5공장(설계안 처음 값), 없으면 전체 공장
    const first = lockFactory.value ? factories.value[0] : factories.value.find((f) => f.id === 5)
    filter.factoryId = first ? String(first.id) : ''
    applyQuery()
  } catch (error) {
    toast(error.message, { type: 'err' })
  }
  query()
})

// 예시 상황이 바뀌면(주의 발생·조치 등) 쪽은 그대로 두고 조용히 다시 불러옴
useLiveReload(() => query({ silent: true }))
</script>

<template>
  <div class="history-page">
    <FilterBar
      :filter="filter"
      :factories="factories"
      :lock-factory="lockFactory"
      :busy="busy"
      @change="change"
      @query="query()"
      @export="exportOpen = true"
      @report="reportOpen = true"
    />

    <div class="cards" :class="{ loading: busy }">
      <KpiCards :summary="data.summary" :points="data.trend?.points ?? []" :today="filter.period === 'today'" />

      <div class="row">
        <TrendCard :trend="trendView" :sub="trendSub" :show-shift="!filter.shift" />
        <ProcessCard :rows="data.byProcess" :sub="`센서 종류별 · ${periodLabel} 합계`" />
      </div>

      <div class="row">
        <AlarmHistoryTable
          v-model:tab="table.tab"
          v-model:page="table.page"
          :rows="table.rows"
          :total="table.total"
          :per-page="PER_PAGE"
          :busy="table.busy"
          :server-time="table.serverTime"
          @open="openRow"
        />
        <HeatmapCard :heatmap="data.heatmap" :sub="`${periodLabel} 누적`" />
      </div>
    </div>

    <ExportModal
      :open="exportOpen"
      :criteria="criteria"
      :where="`${factoryName} · ${rangeText}`"
      :row-count="data.summary?.alarmCount.value ?? 0"
      @close="exportOpen = false"
    />
    <MonthlyReportModal :open="reportOpen" :factory-id="filter.factoryId" @close="reportOpen = false" />
  </div>
</template>

<style scoped>
/*
 * 배치 (설계안 1920 기준): 왼쪽 1180 | 오른쪽 684 — 같은 비율로 화면 폭에 맞춰 줄어듦
 * 1400px 이하는 한 줄에 하나씩
 */
.history-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.cards {
  display: flex;
  flex-direction: column;
  gap: 16px;
  transition: opacity var(--m-value);
}

/* 조회 중에는 아래 카드들을 흐리게 (화면설계서: 투명도 60%) */
.cards.loading {
  opacity: 0.6;
}

.row {
  display: grid;
  grid-template-columns: minmax(0, 1180fr) minmax(0, 684fr);
  gap: 16px;
  align-items: start;
}

@media (max-width: 1400px) {
  .row {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
