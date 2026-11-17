<!--
  설비 배치도 — 끌어서 옮기기 (화면설계안 vLayout() #mc)
  - 대시보드와 같은 도장 공정 그림(PaintMap)을 그대로 씀. 설비 둘레는 얇은 상태 색 테두리만 (면은 칠하지 않음)
  - 설비를 끌면 격자 칸 단위로 옮겨짐 (격자에 맞추기 끄면 0.1칸 단위), 연결된 센서 이름표도 함께 이동
  - 오른쪽 위: 고른 설비 사용 ON/OFF, 격자에 맞추기 스위치
  - 아래 왼쪽 안내: '설비를 끌어서 옮기면 연결된 센서도 함께 이동합니다'
-->
<script setup>
import { onMounted, ref } from 'vue'
import AppIcon from '@/components/AppIcon.vue'
import BaseCard from '@/components/BaseCard.vue'
import PaintMap from '@/features/process/PaintMap.vue'

defineProps({
  /** PaintMap 용 설비 [{ key, name, level, sensors }] */
  equipment: { type: Array, required: true },
  /** { 설비 이름: { a, b } } */
  offsets: { type: Object, default: () => ({}) },
  inactive: { type: Array, default: () => [] },
  selectedKey: { type: String, default: '' },
  /** 고른 설비 { name, active } (없으면 null) */
  selected: { type: Object, default: null },
  sub: { type: String, default: '' },
})

const emit = defineEmits(['select', 'move', 'moved', 'use', 'base'])
const snap = ref(true)
const map = ref(null)

/** 그림이 그려진 뒤 설비별 기준 칸 번호를 화면에 알려 줌 (위치 X · Y 표시용) */
// (자식 PaintMap 이 먼저 그려진 뒤라 그림 크기를 잴 수 있음)
onMounted(() => emit('base', map.value?.gridBase() ?? {}))
</script>

<template>
  <BaseCard title="설비 배치도" :sub="sub">
    <template #actions>
      <span v-if="selected" class="use">
        <b>{{ selected.name }}</b>
        <span class="onoff" role="group" aria-label="사용 상태">
          <button type="button" :class="{ on: selected.active }" @click="emit('use', true)">ON</button>
          <button type="button" :class="{ on: !selected.active }" @click="emit('use', false)">OFF</button>
        </span>
        <span class="bar" />
      </span>
      <span class="snap">
        격자에 맞추기
        <button type="button" class="tg" :class="{ on: snap }" role="switch" :aria-checked="snap" aria-label="격자에 맞추기" @click="snap = !snap" />
      </span>
    </template>

    <div class="map">
      <PaintMap
        ref="map"
        :equipment="equipment"
        :offsets="offsets"
        :inactive="inactive"
        :selected="selectedKey"
        :snap="snap"
        editable
        thin
        @select="emit('select', $event.key)"
        @drag="(key, pos) => emit('move', key, pos)"
        @dragend="emit('moved', $event)"
      />
      <p class="hint"><AppIcon name="info" :size="15" />설비를 끌어서 옮기면 연결된 센서도 함께 이동합니다</p>
    </div>
  </BaseCard>
</template>

<style scoped>
.map {
  position: relative;
  height: calc(100% - 48px);
  min-height: 560px;
  background: #f8fafc;
}

.hint {
  position: absolute;
  left: 16px;
  bottom: 16px;
  z-index: 3;
  height: 36px;
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
  padding: 0 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: #fff;
  font-size: 13px;
  color: var(--color-text-sub);
}

.hint svg {
  color: var(--color-text-weak);
}

.use {
  display: flex;
  align-items: center;
  gap: 8px;
}

.use b {
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 600;
  color: var(--color-text);
}

.onoff {
  display: flex;
  overflow: hidden;
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-sm);
}

.onoff button {
  height: 26px;
  padding: 0 10px;
  border: none;
  background: #fff;
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-weak);
  cursor: pointer;
}

.onoff button.on {
  background: var(--color-primary);
  color: #fff;
}

.bar {
  width: 1px;
  height: 18px;
  background: var(--color-border);
}

.snap {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  color: var(--color-text-sub);
}

/* 스위치 */
.tg {
  position: relative;
  width: 40px;
  height: 22px;
  padding: 0;
  border: none;
  border-radius: 11px;
  background: #cbd5e1;
  cursor: pointer;
  transition: background 200ms;
}

.tg::after {
  content: '';
  position: absolute;
  top: 3px;
  left: 3px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #fff;
  transition: transform 200ms;
}

.tg.on {
  background: var(--color-primary);
}

.tg.on::after {
  transform: translateX(18px);
}
</style>
