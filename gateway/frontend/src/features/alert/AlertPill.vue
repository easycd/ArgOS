<!--
  상단 바 상태 띠 (화면설계안 js/shell.js updateHeader() #stpill, css/extra.css)
  - 대응 중 알림이 있을 때만: '⚠ 주의 1건  상도 건조로 · 눌러서 확인'
  - 나타날 때 튀어 오름(.4s) 후 1.6초마다 주황 빛번짐, 아이콘은 1초마다 깜빡임
  - 화재: '🔥 화재 발생  상도 건조로 버너실' (설계안)
  - 누르면: 공장 담당자 → 알림 상태에 맞는 창 (주의 알림 / 주의 상세 / 체크리스트 진행 / 경보·화재 대응)
            본사 관리자 → 화재면 사업장 선택(화재 현황), 그 밖에는 그 공정 배치도 화면으로 (조치는 공장 담당자 몫)
  - 색: 재원님이 정한 주의색 #F97316 (설계안은 띠 바탕만 조금 진한 #EA580C)
-->
<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import AppIcon from '@/components/AppIcon.vue'
import { useAlertStore } from '@/stores/alert'
import { LEVEL, LEVEL_META } from '@/types/codes'

const router = useRouter()
const alert = useAlertStore()

const a = computed(() => alert.primary)
const meta = computed(() => LEVEL_META[a.value?.level] ?? null)
const count = computed(() => alert.activeAlarms.filter((x) => x.level === a.value?.level).length)
const isFire = computed(() => a.value?.level === LEVEL.FIRE)
// 설비 이름: 위치의 마지막 칸에서 부품 이름을 뺌 ('상도 건조로 배기팬' → '상도 건조로'), 화재는 부품까지
const where = computed(() => {
  const last = a.value?.location.split(' · ').at(-1) ?? ''
  return isFire.value ? last : last.replace(/ (배기팬|버너실|순환펌프)$/, '')
})

function onClick() {
  if (alert.canAct) {
    alert.openFor(a.value)
    return
  }
  if (isFire.value) {
    router.push({ name: 'site-select' })
    return
  }
  const { siteId, factoryId, processId } = a.value
  router.push({ name: 'process', params: { siteId, factoryId, processId } })
}
</script>

<template>
  <Transition name="pill">
    <button
      v-if="a && meta"
      :key="a.level"
      type="button"
      class="pill"
      :class="meta.key"
      role="status"
      @click="onClick"
    >
      <AppIcon :name="meta.icon" :size="18" class="ico" />
      <template v-if="isFire">화재 발생<small>{{ where }}</small></template>
      <template v-else>
        {{ meta.label }} {{ count }}건
        <small>{{ where }} · 눌러서 확인</small>
      </template>
    </button>
  </Transition>
</template>

<style scoped>
.pill {
  height: 38px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 14px 0 10px;
  border: none;
  border-radius: var(--radius-sm);
  color: #fff;
  font-size: 13.5px;
  font-weight: 700;
  white-space: nowrap;
  cursor: pointer;
  transition: transform 150ms;
}

.pill:hover {
  transform: translateY(-1px);
}

.pill small {
  font-size: 12.5px;
  font-weight: 500;
  opacity: 0.95;
}

.pill .ico {
  stroke-width: 2.4;
  animation: pill-blink 1s steps(2, jump-none) infinite;
}

/* 주의: 주황 + 1.6초 빛번짐 */
.pill.warn {
  background: var(--color-level-warn);
  animation:
    pill-pop 400ms cubic-bezier(0.2, 1.2, 0.3, 1) both,
    pill-warn var(--m-pulse-warn) ease-in-out 400ms infinite;
}

/* 경보·화재: 빨강 + 0.9초 */
.pill.alarm,
.pill.fire {
  background: var(--color-level-alarm);
  animation:
    pill-pop 400ms cubic-bezier(0.2, 1.2, 0.3, 1) both,
    pill-alarm 0.9s ease-in-out 400ms infinite;
}

/* 사라질 때 */
.pill-leave-active {
  transition: opacity var(--m-pop-out);
}

.pill-leave-to {
  opacity: 0;
}

@keyframes pill-pop {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: none;
  }
}

@keyframes pill-warn {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(249, 115, 22, 0.5);
  }
  50% {
    box-shadow: 0 0 0 6px rgba(249, 115, 22, 0);
  }
}

@keyframes pill-alarm {
  0%,
  100% {
    box-shadow: 0 0 0 0 rgba(220, 38, 38, 0.6);
  }
  50% {
    box-shadow: 0 0 0 7px rgba(220, 38, 38, 0);
  }
}

@keyframes pill-blink {
  0% {
    opacity: 1;
  }
  100% {
    opacity: 0.35;
  }
}

@media (prefers-reduced-motion: reduce) {
  .pill,
  .pill .ico {
    animation: none !important;
  }
}
</style>
