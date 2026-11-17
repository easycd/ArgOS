<!--
  상단 바 체크리스트 진행 버튼 (화면설계안 js/shell.js updateHeader() #ckslot)
  - 진행 중 체크리스트가 있을 때만: 고리 + '체크리스트 진행 2/5 도장 공정'
  - 다 끝나면 초록 '5/5 완료 · 확인 필요' + 1.6초 빛번짐 (ChecklistBadge)
  - 누르면 체크리스트 진행 현황 창 (설계안처럼 바로 열림. 화면설계서 I1 은 여러 건이면 드롭다운 → 지금은 1건이라 첫 건)
  - 경보·화재 중에는 숨김 (설계안: 주의 상황에서만 보임)
-->
<script setup>
import { computed } from 'vue'
import { useAlertStore } from '@/stores/alert'
import ChecklistBadge from '@/features/equipment/ChecklistBadge.vue'

const alert = useAlertStore()

const emergency = computed(() => ['ALARM', 'FIRE'].includes(alert.primary?.level))
const first = computed(() => (emergency.value ? null : (alert.checklists[0] ?? null)))
const badge = computed(() => {
  const c = first.value
  if (!c) return null
  return { doneCount: c.items.filter((i) => i.doneAt).length, totalCount: c.items.length, assignee: c.assignee.name }
})
</script>

<template>
  <ChecklistBadge
    v-if="badge"
    :checklist="badge"
    sub="도장 공정"
    @click="alert.open('checklist', { alarmId: first.alarmId, checklistId: first.id })"
  />
</template>
