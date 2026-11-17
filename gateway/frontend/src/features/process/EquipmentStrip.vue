<!--
  배치도 아래 설비 줄 (설계안 vProcess() 의 #eqs): 공정 흐름 순서대로 설비 카드
  - 1~7번: 번호, 이름, 상태 배지 (작은 카드)
  - 마지막 번호 설비(상도 건조로): 넓은 카드에 센서 3개 값과 원형 게이지, '설비 상세'
    · 체크리스트가 진행 중이면 '체크리스트 2/5' 칩 → 누르면 체크리스트 진행 창 (카드 이동은 안 함)
  - 누르면 select 이벤트
-->
<script setup>
import { computed } from 'vue'
import SensorRing from './SensorRing.vue'
import AppIcon from '@/components/AppIcon.vue'
import LevelBadge from '@/components/LevelBadge.vue'
import { keyOf } from '@/features/site/stages'
import { useAlertStore } from '@/stores/alert'
import { LEVEL, SENSOR_TYPES } from '@/types/codes'

const props = defineProps({
  /** 화면용 설비 목록 (seq 가 있는 것만 줄에 나옴) */
  equipment: { type: Array, required: true },
})

const emit = defineEmits(['select'])

// 순서 번호가 있는 설비만, 번호 순서대로
const line = computed(() => props.equipment.filter((e) => e.seq).sort((a, b) => a.seq - b.seq))
const small = computed(() => line.value.slice(0, -1))
const last = computed(() => line.value.at(-1))

// 넓은 카드의 센서: 전류·온도·CO 순서
const lastSensors = computed(() =>
  SENSOR_TYPES.map((t) => last.value?.sensors.find((s) => s.type === t.type)).filter(Boolean),
)
const typeLabel = (type) => SENSOR_TYPES.find((t) => t.type === type)?.label ?? type

// 진행 중 체크리스트 칩 (상단 바 체크리스트와 같은 건)
const alert = useAlertStore()
const checklist = computed(() => (last.value ? alert.checklistOfEquipment(last.value.id) : null))
const checklistText = computed(() => {
  const c = checklist.value
  if (!c) return ''
  const done = c.items.filter((i) => i.doneAt).length
  return c.status === 'REPORTED' ? '체크리스트 완료 · 확인 필요' : `체크리스트 ${done}/${c.items.length}`
})
function openChecklist() {
  alert.open('checklist', { alarmId: checklist.value.alarmId, checklistId: checklist.value.id })
}
</script>

<template>
  <div class="strip">
    <button v-for="eq in small" :key="eq.id" type="button" class="item" @click="emit('select', eq)">
      <span class="no mono">{{ eq.seq }}</span>
      <b>{{ eq.name }}</b>
      <LevelBadge :level="eq.level" />
    </button>

    <button v-if="last" type="button" class="item wide" :class="`is-${keyOf(last.level)}`" @click="emit('select', last)">
      <span class="wide-head">
        <span class="no mono">{{ last.seq }}</span>
        <b>{{ last.name }}</b>
        <LevelBadge :level="last.level" />
        <!-- 버튼 안 버튼을 피하려고 span + role. 눌러도 카드의 설비 상세 이동은 막음(.stop) -->
        <span
          v-if="checklist"
          class="ck-chip"
          :class="{ done: checklist.status === 'REPORTED' }"
          role="button"
          tabindex="0"
          @click.stop="openChecklist"
          @keydown.enter.stop.prevent="openChecklist"
        >
          <AppIcon name="clip" :size="13" />{{ checklistText }}
        </span>
        <span class="go">설비 상세 <AppIcon name="cr" :size="16" /></span>
      </span>
      <span class="sensors">
        <span v-for="s in lastSensors" :key="s.tag" class="sensor">
          <SensorRing :sensor="s" :size="44" />
          <span>
            <small>{{ typeLabel(s.type) }} <span class="mono">{{ s.tag }}</span></small>
            <b class="mono" :class="{ [`is-${keyOf(s.level)}`]: s.level !== LEVEL.NORMAL }">
              {{ s.value }}<small> {{ s.unit }}</small>
            </b>
          </span>
        </span>
      </span>
    </button>
  </div>
</template>

<style scoped>
.strip {
  display: flex;
  gap: 10px;
  padding: 0 20px 18px;
}

.item {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
  padding: 11px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: #fff;
  text-align: left;
  cursor: pointer;
  transition:
    border-color 0.15s,
    box-shadow 0.15s;
}

.item:hover {
  border-color: #93c5fd;
  box-shadow: 0 2px 10px rgba(37, 99, 235, 0.12);
}

.item > b {
  font-size: 14px;
  white-space: nowrap;
}

/* 파란 동그라미 번호 */
.no {
  width: 18px;
  height: 18px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: var(--color-primary);
  color: #fff;
  font-size: 10px;
  font-weight: 600;
}

/* 체크리스트 진행 칩 (설계안 .chip.info.lk) */
.ck-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: var(--radius-xs);
  background: #e0f2fe;
  color: #0369a1;
  font-size: 12px;
  font-weight: 700;
  line-height: 18px;
  white-space: nowrap;
  cursor: pointer;
  animation: pop-in var(--m-pop-in) both; /* motion.css */
  transition: box-shadow var(--m-hover);
}

.ck-chip:hover {
  box-shadow: 0 0 0 3px rgba(3, 105, 161, 0.18);
}

.ck-chip.done {
  background: var(--color-level-normal-soft);
  color: var(--color-level-normal-text);
}

/* 넓은 카드 (마지막 설비) */
.wide {
  /* 센서 3개(게이지 44px + 값)가 다 들어가는 폭(372px)보다 줄어들지 않게. 작은 카드들도 글자 폭만큼은 지키므로 */
  flex: 3.4;
  min-width: 372px;
  border-width: 1.5px;
  padding: 11px 14px;
}

.wide.is-warn {
  border-color: var(--color-level-warn);
  background: rgba(255, 237, 213, 0.4);
}

.wide.is-alarm,
.wide.is-fire {
  border-color: var(--color-level-alarm);
  background: rgba(254, 226, 226, 0.4);
}

.wide-head {
  align-self: stretch;
  display: flex;
  align-items: center;
  gap: 8px;
}

.wide-head b {
  font-size: 14px;
  white-space: nowrap;
}

.go {
  margin-left: auto;
  display: flex;
  align-items: center;
  color: var(--color-primary);
  font-size: 12px;
  font-weight: 700;
}

.sensors {
  display: flex;
  gap: 12px;
}

.sensor {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sensor small {
  display: block;
  font-size: 11px;
  color: #64748b;
  white-space: nowrap;
}

.sensor b {
  font-size: 16px;
  white-space: nowrap;
}

.sensor b small {
  display: inline;
  color: var(--color-text-weak);
}

.sensor b.is-warn {
  color: var(--color-level-warn-text);
}

.sensor b.is-alarm,
.sensor b.is-fire {
  color: var(--color-level-alarm-text);
}
</style>
