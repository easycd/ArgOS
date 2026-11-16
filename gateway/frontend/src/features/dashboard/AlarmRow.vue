<!--
  실시간 알림 한 줄 (설계안 css/base.css .al)
  - 왼쪽: 센서 종류 아이콘 (진행 중이면 상태 색, 끝났으면 회색)
  - 가운데: 제목, 위치 · 센서 태그 · 값
  - 오른쪽: 진행 상태 칩 + 발생 시각
  - 진행 중(조치 완료 전)인 알림은 왼쪽 색 띠 + 옅은 배경
-->
<script setup>
import { computed } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import { ALARM_STATUS_LABEL, LEVEL_META, SENSOR_TYPES } from '@/types/codes'

const props = defineProps({
  /** GET /alarms 의 items 하나 */
  alarm: { type: Object, required: true },
})

const active = computed(() => props.alarm.status !== 'CLOSED')
const levelKey = computed(() => LEVEL_META[props.alarm.level]?.key ?? 'normal')
const icon = computed(() => SENSOR_TYPES.find((t) => t.type === props.alarm.sensorType)?.icon ?? 'alert')

/**
 * 진행 상태 칩 색
 * - 발생 중: 알림 단계 색 / 확인함·조치 중: 파랑 / 조치 완료: 초록
 */
const chipClass = computed(() => {
  if (props.alarm.status === 'OPEN') return `is-${levelKey.value}`
  if (props.alarm.status === 'CLOSED') return 'is-done'
  return 'is-info'
})

// 발생 시각: '2026-11-16T16:38:20+09:00' → '16:38:20'
const time = computed(() => props.alarm.raisedAt?.slice(11, 19) ?? '')
</script>

<template>
  <div class="alarm-row" :class="active ? `active is-${levelKey}` : ''">
    <span class="icon"><AppIcon :name="icon" :size="21" /></span>

    <div class="text">
      <b>{{ alarm.title }}</b>
      <span>
        {{ alarm.location }} <span class="mono">{{ alarm.sensorTag }}</span> ·
        <b class="mono">{{ alarm.value }}</b> {{ alarm.unit }}
      </span>
    </div>

    <div class="right">
      <span class="chip" :class="chipClass">{{ ALARM_STATUS_LABEL[alarm.status] }}</span>
      <span class="mono time">{{ time }}</span>
    </div>
  </div>
</template>

<style scoped>
.alarm-row {
  position: relative;
  height: 84px;
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 0 20px;
  border-bottom: 1px solid #f1f5f9;
}

.alarm-row:last-child {
  border-bottom: none;
}

/* 진행 중인 알림: 왼쪽 색 띠 + 옅은 배경 */
.alarm-row.active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
}

.alarm-row.active.is-warn {
  background: #fffdf0;
}

.alarm-row.active.is-warn::before {
  background: var(--color-level-warn);
}

.alarm-row.active.is-alarm,
.alarm-row.active.is-fire {
  background: #fef6f6;
}

.alarm-row.active.is-alarm::before,
.alarm-row.active.is-fire::before {
  background: var(--color-level-alarm);
}

/* 아이콘 칸: 기본은 회색(끝난 알림) */
.icon {
  width: 40px;
  height: 40px;
  flex: none;
  display: grid;
  place-items: center;
  border-radius: var(--radius-sm);
  background: #f1f5f9;
  color: #64748b;
}

.active.is-warn .icon {
  background: var(--color-level-warn-soft);
  color: #ea580c;
}

.active.is-alarm .icon,
.active.is-fire .icon {
  background: var(--color-level-alarm-soft);
  color: var(--color-level-alarm-text);
}

.text {
  flex: 1;
  min-width: 0;
}

.text > b {
  display: block;
  margin-bottom: 4px;
  font-size: 15px;
}

.text > span {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 13px;
  color: var(--color-text-sub);
}

.right {
  text-align: right;
}

.time {
  display: block;
  margin-top: 6px;
  font-size: 12px;
  color: var(--color-text-weak);
}

/* 진행 상태 칩 (LevelBadge 와 같은 모양, 아이콘 없음) */
.chip {
  display: inline-block;
  padding: 2px 8px;
  border-radius: var(--radius-xs);
  font-size: 12px;
  font-weight: 700;
  line-height: 18px;
  white-space: nowrap;
}

.chip.is-warn {
  background: var(--color-level-warn-soft);
  color: var(--color-level-warn-text);
}

.chip.is-alarm,
.chip.is-fire {
  background: var(--color-level-alarm-soft);
  color: var(--color-level-alarm-text);
}

.chip.is-info {
  background: #e0f2fe;
  color: #0369a1;
}

.chip.is-done {
  background: var(--color-level-normal-soft);
  color: var(--color-level-normal-text);
}
</style>
