<!--
  '설비 선택' 카드 — 공정 > 설비 트리 (화면설계안 vThreshold() tree())
  - 위: 검색 (설비 이름 · 센서 번호, 받은 목록 안에서 찾음 — 명세서 '검색은 프론트가')
  - 공정 줄: 펼침 꺾쇠 + 상태 점 + 이름 + '설비 n' / 설비 줄: 상태 점 + 이름 + '센서 n' (고른 설비는 파란 바탕과 왼쪽 막대)
  - 설비 목록이 없는 공정은 '이 공정의 설비 목록은 준비 중입니다'
  - 누르면 select(설비 id) — 바꾼 값이 있을 때의 확인은 페이지가 함
-->
<script setup>
import { computed, ref } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import BaseCard from '@/components/BaseCard.vue'
import { LEVEL, LEVEL_META } from '@/types/codes'

const props = defineProps({
  /** GET /equipment/tree */
  processes: { type: Array, required: true },
  selectedId: { type: Number, default: null },
  factoryName: { type: String, default: '5공장' },
})

const emit = defineEmits(['select'])

const q = ref('')
// 처음에는 고른 설비가 있는 공정만 펼침
const open = ref(new Set(props.processes.filter((p) => p.equipment.some((e) => e.id === props.selectedId)).map((p) => p.processId)))

function toggle(id) {
  const next = new Set(open.value)
  next.has(id) ? next.delete(id) : next.add(id)
  open.value = next
}

/** 검색어에 맞는 설비만 (검색 중에는 모두 펼침) */
const rows = computed(() => {
  const kw = q.value.trim().toLowerCase()
  return props.processes
    .map((p) => {
      const kids = p.equipment.filter(
        (e) => !kw || e.name.toLowerCase().includes(kw) || (e.tags ?? []).some((t) => t.toLowerCase().includes(kw)),
      )
      return { ...p, kids, opened: open.value.has(p.processId) || !!kw }
    })
    .filter((p) => !kw || p.kids.length)
})

/** 공정 상태 = 설비 중 가장 높은 단계 */
const RANK = [LEVEL.NORMAL, LEVEL.WARN, LEVEL.ALARM, LEVEL.FIRE]
const levelOf = (p) => p.equipment.reduce((a, e) => (RANK.indexOf(e.level) > RANK.indexOf(a) ? e.level : a), LEVEL.NORMAL)
const dot = (level) => LEVEL_META[level]?.color ?? 'var(--color-text-weak)'
</script>

<template>
  <BaseCard title="설비 선택" :sub="factoryName">
    <div class="body">
      <label class="search">
        <AppIcon name="search" :size="16" />
        <input v-model="q" type="search" placeholder="설비 이름, 센서 번호 검색" aria-label="설비 검색" />
      </label>

      <template v-for="p in rows" :key="p.processId">
        <button type="button" class="tr gp" :aria-expanded="p.opened" @click="toggle(p.processId)">
          <AppIcon :name="p.opened ? 'cd' : 'cr'" :size="15" />
          <span class="dt" :style="{ background: dot(levelOf(p)) }" />{{ p.processName }}
          <span class="n">설비 {{ p.equipmentCount ?? p.equipment.length }}</span>
        </button>
        <template v-if="p.opened">
          <div v-if="!p.equipment.length" class="tr none">이 공정의 설비 목록은 준비 중입니다</div>
          <button
            v-for="e in p.kids"
            :key="e.id"
            type="button"
            class="tr eq"
            :class="{ on: e.id === selectedId }"
            :aria-current="e.id === selectedId"
            @click="emit('select', e.id)"
          >
            <span class="dt" :style="{ background: dot(e.level) }" />{{ e.name }}
            <span class="n">{{ e.sensorCount ? `센서 ${e.sensorCount}` : '센서 없음' }}</span>
          </button>
        </template>
      </template>

      <div v-if="q.trim() && !rows.length" class="empty">
        <AppIcon name="search" :size="22" />
        <b>'{{ q.trim() }}'에 맞는 설비가 없습니다</b>
        설비 이름이나 센서 번호를 확인해 주세요.
      </div>
    </div>
  </BaseCard>
</template>

<style scoped>
.body {
  padding: 14px 0 12px;
}

/* 검색 칸 (설계안 .inp) */
.search {
  height: 38px;
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 16px 10px;
  padding: 0 12px;
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-sm);
  color: var(--color-text-weak);
  transition:
    border-color var(--m-hover),
    box-shadow var(--m-hover);
}

.search:focus-within {
  border-color: var(--color-primary);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.15);
}

.search input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  font-size: 14px;
  color: var(--color-text);
}

/* 트리 줄 (설계안 .v-threshold .tr) */
.tr {
  width: 100%;
  height: 38px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 14px 0 16px;
  border: none;
  background: none;
  font-size: 14px;
  text-align: left;
  white-space: nowrap;
  cursor: pointer;
  transition: background 120ms;
}

.tr:hover {
  background: #f8fafc;
}

.tr .app-icon {
  color: var(--color-text-weak);
}

.tr.gp {
  font-weight: 600;
}

.tr.eq {
  padding-left: 46px;
}

.tr.none {
  padding-left: 46px;
  font-size: 13px;
  color: var(--color-text-weak);
  cursor: default;
}

.tr.none:hover {
  background: none;
}

.tr.on,
.tr.on:hover {
  background: var(--color-primary-soft);
  color: var(--color-primary-hover);
  font-weight: 700;
  box-shadow: inset 3px 0 0 var(--color-primary);
}

.dt {
  width: 8px;
  height: 8px;
  flex: none;
  border-radius: 50%;
}

.n {
  margin-left: auto;
  font-family: var(--font-mono);
  font-size: 12px;
  font-weight: 400;
  color: var(--color-text-weak);
}

.tr.on .n {
  color: var(--color-primary-hover);
}

.empty {
  height: 180px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0 16px;
  font-size: 13px;
  color: var(--color-text-weak);
  text-align: center;
}

.empty b {
  font-size: 14px;
  color: var(--color-text-sub);
}
</style>
