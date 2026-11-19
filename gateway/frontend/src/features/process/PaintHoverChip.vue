<!--
  도장 공정 3D 배치도: 마우스를 올린 설비 위에 뜨는 이름 칩 (2026-11-19 재원님 시안 A, 이전 말풍선 대신)
  - 설비 위: 이름 + 상태 배지 / 묶인 부품('배기팬 · 버너실 포함') / 센서 값('전류 22.4 A · 온도 146 ℃')
  - 배기팬 위(fanSensor 가 있을 때): '상도 건조로 › 배기팬' + 그 팬 전류 센서 단계 배지
      / 팬 아이콘(가동 중이면 돎) · 전류 · 회전수 · 가동 중/정지 / '누르면 회전수 · 켜기/끄기 조절'
  - 자리(at)는 PaintMap 이 정함: 설비(또는 배기팬) 위쪽 가운데. 마우스를 따라다니지 않음
-->
<script setup>
import { computed } from 'vue'
import { PAINT_EQUIPMENT } from './paintLayout'
import AppIcon from '@/components/AppIcon.vue'
import LevelBadge from '@/components/LevelBadge.vue'
import { LEVEL, SENSOR_TYPES } from '@/types/codes'

const props = defineProps({
  /** 화면용 설비 하나 { key, name, level, fan: { power, rpm }, sensors } */
  equipment: { type: Object, required: true },
  /** 배기팬 위면 그 배기팬 전류 센서 태그 (예: 'CT-17'), 아니면 '' */
  fanSensor: { type: String, default: '' },
  /** 칩 아래 가운데 점 (그림 상자 안 좌표) */
  at: { type: Object, required: true },
})

// 그림 부품 id 앞부분 → 부품 이름 (건물 eq- 은 설비 이름이라 뺌)
const PART_NAME = { 'fan-': '배기팬', 'burner-': '버너실', 'ir-': '열화상 카메라', 'pump-': '순환펌프' }

/** 묶인 부품: '배기팬 · 버너실 포함' (부품이 없으면 '') */
const parts = computed(() => {
  const ids = PAINT_EQUIPMENT[props.equipment.key]?.ids ?? []
  const names = ids.map((id) => Object.entries(PART_NAME).find(([head]) => id.startsWith(head))?.[1]).filter(Boolean)
  return names.length ? `${names.join(' · ')} 포함` : ''
})

/** 센서 값 한 줄: '전류 22.4 A · 온도 146 ℃' */
const values = computed(() => {
  const list = props.equipment.sensors
  if (!list.length) return '연결된 센서 없음'
  return list.map((s) => `${SENSOR_TYPES.find((t) => t.type === s.type)?.label ?? s.type} ${s.value} ${s.unit}`).join(' · ')
})

/* 배기팬 위 */
const fanOn = computed(() => props.equipment.fan?.power === 'ON')
const fanCt = computed(() => props.equipment.sensors.find((s) => s.tag === props.fanSensor) ?? null)
</script>

<template>
  <div class="hover-chip" :class="{ fan: fanSensor }" :style="{ left: `${at.x}px`, top: `${at.y}px` }">
    <!-- 배기팬 위 -->
    <template v-if="fanSensor">
      <div class="head">
        <span class="crumb">{{ equipment.name }}</span>
        <AppIcon name="cr" :size="13" class="sep" />
        <b>배기팬</b>
        <LevelBadge :level="fanCt?.level ?? LEVEL.NORMAL" />
      </div>
      <div class="fan-row">
        <span class="fan-icon" :class="{ spin: fanOn }"><AppIcon name="fan" :size="15" /></span>
        <span v-if="fanCt">{{ fanCt.tag }} <b class="mono">{{ fanCt.value }} {{ fanCt.unit }}</b></span>
        <span>회전수 <b class="mono">{{ fanOn ? equipment.fan.rpm.toLocaleString() : 0 }} rpm</b></span>
        <span>{{ fanOn ? '가동 중' : '정지' }}</span>
      </div>
      <div class="hint">누르면 회전수 · 켜기/끄기 조절</div>
    </template>

    <!-- 설비 위 -->
    <template v-else>
      <div class="head">
        <b>{{ equipment.name }}</b>
        <LevelBadge :level="equipment.level" />
      </div>
      <div v-if="parts" class="parts">{{ parts }}</div>
      <div class="values mono">{{ values }}</div>
    </template>
  </div>
</template>

<style scoped>
/* 흰 칩 + 초록 테두리 (시안 A 의 선택 색) — 아래 가운데가 at 점에 오도록 */
.hover-chip {
  position: absolute;
  z-index: 8;
  transform: translate(-50%, calc(-100% - 14px));
  padding: 7px 12px 8px;
  border: 1.5px solid var(--color-level-normal);
  border-radius: var(--radius-sm);
  background: #fff;
  font-size: 12.5px;
  white-space: nowrap;
  box-shadow: 0 6px 18px rgba(15, 23, 42, 0.16);
  pointer-events: none;
  animation: chip-in var(--m-pop-in) both;
}

@keyframes chip-in {
  from {
    opacity: 0;
    transform: translate(-50%, calc(-100% - 10px));
  }
}

.head {
  display: flex;
  align-items: center;
  gap: 6px;
}

.head b {
  font-size: 14px;
}

.crumb {
  font-size: 13.5px;
  color: var(--color-text-sub);
}

.sep {
  color: var(--color-text-weak);
}

.parts {
  margin-top: 2px;
  color: var(--color-text-sub);
}

.values {
  margin-top: 4px;
  color: var(--color-text);
}

/* 배기팬: 전류 · 회전수 · 가동 */
.fan-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 5px;
  color: var(--color-text-sub);
}

.fan-row b {
  color: var(--color-text);
}

.fan-icon {
  display: inline-flex;
  color: var(--color-text-sub);
}

/* 가동 중이면 팬 아이콘이 천천히 돎 */
.fan-icon.spin {
  animation: spin 1.1s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* 누르면 조절 안내: 점선 아래 초록 글자 */
.hint {
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px dashed var(--color-border-strong);
  font-weight: 700;
  color: var(--color-level-normal-text);
}

@media (prefers-reduced-motion: reduce) {
  .hover-chip,
  .fan-icon.spin {
    animation: none;
  }
}
</style>
