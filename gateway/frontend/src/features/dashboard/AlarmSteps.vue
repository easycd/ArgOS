<!--
  알림 한 건의 조치 내역 (설계안 v-rev.js actSteps() · css/rev.css .axs) — 실시간 알림 줄을 펼치면 보임
  - 5단계: 발생 → 확인 → 체크리스트 전송 → 조치 중(담당자, 진행) → 조치 확인
  - 끝난 단계: 파란 동그라미에 체크 + 시각 / 지금 단계: 파란 테두리가 퍼지며 깜빡(1.4초) / 남은 단계: 회색 번호 + '대기'
  - 데이터: GET /alarms/{id} 의 timeline (step: RAISED · ACK · CHECKLIST · REPORT · CONFIRM)
-->
<script setup>
import { computed } from 'vue'
import AppIcon from '@/components/AppIcon.vue'

const props = defineProps({
  /** GET /alarms 의 items 하나 (status, checklist, assignee) */
  alarm: { type: Object, required: true },
  /** GET /alarms/{id} 의 timeline */
  timeline: { type: Array, required: true },
})

const hm = (iso) => iso?.slice(11, 19) ?? ''
const at = (name) => props.timeline.find((s) => s.step === name)?.at ?? null

const steps = computed(() => {
  const ack = at('ACK')
  const sent = at('CHECKLIST')
  const report = at('REPORT')
  const confirm = at('CONFIRM')
  const c = props.alarm.checklist
  const who = props.alarm.assignee ?? props.timeline.find((s) => s.step === 'REPORT')?.by ?? '담당자'
  const state = (done, running) => (done ? 'done' : running ? 'run' : 'wait')
  return [
    { label: '발생', text: hm(at('RAISED')), state: 'done' },
    { label: '확인', text: ack ? hm(ack) : '대기', state: state(ack, !ack) },
    { label: '체크리스트 전송', text: sent ? hm(sent) : '대기', state: state(sent, ack && !sent) },
    {
      label: sent ? `조치 · ${who}` : '조치',
      text: report ? hm(report) : c ? `${c.doneCount}/${c.totalCount}` : '대기',
      state: state(report, sent && !report),
    },
    { label: '조치 확인', text: confirm ? hm(confirm) : report ? '확인 필요' : '대기', state: state(confirm, report && !confirm) },
  ]
})
</script>

<template>
  <div class="axs">
    <div v-for="(s, i) in steps" :key="s.label" :class="s.state">
      <i><AppIcon v-if="s.state === 'done'" name="ok" :size="11" /><template v-else>{{ i + 1 }}</template></i>
      <b>{{ s.label }}</b>
      <span class="mono">{{ s.text }}</span>
    </div>
  </div>
</template>

<style scoped>
.axs {
  flex: 1;
  display: flex;
}

.axs > div {
  position: relative;
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  font-size: 11.5px;
  color: var(--color-text-weak);
  white-space: nowrap;
}

/* 단계 사이 선 */
.axs > div::before {
  content: '';
  position: absolute;
  left: -50%;
  right: 50%;
  top: 10px;
  height: 2px;
  background: var(--color-border);
}

.axs > div:first-child::before {
  display: none;
}

.axs > div.done::before,
.axs > div.run::before {
  background: var(--color-primary);
}

i {
  position: relative;
  z-index: 1;
  width: 22px;
  height: 22px;
  display: grid;
  place-items: center;
  border: 2px solid var(--color-border-strong);
  border-radius: 50%;
  background: #fff;
  font-family: var(--font-mono);
  font-size: 10.5px;
  font-style: normal;
  color: var(--color-text-weak);
}

i .app-icon {
  stroke-width: 3.5;
}

.done i {
  border-color: var(--color-primary);
  background: var(--color-primary);
  color: #fff;
}

.run i {
  border-color: var(--color-primary);
  color: var(--color-primary);
  animation: step-ring 1.4s ease-out infinite;
}

b {
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-sub);
}

.done b,
.run b {
  color: var(--color-text);
}

@keyframes step-ring {
  0% {
    box-shadow: 0 0 0 0 rgba(37, 99, 235, 0.4);
  }
  100% {
    box-shadow: 0 0 0 8px rgba(37, 99, 235, 0);
  }
}

@media (prefers-reduced-motion: reduce) {
  .run i {
    animation: none;
  }
}
</style>
