<!--
  서류별 등록 현황 (화면설계안 vInspect() #docs)
  - 서류 5종마다 저장(초록) · 검수 대기(주황) · 미제출(회색) 막대, '저장/전체 건'
  - 줄을 누르면 그 서류 종류로 등록 목록 창이 열림 (화면설계서 ②)
  - 막대 폭은 0.5초에 바뀜
-->
<script setup>
import BaseCard from '@/components/BaseCard.vue'

defineProps({
  /** summary.byForm [{ formType, name, done, review, total }] */
  forms: { type: Array, default: () => [] },
})

defineEmits(['open'])
</script>

<template>
  <BaseCard title="서류별 등록 현황">
    <template #actions>
      <span class="lg"><i class="g" />저장</span>
      <span class="lg"><i class="w" />검수 대기</span>
      <span class="lg"><i class="n" />미제출</span>
    </template>
    <div class="rows">
      <button v-for="f in forms" :key="f.formType" type="button" class="dr" @click="$emit('open', f.formType)">
        <span class="t"><em class="mono">{{ f.formType }}</em>{{ f.name }}<span class="mono">{{ f.done }}/{{ f.total }}건</span></span>
        <span class="b" :style="{ width: `${40 + f.total * 2.4}%` }">
          <u v-if="f.done" class="g" :style="{ flex: f.done }" />
          <u v-if="f.review" class="w" :style="{ flex: f.review }" />
          <u v-if="f.total - f.done - f.review > 0" class="n" :style="{ flex: f.total - f.done - f.review }" />
        </span>
      </button>
    </div>
  </BaseCard>
</template>

<style scoped>
.lg {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12.5px;
}

.lg i {
  width: 12px;
  height: 12px;
  border-radius: 3px;
}

.rows {
  padding: 8px 0 10px;
}

.dr {
  width: 100%;
  height: 49px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 7px;
  padding: 0 20px;
  border: none;
  background: none;
  text-align: left;
  cursor: pointer;
  transition: background var(--m-hover);
}

.dr:hover {
  background: var(--color-surface-sub);
}

.t {
  display: flex;
  align-items: baseline;
  font-size: 13.5px;
  font-weight: 500;
  color: #1e293b;
}

.t em {
  margin-right: 7px;
  font-size: 11px;
  font-style: normal;
  font-weight: 600;
  color: var(--color-primary-hover);
}

.t span {
  margin-left: auto;
  font-size: 12.5px;
  color: var(--color-text-sub);
}

.b {
  max-width: 100%;
  height: 8px;
  display: flex;
  gap: 1px;
  overflow: hidden;
  border-radius: 2px;
  background: #eef2f6;
  transition: width 500ms ease-out;
}

.b u {
  display: block;
  height: 100%;
  transition: flex 500ms ease-out;
}

.g {
  background: var(--color-level-normal);
}

.w {
  background: var(--color-level-warn);
}

.n {
  background: #cbd5e1;
}
</style>
