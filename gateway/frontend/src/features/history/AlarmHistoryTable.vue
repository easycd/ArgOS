<!--
  알림 이력 표 (화면설계안 vStats() table())
  - 탭: 전체 / 조치 중 / 해제, 한 쪽 6행, '86건 중 1~6' + 쪽 번호
  - 열: 발생 시각, 공정·설비, 센서, 측정값(기준), 등급, 조치, 조치 시간(막대), 상태
  - 행을 누르면 open(row) → 화면이 설비 상세로 이동 (도장 공정 설비만, 나머지는 '준비 중')
  - 쪽을 넘기면 표 내용이 0.15초 흐려졌다 돌아옴
-->
<script setup>
import { computed } from 'vue'
import { SENSOR_ICON, SENSOR_LABEL, actionText, isActive, minutesOf, placeOf, shortTime } from './historyFilter'
import AppIcon from '@/components/AppIcon.vue'
import BaseCard from '@/components/BaseCard.vue'
import LevelBadge from '@/components/LevelBadge.vue'
import SegButtons from '@/components/SegButtons.vue'

const props = defineProps({
  /** GET /stats/alarms 의 items (불러오기 전이면 null) */
  rows: { type: Array, default: null },
  total: { type: Number, default: 0 },
  perPage: { type: Number, default: 6 },
  busy: { type: Boolean, default: false },
  /** 응답의 서버 시각 (있으면 조치 중 '경과' 분을 이걸로 셈) */
  serverTime: { type: String, default: '' },
})

const emit = defineEmits(['open'])
/** 탭: '' 전체 / 'ACTIVE' 조치 중 / 'CLOSED' 해제 */
const tab = defineModel('tab', { type: String, default: '' })
/** 쪽 (1부터) */
const page = defineModel('page', { type: Number, default: 1 })

const TABS = [
  { value: '', label: '전체' },
  { value: 'ACTIVE', label: '조치 중' },
  { value: 'CLOSED', label: '해제' },
]

const pages = computed(() => Math.max(1, Math.ceil(props.total / props.perPage)))
/** 쪽 번호 (5쪽 넘으면 … 로 줄임 — 설계안과 같음) */
const pageList = computed(() => {
  const n = pages.value
  const p = page.value
  if (n <= 5) return Array.from({ length: n }, (_, i) => i + 1)
  if (p <= 3) return [1, 2, 3, '…', n]
  if (p >= n - 2) return [1, '…', n - 2, n - 1, n]
  return [1, '…', p, '…', n]
})
const from = computed(() => (page.value - 1) * props.perPage + 1)
const to = computed(() => Math.min(props.total, page.value * props.perPage))

const view = computed(() => {
  // 조치 중인 건의 '경과' 분 (다시 불러올 때마다 새로 셈, 서버 시각이 있으면 그걸로)
  const now = props.serverTime ? new Date(props.serverTime).getTime() : Date.now()
  return (props.rows ?? []).map((r) => {
    const place = placeOf(r.location)
    const active = isActive(r)
    const minutes = minutesOf(r, now)
    return {
      row: r,
      key: r.id,
      time: shortTime(r.raisedAt),
      equipment: place.equipment,
      process: place.process,
      active,
      minutes,
      action: actionText(r),
      // 조치 시간 막대: 30분이면 가득
      bar: Math.min(100, (minutes / 30) * 100),
    }
  })
})
</script>

<template>
  <BaseCard title="알림 이력" :sub="`${total}건`">
    <template #actions>
      <SegButtons v-model="tab" :options="TABS" small @update:model-value="page = 1" />
    </template>

    <div class="body" :class="{ busy }">
      <table v-if="view.length" class="tb">
        <thead>
          <tr>
            <th class="t-time">발생 시각</th>
            <th>공정 · 설비</th>
            <th>센서</th>
            <th>측정값</th>
            <th>등급</th>
            <th>조치</th>
            <th>조치 시간</th>
            <th class="t-state">상태</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="v in view" :key="v.key" class="row" tabindex="0" @click="emit('open', v.row)" @keydown.enter="emit('open', v.row)">
            <td class="mono t-time">{{ v.time }}</td>
            <td><b>{{ v.equipment }}</b> <span class="sub">{{ v.process }}</span></td>
            <td>
              <span class="sn"><AppIcon :name="SENSOR_ICON[v.row.sensorType] ?? 'info'" :size="15" />{{ SENSOR_LABEL[v.row.sensorType] ?? '-' }}<span class="mono">{{ v.row.sensorTag }}</span></span>
            </td>
            <td>
              <span class="mono val" :class="v.row.level === 'WARN' ? 'warn' : 'alarm'">{{ v.row.value }} {{ v.row.unit }}</span>
              <span class="sub mono">기준 {{ v.row.threshold }}</span>
            </td>
            <td><LevelBadge :level="v.row.level" /></td>
            <td>{{ v.action }}</td>
            <td>
              <span class="dur">
                <i><u :class="{ on: v.active }" :style="{ width: `${v.bar}%` }" /></i>
                <span class="mono">{{ v.minutes }}분{{ v.active ? ' 경과' : '' }}</span>
              </span>
            </td>
            <td>
              <span class="dotc" :class="{ on: v.active }"><i />{{ v.active ? '조치 중' : '해제' }}</span>
            </td>
          </tr>
        </tbody>
      </table>
      <div v-else-if="rows" class="noval">
        <AppIcon name="bell" :size="24" />
        <b>{{ tab === 'ACTIVE' ? '조치 중인 알림이 없습니다' : '조건에 맞는 알림이 없습니다' }}</b>
        <template v-if="tab !== 'ACTIVE'">기간이나 조건을 바꿔 보세요.</template>
      </div>
      <div v-else class="noval">불러오는 중</div>
    </div>

    <div v-if="view.length" class="pg">
      <span class="count">{{ total }}건 중 {{ from }}~{{ to }}</span>
      <template v-for="(p, i) in pageList" :key="`${p}-${i}`">
        <span v-if="p === '…'" class="dots">…</span>
        <button v-else type="button" class="mono" :class="{ on: p === page }" :aria-current="p === page ? 'page' : undefined" @click="page = p">
          {{ p }}
        </button>
      </template>
    </div>
  </BaseCard>
</template>

<style scoped>
.body {
  min-height: 288px; /* 6행 + 머리줄 — 쪽마다 높이가 흔들리지 않게 */
  transition: opacity 150ms;
}

.body.busy {
  opacity: 0.4;
}

.tb {
  width: 100%;
  border-collapse: collapse;
  font-size: 13.5px;
}

th {
  height: 40px;
  padding: 0 12px;
  background: var(--color-surface-sub);
  border-bottom: 1px solid var(--color-border);
  font-size: 12.5px;
  font-weight: 500;
  color: var(--color-text-sub);
  text-align: left;
  white-space: nowrap;
}

td {
  height: 46px;
  padding: 0 12px;
  border-bottom: 1px solid #f1f5f9;
  white-space: nowrap;
}

th:first-child,
td:first-child {
  padding-left: 20px;
}

.t-time {
  width: 128px;
  font-size: 13px;
}

.t-state {
  width: 96px;
}

.row {
  cursor: pointer;
  transition: background var(--m-hover);
}

.row:hover,
.row:focus-visible {
  background: var(--color-surface-sub);
}

b {
  font-weight: 600;
}

.sub {
  font-size: 12px;
  color: var(--color-text-weak);
}

.sn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.sn svg {
  color: var(--color-text-sub);
}

.sn .mono {
  font-size: 12px;
  color: var(--color-text-weak);
}

.val {
  margin-right: 6px; /* 뒤의 '기준 21.6' 과 띄움 */
  font-weight: 600;
}

.val.warn {
  color: var(--color-level-warn-text);
}

.val.alarm {
  color: var(--color-level-alarm-text);
}

.dur {
  display: flex;
  align-items: center;
  gap: 8px;
}

.dur i {
  display: block;
  width: 90px;
  height: 6px;
  border-radius: 2px;
  background: #eef2f6;
  overflow: hidden;
}

.dur u {
  display: block;
  height: 100%;
  background: #64748b;
  transition: width var(--m-value);
}

.dur u.on {
  background: var(--color-level-warn);
}

.dur .mono {
  font-size: 12.5px;
  color: var(--color-text-sub);
}

.dotc {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-sub);
}

.dotc i {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--color-text-weak);
}

.dotc.on {
  color: var(--color-level-warn-text);
}

.dotc.on i {
  background: var(--color-level-warn);
}

.noval {
  height: 288px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 13px;
  color: var(--color-text-weak);
}

.noval b {
  font-size: 14px;
  color: var(--color-text-sub);
}

.pg {
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
  padding: 0 16px;
  font-size: 12.5px;
  color: var(--color-text-weak);
}

.pg .count {
  margin-right: 8px;
}

.pg button,
.pg .dots {
  min-width: 26px;
  height: 26px;
  display: grid;
  place-items: center;
  border: none;
  border-radius: 4px;
  background: none;
  color: var(--color-primary);
}

.pg button {
  cursor: pointer;
}

.pg button.on {
  background: var(--color-primary-soft);
  color: var(--color-primary-hover);
  font-weight: 600;
}

.pg .dots {
  color: var(--color-text-weak);
}
</style>
