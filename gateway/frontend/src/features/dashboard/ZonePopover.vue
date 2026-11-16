<!--
  지도에서 공장을 눌렀을 때 뜨는 말풍선 (설계안 v-dash.js vSite() 의 pop)
  - 들어갈 수 있는 공장(5공장): 공정 목록과 단계 + '공정 배치도 보기'
  - 그 외 공장: 오늘 알림 건수 + '아직 등록되지 않음' 안내
  - 위치: anchor(구역 가운데, %) 의 오른쪽에, 지도 오른쪽 끝이면 왼쪽에 띄움
-->
<script setup>
import { computed } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import LevelBadge from '@/components/LevelBadge.vue'
import { keyOf } from '@/features/site/stages'
import { LEVEL_META } from '@/types/codes'

const props = defineProps({
  /** 사업장 현황의 공장 하나 */
  factory: { type: Object, required: true },
  /** 구역 가운데 위치 { x, y } (%) */
  anchor: { type: Object, required: true },
  /** 공정 배치도로 들어갈 수 있는 공장인지 */
  enterable: { type: Boolean, default: false },
})

const emit = defineEmits(['enter'])

// 지도 오른쪽(60% 넘음)에 있는 공장이면 말풍선을 왼쪽에
const onLeft = computed(() => props.anchor.x > 60)
const style = computed(() => ({
  left: `${props.anchor.x}%`,
  top: `${props.anchor.y}%`,
}))
</script>

<template>
  <!-- 구역 가운데 점 -->
  <span class="dot" :style="{ ...style, background: LEVEL_META[factory.level].color }" />

  <div class="zone-popover" :class="{ left: onLeft }" :style="style" @click.stop>
    <div class="head">
      {{ factory.name }}
      <LevelBadge :level="factory.level" />
      <small>{{ enterable ? `공정 ${factory.processes.length}개` : `센서 ${factory.sensorCount}개` }}</small>
    </div>

    <template v-if="enterable">
      <div v-for="p in factory.processes" :key="p.id" class="row" :class="`is-${keyOf(p.level)}`">
        <i :style="{ background: LEVEL_META[p.level].color }" />
        <span class="name">{{ p.name }}</span>
        <LevelBadge :level="p.level" />
      </div>
      <button type="button" class="go" @click="emit('enter', factory)">
        공정 배치도 보기 <AppIcon name="cr" :size="16" />
      </button>
    </template>

    <template v-else>
      <div class="row">
        <span class="name sub">오늘 알림</span>
        <b class="mono">{{ factory.todayAlarmCount }}건</b>
      </div>
      <div class="row note">
        <AppIcon name="info" :size="15" />
        <span>공정 배치도가 아직 등록되지 않았습니다. 지금은 5공장만 볼 수 있습니다.</span>
      </div>
    </template>
  </div>
</template>

<style scoped>
.dot {
  position: absolute;
  width: 10px;
  height: 10px;
  border: 2px solid #fff;
  border-radius: 50%;
  transform: translate(-50%, -50%);
  pointer-events: none;
}

/* 말풍선: 기본은 점 오른쪽 70px, 왼쪽 모드는 점 왼쪽 70px */
.zone-popover {
  position: absolute;
  z-index: 4;
  width: 292px;
  margin-left: 70px;
  transform: translateY(-50%);
  background: #fff;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.16);
  animation: softin 0.2s both;
}

.zone-popover.left {
  margin-left: -362px;
}

.head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 14px 9px;
  font-size: 15px;
  font-weight: 700;
}

.head small {
  margin-left: auto;
  font-size: 12px;
  font-weight: 400;
  color: var(--color-text-weak);
}

.row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 14px;
  border-top: 1px solid #f1f5f9;
  font-size: 14px;
}

.row i {
  width: 9px;
  height: 9px;
  border-radius: 50%;
}

.row .name {
  flex: 1;
}

.row .sub {
  color: var(--color-text-sub);
}

/* 주의·경보 공정은 옅은 배경 + 왼쪽 색 띠 */
.row.is-warn {
  background: rgba(255, 237, 213, 0.4);
  box-shadow: inset 3px 0 0 var(--color-level-warn);
  font-weight: 700;
}

.row.is-alarm,
.row.is-fire {
  background: rgba(254, 226, 226, 0.4);
  box-shadow: inset 3px 0 0 var(--color-level-alarm);
  font-weight: 700;
}

.note {
  align-items: flex-start;
  font-size: 13px;
  line-height: 19px;
  color: #64748b;
}

.note .app-icon {
  margin-top: 2px;
  color: var(--color-text-weak);
}

.go {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 11px;
  border: none;
  border-top: 1px solid var(--color-border);
  border-radius: 0 0 var(--radius-md) var(--radius-md);
  background: none;
  color: var(--color-primary);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.go:hover {
  background: var(--color-primary-soft);
}
</style>
