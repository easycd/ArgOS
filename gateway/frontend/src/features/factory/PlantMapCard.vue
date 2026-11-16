<!--
  공장 '구역 현황' 카드: 경로(울산공장 › 5공장 공정 배치도) + 범례 + 공정 배치도
  - 공정을 누르면 select-process 이벤트 (페이지가 3D 배치도로 이동 또는 안내)
  - 경로의 사업장 이름을 누르면 사업장 현황으로
-->
<script setup>
import PlantMap from './PlantMap.vue'
import AppIcon from '@/components/AppIcon.vue'
import BaseCard from '@/components/BaseCard.vue'
import { STAGES } from '@/features/site/stages'

defineProps({
  siteName: { type: String, default: '' },
  /** 사업장 현황으로 가는 주소 (RouterLink to) */
  siteRoute: { type: Object, required: true },
  factoryName: { type: String, required: true },
  processes: { type: Array, required: true },
  cameras: { type: Array, default: () => [] },
})

const emit = defineEmits(['select-process'])
</script>

<template>
  <BaseCard title="구역 현황">
    <template #sub>
      <span class="crumb">
        <RouterLink :to="siteRoute" class="link">{{ siteName }}</RouterLink>
        <AppIcon name="cr" :size="14" />
        <b>{{ factoryName }} 공정 배치도</b>
      </span>
    </template>

    <template #actions>
      <span v-for="s in STAGES" :key="s.level" class="legend">
        <i :style="{ borderColor: s.color }" />{{ s.label }}
      </span>
      <span class="legend"><i class="camera" />열화상 카메라</span>
    </template>

    <div class="map-area">
      <PlantMap :processes="processes" :cameras="cameras" @select="emit('select-process', $event)" />
      <div class="hint"><AppIcon name="zoomin" :size="15" />공정을 누르면 설비 배치도로 들어갑니다</div>
    </div>
  </BaseCard>
</template>

<style scoped>
/* 경로: 울산공장 › 5공장 공정 배치도 */
.crumb {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 14px;
  color: var(--color-text-sub);
}

.crumb .app-icon {
  color: var(--color-text-weak);
}

.crumb b {
  color: var(--color-text);
}

.link {
  color: var(--color-primary);
  font-weight: 500;
  text-decoration: none;
}

.link:hover {
  text-decoration: underline;
  text-underline-offset: 3px;
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

/* 열화상 카메라 범례: 분홍 네모 */
.legend i.camera {
  width: 16px;
  height: 11px;
  border: none;
  background: #db2777;
}

.map-area {
  position: relative;
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
