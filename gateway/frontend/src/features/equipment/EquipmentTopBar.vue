<!--
  설비 상세 제목 줄 (설계안 vEquip() 의 .topbar, 카드 밖 한 줄)
  - 왼쪽: 경로 '울산공장 › 5공장 › 도장 공정 › 상도 건조로' + 상태 배지(크게) + 체크리스트 진행 배지
  - 오른쪽: 추이 범위(1시간 / 6시간 / 오늘) + '설비 배치도' 돌아가기 버튼
-->
<script setup>
import ChecklistBadge from './ChecklistBadge.vue'
import AppIcon from '@/components/AppIcon.vue'
import LevelBadge from '@/components/LevelBadge.vue'
import SegButtons from '@/components/SegButtons.vue'

defineProps({
  /** 경로: [{ label, to }] — to 가 있으면 링크 */
  crumbs: { type: Array, required: true },
  level: { type: String, required: true },
  /** 진행 중 체크리스트 (없으면 null) */
  checklist: { type: Object, default: null },
  /** 돌아갈 공정 배치도 라우트 */
  backTo: { type: Object, required: true },
})

/** 추이 범위 ('1h' | '6h' | 'today') */
const range = defineModel('range', { type: String, required: true })

const RANGES = [
  { value: '1h', label: '1시간' },
  { value: '6h', label: '6시간' },
  { value: 'today', label: '오늘' },
]
</script>

<template>
  <div class="topbar">
    <span class="crumb">
      <template v-for="(c, i) in crumbs" :key="c.label">
        <AppIcon v-if="i > 0" name="cr" :size="14" />
        <RouterLink v-if="c.to" :to="c.to" class="link">{{ c.label }}</RouterLink>
        <b v-else>{{ c.label }}</b>
      </template>
    </span>
    <LevelBadge :level="level" class="big" />

    <div class="right">
      <ChecklistBadge v-if="checklist" :checklist="checklist" />
      <SegButtons v-model="range" :options="RANGES" />
      <RouterLink :to="backTo" class="btn back"><AppIcon name="cl" :size="16" />설비 배치도</RouterLink>
    </div>
  </div>
</template>

<style scoped>
.topbar {
  display: flex;
  align-items: center;
  gap: 12px;
  height: 40px;
  margin-bottom: 10px;
}

.crumb {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 16px;
  color: var(--color-text-sub);
  white-space: nowrap;
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

/* 설계안 .chip.lgc: 제목 줄의 큰 상태 배지 */
.big {
  padding: 4px 12px;
  font-size: 14px;
  line-height: 20px;
}

.right {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 10px;
}

.back {
  height: 36px;
  text-decoration: none;
}
</style>
