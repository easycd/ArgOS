<!--
  사업장 현황 지도 카드: 울산공장 지도 + 공장을 누르면 말풍선
  - 제목: 단계 경로 '사업장 › 울산공장' (CardCrumb, 2026-11-18 '구역 현황'에서 바꿈)
  - 처음 열 때 정상이 아닌 공장이 있으면 그 공장 말풍선을 바로 띄움 (설계안과 같음)
  - 말풍선의 '공정 배치도 보기' → enter-factory 이벤트
-->
<script setup>
import { computed, nextTick, onMounted, ref } from 'vue'
import UlsanMap from './UlsanMap.vue'
import ZonePopover from './ZonePopover.vue'
import AppIcon from '@/components/AppIcon.vue'
import BaseCard from '@/components/BaseCard.vue'
import CardCrumb from '@/components/CardCrumb.vue'
import { STAGES } from '@/features/site/stages'
import { LEVEL } from '@/types/codes'

const props = defineProps({
  siteName: { type: String, default: '' },
  /** 사업장 현황의 공장 목록 */
  factories: { type: Array, required: true },
  /** 공정 배치도로 들어갈 수 있는 공장 ID */
  enterableFactoryId: { type: Number, default: null },
})

const emit = defineEmits(['enter-factory'])

const map = ref(null)

// 열린 말풍선: { code, anchor } 또는 null
const selected = ref(null)
const selectedFactory = computed(() => props.factories.find((f) => f.code === selected.value?.code) ?? null)

function onSelect(value) {
  selected.value = value
}

/** 공장 코드로 말풍선 열기 (아래 '전체 공장 상태' 카드에서 공장을 눌렀을 때 페이지가 부름) */
function open(code) {
  const anchor = map.value?.anchorOfCode(code)
  if (anchor) selected.value = { code, anchor }
}
defineExpose({ open })

// 처음: 정상이 아닌 공장이 있으면 말풍선을 미리 띄움
onMounted(async () => {
  await nextTick()
  const abnormal = props.factories.find((f) => f.level !== LEVEL.NORMAL)
  if (abnormal) open(abnormal.code)
})
</script>

<template>
  <BaseCard>
    <template #title><CardCrumb :items="[{ label: siteName }]" /></template>
    <template #actions>
      <span v-for="s in STAGES" :key="s.level" class="legend">
        <i :style="{ borderColor: s.color }" />{{ s.label }}
      </span>
    </template>

    <div class="map-area">
      <UlsanMap ref="map" :factories="factories" @select="onSelect" />
      <ZonePopover
        v-if="selected && selectedFactory"
        :factory="selectedFactory"
        :anchor="selected.anchor"
        :enterable="selectedFactory.id === enterableFactoryId"
        @enter="emit('enter-factory', $event)"
      />
      <div class="hint"><AppIcon name="zoomin" :size="15" />공장을 누르면 공정 목록이 열립니다</div>
    </div>
  </BaseCard>
</template>

<style scoped>
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

/* 지도 그림 비율(1545 : 715) 그대로 */
.map-area {
  position: relative;
  aspect-ratio: 1545 / 715;
}

.hint {
  position: absolute;
  left: 16px;
  bottom: 14px;
  height: 32px;
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 0 11px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: rgba(255, 255, 255, 0.92);
  font-size: 12.5px;
  color: var(--color-text-sub);
}

.hint .app-icon {
  color: var(--color-text-weak);
}
</style>
