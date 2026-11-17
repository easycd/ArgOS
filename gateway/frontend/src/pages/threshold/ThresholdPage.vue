<!--
  설비 기준값 관리 화면 (화면설계안 js/v-pages2.js vThreshold(), 화면설계서 F1, 명세서 F1)
  - 왼쪽: 설비 선택 트리 / 가운데: 머리(저장·되돌리기) · 계절 · 센서별 카드 3개 · 변경 시뮬레이션 / 오른쪽: 변경 이력
  - 이 파일은 데이터 불러오기·고르기·저장 흐름만, 그리는 일은 features/threshold/ 카드들
  - 데이터: GET /equipment/tree, /equipment/{id}/thresholds, /thresholds/history, /sensors/series(7일),
            POST /thresholds/simulate (입력이 멈추고 0.4초 뒤), PUT /equipment/{id}/thresholds
  - 다른 화면에서 '기준값 관리에서 보기'로 오면 ?equipmentId= 의 설비를 먼저 고름 (없으면 상도 건조로)
  - 저장하면 예시 데이터에도 남아 공정·설비 상세의 단계·게이지 기준선이 같이 바뀜 (지금 계절일 때)
-->
<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { serverNow } from '@/api/clock'
import { getEquipmentTree, getSensorWeek, getThresholdHistory, getThresholds, simulateThreshold } from '@/api/thresholds'
import ConfirmModal from '@/components/ConfirmModal.vue'
import EquipmentTree from '@/features/threshold/EquipmentTree.vue'
import HistoryCard from '@/features/threshold/HistoryCard.vue'
import SaveSummary from '@/features/threshold/SaveSummary.vue'
import SeasonTabs from '@/features/threshold/SeasonTabs.vue'
import SensorThresholdCard from '@/features/threshold/SensorThresholdCard.vue'
import SimulationCard from '@/features/threshold/SimulationCard.vue'
import ThresholdHeader from '@/features/threshold/ThresholdHeader.vue'
import { saveAll } from '@/features/threshold/saveFlow'
import { SEASON_META, changes as changesOf, check, draftsOf, num, savedOf } from '@/features/threshold/thresholdForm'
import { useAlertStore } from '@/stores/alert'
import { useAuthStore } from '@/stores/auth'
import { ROLE_LABEL, SENSOR_TYPES } from '@/types/codes'
import { formatYmd } from '@/utils/format'
import { toast } from '@/utils/toast'

const route = useRoute()
const auth = useAuthStore()
const alert = useAlertStore()

/** 기준값을 보는 공장: 공장 담당자는 담당 공장, 본사 관리자는 설계 범위 5공장 (공장 고르기는 설계에 없음) */
const FACTORY_ID = auth.user?.scope?.factoryIds?.[0] ?? 5

const tree = ref([])
const selectedId = ref(null)
const thresholds = ref(null) // GET /equipment/{id}/thresholds
const season = ref('WINTER')
const drafts = ref({}) // { 센서 id: { warn: '21.6', alarm: '27' } }
const focus = ref(null) // { sensorId, field } 시뮬레이션·이력 그래프가 보는 칸
const scope = ref('one')
const loading = ref(true)
const switching = ref(false)
const errorMessage = ref('')

const equipmentRow = computed(() => tree.value.flatMap((p) => p.equipment).find((e) => e.id === selectedId.value) ?? null)
const processOf = computed(() => tree.value.find((p) => p.equipment.some((e) => e.id === selectedId.value)))
const sensors = computed(() => thresholds.value?.sensors ?? [])

/* ───────── 불러오기 ───────── */
async function loadTree() {
  tree.value = await getEquipmentTree(FACTORY_ID)
}

/** 설비 하나 (계절은 지금 계절로, keepSeason 이면 그대로) */
async function loadEquipment(id, { keepSeason = false } = {}) {
  switching.value = true
  try {
    const t = await getThresholds(id)
    thresholds.value = t
    selectedId.value = id
    if (!keepSeason) season.value = t.activeSeason
    drafts.value = draftsOf(t.sensors, season.value)
    // 처음 보는 칸: 전류 → 온도 → CO 순서의 첫 센서 주의
    const first = SENSOR_TYPES.map((x) => t.sensors.find((s) => s.type === x.type)).find(Boolean)
    focus.value = first ? { sensorId: first.sensorId, field: 'warn' } : null
    scope.value = 'one'
    await loadHistory()
  } finally {
    switching.value = false
  }
}

async function init() {
  loading.value = true
  errorMessage.value = ''
  try {
    await loadTree()
    const all = tree.value.flatMap((p) => p.equipment)
    const want = Number(route.query.equipmentId)
    // 처음 고르는 설비: 주소의 설비 → 지금 알림이 난 설비 → 첫 설비 (설비 번호를 고정하지 않음)
    if (!alert.primary) await alert.refresh() // 새로고침 직후에는 알림 목록이 아직 없을 수 있음
    const alarmEq = alert.primary?.equipmentId
    const first = all.find((e) => e.id === want) ?? all.find((e) => e.id === alarmEq) ?? all[0]
    if (first) await loadEquipment(first.id)
  } catch (error) {
    errorMessage.value = error.message
  } finally {
    loading.value = false
  }
}

init()

/* ───────── 변경 이력 ───────── */
// 오늘: 한국 시각 기준 날짜 (UTC 로 자르면 오전 9시 전에 어제가 됨). 서버 시계 기준 — 이용 로그 · 상단 시계와 같은 방식
const today = formatYmd(serverNow())
const historyRange = ref({ from: '2026-08-01', to: today })
const history = ref([])
const historyBusy = ref(false)

async function loadHistory() {
  historyBusy.value = true
  try {
    history.value = await getThresholdHistory({ equipmentId: selectedId.value, ...historyRange.value })
  } finally {
    historyBusy.value = false
  }
}

function onHistoryQuery(range) {
  if (!range) {
    toast('시작일이 종료일보다 늦습니다.', { type: 'warn' })
    return
  }
  historyRange.value = range
  loadHistory()
}

/* ───────── 입력 ───────── */
const changes = computed(() => changesOf(sensors.value, drafts.value, season.value))
const hasError = computed(() => sensors.value.some((s) => check(s, drafts.value[s.sensorId])?.level === 'err'))
const canSave = computed(() => changes.value.length > 0 && !hasError.value)

function onInput(sensor, field, value) {
  drafts.value = { ...drafts.value, [sensor.sensorId]: { ...drafts.value[sensor.sensorId], [field]: value } }
  focus.value = { sensorId: sensor.sensorId, field }
}

function undo() {
  drafts.value = draftsOf(sensors.value, season.value)
  toast('바꾸기 전 값으로 되돌렸습니다.', { type: 'info' })
}

/* ───────── 바꾼 값이 있을 때 설비·계절 바꾸기 확인 ───────── */
const pending = ref(null) // 확인 뒤 할 일 { what: '계절을' | '설비를', action }
function guard(what, action) {
  if (changes.value.length) pending.value = { what, action }
  else action()
}
function confirmDiscard() {
  const { action } = pending.value
  pending.value = null
  action()
}

function selectEquipment(id) {
  if (id === selectedId.value) return
  guard('설비를', () => loadEquipment(id))
}

function selectSeason(s) {
  if (s === season.value) return
  guard('계절을', () => {
    season.value = s
    drafts.value = draftsOf(sensors.value, s)
  })
}

/* ───────── 변경 시뮬레이션 (7일 그래프 + 알림 수) ───────── */
const focusSensor = computed(() => sensors.value.find((s) => s.sensorId === focus.value?.sensorId) ?? null)
const weekCache = ref({})
const sim = ref(null)
const simBusy = ref(false)

/** 지금 칸의 입력 값 (숫자가 아니면 저장된 값) */
const nextOf = (s) => {
  const d = drafts.value[s.sensorId]
  const saved = savedOf(s, season.value)
  return { warn: num(d?.warn) ?? saved.warn, alarm: num(d?.alarm) ?? saved.alarm }
}

let simTimer = 0
watch(
  [focusSensor, drafts, season],
  ([s]) => {
    if (!s) return
    clearTimeout(simTimer)
    simBusy.value = true
    // 입력이 멈추고 0.4초 뒤에 부름 (명세서 F1)
    simTimer = setTimeout(async () => {
      try {
        if (!weekCache.value[s.sensorId]) weekCache.value = { ...weekCache.value, [s.sensorId]: await getSensorWeek(s.sensorId) }
        const n = nextOf(s)
        sim.value = await simulateThreshold({ sensorId: s.sensorId, warn: n.warn, alarm: n.alarm })
      } finally {
        simBusy.value = false
      }
    }, 400)
  },
  { deep: true, immediate: true },
)

/* ───────── 저장 ───────── */
const saving = ref(false)
const confirmOpen = ref(false)
const reason = ref('')
const userLabel = computed(() => `${ROLE_LABEL[auth.role] ?? ''} ${auth.user?.name ?? ''}`.trim())
const ovenIds = computed(() => processOf.value?.equipment.filter((e) => e.type === 'OVEN').map((e) => e.id) ?? [])

/** 저장 단추 → 확인 창 (사유 칸은 매번 비워서 엶) */
function openConfirm() {
  reason.value = ''
  confirmOpen.value = true
}

async function save() {
  saving.value = true
  try {
    const { saved, failed } = await saveAll({
      thresholds: thresholds.value,
      drafts: drafts.value,
      season: season.value,
      equipmentIds: scope.value === 'ovens' ? ovenIds.value : [selectedId.value],
      reason: reason.value.trim(),
      by: auth.user?.name,
    })
    // 하나도 저장 못 했으면 확인 창을 열어 둔 채 사유만 알림
    if (!saved.length) {
      toast(failed[0]?.message ?? '저장하지 못했습니다.', { type: 'err' })
      return
    }
    confirmOpen.value = false
    reason.value = ''
    if (failed.length) {
      // 건조로 3대 중 일부만 실패: 어느 설비가 저장되지 않았는지 알림
      const names = failed.map((f) => equipmentName(f.id)).join(', ')
      const why = failed[0].message.replace(/\.$/, '') // 괄호 안이라 끝 마침표는 뺌
      toast(`${names}는 저장하지 못했습니다(${why}). 나머지 설비는 저장했습니다.`, { type: 'warn' })
    } else {
      const name = equipmentRow.value?.name
      const s = season.value
      toast(
        s === thresholds.value.activeSeason
          ? `${name} ${SEASON_META[s].label} 기준값을 저장했습니다. 지금부터 적용됩니다.`
          : `${name} ${SEASON_META[s].label} 기준값을 저장했습니다. ${validFrom.value.slice(5).replace('-', '월 ')}일부터 적용됩니다.`,
      )
    }
    await loadTree()
    await loadEquipment(selectedId.value, { keepSeason: true })
  } finally {
    saving.value = false
  }
}

/** 설비 id → 이름 (트리에서 찾음) */
function equipmentName(id) {
  return processOf.value?.equipment.find((e) => e.id === id)?.name ?? `설비 ${id}`
}

const validFrom = computed(() => sensors.value[0]?.seasons[season.value]?.validFrom ?? '')
</script>

<template>
  <p v-if="loading" class="state">불러오는 중</p>
  <p v-else-if="errorMessage" class="state error">{{ errorMessage }}</p>

  <div v-else class="threshold-page">
    <EquipmentTree class="tree" :processes="tree" :selected-id="selectedId" @select="selectEquipment" />

    <div class="middle" :class="{ switching }">
      <ThresholdHeader
        v-if="equipmentRow"
        v-model:scope="scope"
        :equipment="equipmentRow"
        :tags="sensors.map((s) => s.tag)"
        :path="`5공장 · ${processOf?.processName ?? ''}`"
        :change-count="changes.length"
        :can-save="canSave"
        @undo="undo"
        @save="openConfirm"
      />

      <SeasonTabs :season="season" :active-season="thresholds.activeSeason" @select="selectSeason" />

      <!-- 센서별 카드 3칸: 이 설비에 없는 종류는 점선 칸 -->
      <div v-if="sensors.length" class="cards">
        <template v-for="(t, i) in SENSOR_TYPES" :key="`${selectedId}-${season}-${t.type}`">
          <SensorThresholdCard
            v-if="sensors.find((s) => s.type === t.type)"
            class="rise"
            :style="{ '--i': i + 2 }"
            :sensor="sensors.find((s) => s.type === t.type)"
            :season="season"
            :draft="drafts[sensors.find((s) => s.type === t.type).sensorId]"
            @input="(f, v) => onInput(sensors.find((s) => s.type === t.type), f, v)"
            @focus="(f) => (focus = { sensorId: sensors.find((s) => s.type === t.type).sensorId, field: f })"
          />
          <div v-else class="slot rise" :style="{ '--i': i + 2 }">
            <b>{{ t.label }} 센서 없음</b>
            이 설비에는 {{ t.label }} 센서가 연결되어 있지 않습니다.
          </div>
        </template>
      </div>
      <div v-else class="no-sensor">
        <b>연결된 센서가 없습니다</b>
        {{ equipmentRow?.name }} 설비에는 기준값을 정할 센서가 없습니다. 공장 관리에서 센서를 연결해 주세요.
        <RouterLink :to="{ name: 'factory', params: { siteId: route.params.siteId } }" class="btn">공장 관리로 이동</RouterLink>
      </div>

      <SimulationCard
        v-if="focusSensor"
        :sensor="focusSensor"
        :field="focus.field"
        :saved="savedOf(focusSensor, season)"
        :next="nextOf(focusSensor)"
        :series="weekCache[focusSensor.sensorId] ?? null"
        :sim="sim"
        :busy="simBusy"
      />
    </div>

    <HistoryCard
      class="history"
      :equipment-name="equipmentRow?.name ?? ''"
      :sensors="sensors"
      :rows="history"
      :pending="changes.filter((c) => c.after !== null)"
      :sensor="focusSensor"
      :saved-warn="focusSensor ? savedOf(focusSensor, season).warn : null"
      :next-warn="focusSensor ? nextOf(focusSensor).warn : null"
      :range="historyRange"
      :user-label="userLabel"
      :busy="historyBusy"
      @query="onHistoryQuery"
    />
  </div>

  <!-- 저장 확인 -->
  <ConfirmModal :open="confirmOpen" title="기준값을 저장할까요?" ok-text="저장" icon="save" :busy="saving" :ok-disabled="!reason.trim()" @ok="save" @cancel="confirmOpen = false">
    <SaveSummary
      v-model:reason="reason"
      :changes="changes"
      :scope="scope"
      :season="season"
      :active-season="thresholds?.activeSeason ?? 'WINTER'"
      :valid-from="validFrom"
    />
  </ConfirmModal>

  <!-- 바꾼 값이 있는데 다른 설비·계절을 고를 때 -->
  <ConfirmModal :open="!!pending" title="바꾼 값을 저장하지 않았습니다" ok-text="저장하지 않고 이동" @ok="confirmDiscard" @cancel="pending = null">
    저장하지 않고 다른 {{ pending?.what }} 선택하면 바꾼 값이 사라집니다.
  </ConfirmModal>
</template>

<style scoped>
/*
 * 배치 (설계안 1920 기준): 트리 330 | 가운데 1100 | 이력 418
 * - 같은 비율로 화면 폭에 맞춰 줄어듦, 1400px 이하는 한 줄에 하나씩
 */
.threshold-page {
  display: grid;
  grid-template-columns: minmax(0, 330fr) minmax(0, 1100fr) minmax(0, 418fr);
  gap: 16px;
  align-items: start;
}

@media (max-width: 1400px) {
  .threshold-page {
    grid-template-columns: minmax(0, 1fr);
  }
}

.middle {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
  transition: opacity var(--m-value);
}

/* 설비를 바꿔 다시 불러오는 동안 흐리게 */
.middle.switching {
  opacity: 0.5;
}

.cards {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  margin-bottom: 8px;
}

/* 센서가 없는 칸 (설계안 .slot) */
.slot,
.no-sensor {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 376px;
  padding: 20px;
  border: 1px dashed var(--color-border-strong);
  border-radius: var(--radius-md);
  background: #fafbfc;
  font-size: 13px;
  color: var(--color-text-weak);
  text-align: center;
}

.slot b,
.no-sensor b {
  font-size: 14px;
  color: var(--color-text-sub);
}

.no-sensor .btn {
  margin-top: 8px;
  text-decoration: none;
}

.state {
  color: var(--color-text-sub);
}

.state.error {
  color: var(--color-level-alarm-text);
}
</style>
