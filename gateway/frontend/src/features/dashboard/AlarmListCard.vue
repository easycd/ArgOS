<!--
  실시간 알림 카드: 오늘 알림 최근 순 (GET /alarms)
  - 제목줄 오른쪽: 미조치(조치 완료 전) 건수
  - 줄을 눌러 조치 내역을 펼치는 기능은 다음 작업 (GET /alarms/{alarmId})
-->
<script setup>
import { computed } from 'vue'
import AlarmRow from './AlarmRow.vue'
import BaseCard from '@/components/BaseCard.vue'

const props = defineProps({
  alarms: { type: Array, required: true },
})

const openCount = computed(() => props.alarms.filter((a) => a.status !== 'CLOSED').length)
</script>

<template>
  <BaseCard title="실시간 알림" sub="오늘 · 최근 순">
    <template #actions>
      미조치 <b class="mono" :class="{ open: openCount > 0 }">{{ openCount }}</b>건
    </template>

    <div class="list">
      <AlarmRow v-for="alarm in alarms" :key="alarm.id" :alarm="alarm" />
      <p v-if="alarms.length === 0" class="empty">오늘 알림이 없습니다.</p>
    </div>
  </BaseCard>
</template>

<style scoped>
b {
  font-size: 15px;
  color: var(--color-text);
}

b.open {
  color: var(--color-level-alarm-text);
}

/* 4줄(84px × 4)이 넘으면 카드 안에서 스크롤 (설계안 카드 높이와 같게) */
.list {
  max-height: 336px;
  overflow-y: auto;
  scrollbar-width: thin;
}

.empty {
  padding: 40px 20px;
  text-align: center;
  font-size: 13px;
  color: var(--color-text-sub);
}
</style>
