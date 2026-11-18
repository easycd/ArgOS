<!--
  공정 지도 카드: 단계 경로 + 안내·범례 + 3D 설비 배치도 + 배기팬 창 + 아래 설비 줄
  - 경로: 사업장 › 울산공장 › 5공장 › 도장 공정 (앞 단계는 누르면 이동, CardCrumb)
    · 2026-11-18 제목 '구역 현황' + '도장 공정 3D 설비 배치도' 경로 → 단계 경로 하나로
  - 설비를 누르면 select-equipment, 배기팬 창의 '적용'은 fan-apply 이벤트로 페이지에 넘김
-->
<script setup>
import { ref } from 'vue'
import EquipmentStrip from './EquipmentStrip.vue'
import FanPopover from './FanPopover.vue'
import PaintMap from './PaintMap.vue'
import BaseCard from '@/components/BaseCard.vue'
import CardCrumb from '@/components/CardCrumb.vue'
import { STAGES } from '@/features/site/stages'

const props = defineProps({
  /** 경로('사업장' 다음부터): [{ label, to }] — to 가 있으면 링크 */
  crumbs: { type: Array, required: true },
  /** 화면용 설비 목록 */
  equipment: { type: Array, required: true },
  /** 공장 관리에서 저장한 설비 위치 { 'top-oven': { x, y } } (DB pos_x · pos_y) */
  positions: { type: Object, default: () => ({}) },
  /** 사용 안 함 설비 (흐리게) */
  inactive: { type: Array, default: () => [] },
  /** 배기팬 명령 보내는 중 */
  sendingFan: { type: Boolean, default: false },
})

const emit = defineEmits(['select-equipment', 'fan-apply'])

// 열린 배기팬 창: { equipmentId, position }
const fan = ref(null)

function openFan(eq, position) {
  fan.value = { equipmentId: eq.id, position }
}

const fanEquipment = () => props.equipment.find((e) => e.id === fan.value?.equipmentId)

defineExpose({ closeFan: () => (fan.value = null) })
</script>

<template>
  <BaseCard>
    <template #title><CardCrumb :items="crumbs" /></template>

    <template #actions>
      <span class="hint-text">배기팬을 누르면 회전수 · 켜기/끄기</span>
      <span v-for="s in STAGES" :key="s.level" class="legend"><i :style="{ borderColor: s.color }" />{{ s.label }}</span>
    </template>

    <div class="map-area" @click.self="fan = null">
      <PaintMap :equipment="equipment" :positions="positions" :inactive="inactive" @select="emit('select-equipment', $event)" @fan="openFan" />
      <FanPopover
        v-if="fan && fanEquipment()"
        :equipment="fanEquipment()"
        :position="fan.position"
        :sending="sendingFan"
        @close="fan = null"
        @detail="emit('select-equipment', fanEquipment())"
        @apply="emit('fan-apply', fanEquipment(), $event)"
      />
    </div>

    <EquipmentStrip :equipment="equipment" @select="emit('select-equipment', $event)" />
  </BaseCard>
</template>

<style scoped>
.hint-text {
  color: var(--color-text-weak);
}

.legend {
  display: flex;
  align-items: center;
  gap: 6px;
}

.legend i {
  width: 12px;
  height: 12px;
  border: 2.5px solid;
  border-radius: 3px;
  background: #fff;
}

/* 설계안 배치도 칸 비율 (1236 × 790) */
.map-area {
  position: relative;
  aspect-ratio: 1236 / 790;
}
</style>
