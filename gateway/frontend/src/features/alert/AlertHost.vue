<!--
  알림 대응 창·알림 띠·화면 테두리를 그리는 곳 (MainLayout 에 한 번)
  - body 로 통째로 옮겨 그림(Teleport): 화면 전환 확대·축소, 본문 잘림(overflow)에 영향 안 받게
  - 열린 창: stores/alert.js 의 modal (주의 알림 → 주의 상세 → 센서·열화상 확인 / 체크리스트 진행)
  - 하는 일
    · 처음 + 데이터가 바뀔 때마다 대응 중인 알림·체크리스트를 다시 받음 (useLiveReload)
    · 새 주의(확인 전)가 생기면: 공장 담당자는 주의 알림 창을 바로 띄움 / 본사 관리자는 알림 띠 '위치 보기'
    · 담당자가 체크리스트를 모두 마치면: 알림 띠 '확인하기' → 체크리스트 진행 창
    · 대응 중 알림이 있으면 화면 가장자리 주황 테두리가 1.6초마다 숨쉬듯 (설계안 #vig), 탭 제목 앞에 [주의]
-->
<script setup>
import { computed, onBeforeUnmount, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import ChecklistProgressModal from './ChecklistProgressModal.vue'
import ThermalCheckModal from './ThermalCheckModal.vue'
import WarnDetailModal from './WarnDetailModal.vue'
import WarnNoticeModal from './WarnNoticeModal.vue'
import AppToasts from '@/components/AppToasts.vue'
import { useAlertStore } from '@/stores/alert'
import { LEVEL, LEVEL_META } from '@/types/codes'
import { useLiveReload } from '@/utils/useLiveReload'
import { toast } from '@/utils/toast'

const router = useRouter()
const alert = useAlertStore()

onMounted(alert.refresh)
useLiveReload(alert.refresh)

/** 열린 창에 넘길 알림 (주의 알림 창은 알림 한 건 전체가 필요) */
const modalAlarm = computed(() => alert.activeAlarms.find((a) => a.id === alert.modal?.alarmId) ?? null)

/* ───────── 새 주의 · 체크리스트 완료 알아채기 ───────── */
let known = null // 지난번 받은 { 알림 id: 상태 } (처음 한 번은 비교하지 않음)
let reportedIds = new Set()

watch(
  () => alert.activeAlarms,
  (list) => {
    const before = known
    known = Object.fromEntries(list.map((a) => [a.id, a.status]))
    if (!before) {
      // 처음 화면을 열었을 때도 확인 전 주의가 있으면 공장 담당자에게는 창을 띄움 (설계안: 로그인 후 0.65초)
      const open = list.find((a) => a.status === 'OPEN' && a.level === LEVEL.WARN)
      if (open && alert.canAct && !alert.modal) setTimeout(() => alert.modal || alert.open('warn', { alarmId: open.id }), 650)
      return
    }
    for (const a of list) {
      if (a.status !== 'OPEN' || before[a.id] === 'OPEN') continue // 새로 '확인 전'이 된 알림만
      if (alert.canAct) {
        if (!alert.modal) setTimeout(() => alert.open('warn', { alarmId: a.id }), 650)
      } else {
        toast(`울산공장 ${a.location.split(' · ').slice(0, 2).join(' ')}에서 주의가 발생했습니다.`, {
          type: 'warn',
          action: '위치 보기',
          onAction: () => router.push({ name: 'process', params: { siteId: a.siteId, factoryId: a.factoryId, processId: a.processId } }),
        })
      }
    }
  },
)

watch(
  () => alert.checklists,
  (list) => {
    const done = list.filter((c) => c.status === 'REPORTED')
    for (const c of done) {
      if (reportedIds.has(c.id)) continue
      reportedIds.add(c.id)
      if (alert.canAct && alert.modal?.type !== 'checklist') {
        toast(`${c.assignee.name} 님이 체크리스트 ${c.items.length}개 항목을 모두 마쳤습니다.`, {
          ms: 6000,
          action: '확인하기',
          onAction: () => alert.open('checklist', { alarmId: c.alarmId, checklistId: c.id }),
        })
      }
    }
    reportedIds = new Set([...reportedIds].filter((id) => list.some((c) => c.id === id)))
  },
)

/* ───────── 화면 테두리 · 탭 제목 ───────── */
const level = computed(() => alert.primary?.level ?? null)
const vignette = computed(() => (level.value ? LEVEL_META[level.value]?.key : ''))

watch(
  level,
  (lv) => {
    const prefix = lv ? `[${LEVEL_META[lv]?.label}] ` : ''
    document.title = `${prefix}ArgOS 환경안전 통합관제`
  },
  { immediate: true },
)
// 로그아웃 등으로 이 화면들을 떠나면 제목을 원래대로, 열린 창·받아 둔 알림도 비움 (다른 계정으로 다시 들어올 때 남지 않게)
onBeforeUnmount(() => {
  document.title = 'ArgOS 환경안전 통합관제'
  alert.reset()
})
</script>

<template>
  <Teleport to="body">
    <!-- 화면 가장자리 상태 테두리 (누르기는 통과) -->
    <div v-if="vignette" class="vignette" :class="vignette" aria-hidden="true" />

    <Transition name="modal" :duration="{ enter: 300, leave: 200 }">
      <WarnNoticeModal v-if="alert.modal?.type === 'warn' && modalAlarm" :key="`warn-${alert.modal.alarmId}`" :alarm="modalAlarm" />
      <WarnDetailModal v-else-if="alert.modal?.type === 'detail'" :key="`detail-${alert.modal.alarmId}`" :alarm-id="alert.modal.alarmId" />
      <ThermalCheckModal v-else-if="alert.modal?.type === 'thermal'" :key="`thermal-${alert.modal.alarmId}`" :alarm-id="alert.modal.alarmId" />
      <ChecklistProgressModal
        v-else-if="alert.modal?.type === 'checklist'"
        :key="`ck-${alert.modal.checklistId}`"
        :checklist-id="alert.modal.checklistId"
      />
    </Transition>

    <AppToasts />
  </Teleport>
</template>

<style scoped>
/* 화면 가장자리 테두리 (설계안 #vig.warn: 안쪽 5px 주황, 1.6초 숨쉬기) */
.vignette {
  position: fixed;
  inset: 0;
  z-index: 90;
  pointer-events: none;
}

.vignette.warn {
  box-shadow: inset 0 0 0 5px rgba(249, 115, 22, 0.95);
  animation: vig-warn var(--m-pulse-warn) ease-in-out infinite;
}

.vignette.alarm,
.vignette.fire {
  box-shadow:
    inset 0 0 0 7px var(--color-level-alarm),
    inset 0 0 90px rgba(220, 38, 38, 0.28);
  animation: vig-warn var(--m-pulse-alarm) ease-in-out infinite;
}

@keyframes vig-warn {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.45;
  }
}

/* 움직임 줄이기: 깜빡임 대신 굵은 테두리 */
@media (prefers-reduced-motion: reduce) {
  .vignette {
    animation: none !important;
  }
}
</style>
