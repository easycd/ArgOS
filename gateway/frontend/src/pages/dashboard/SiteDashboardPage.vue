<!--
  사업장 현황 화면 (예: 울산공장 — 화면설계안 js/v-dash.js vSite() 기준, 설계안 이름 '구역 현황')
  - 왼쪽: 구역 현황 지도(ZoneMapCard), 전체 공장 상태(FactoryStatusCard)
  - 오른쪽: 센서별 단계 현황(SensorTypeCard), 실시간 알림(AlarmListCard), 시간대별 알림(HourlyAlarmCard)
  - 이 파일은 데이터 불러오기와 화면 이동만 담당, 모양은 features/dashboard 의 카드가 담당
  - 데이터 (지금은 예시 데이터): GET /sites/{siteId}/overview, GET /alarms, GET /alarms/hourly
  - TODO: 실시간(SSE) 연결 후 값이 바뀌면 카드가 다시 그려지게
-->
<script setup>
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getAlarms, getHourlyAlarms, getSiteOverview } from '@/api/dashboard'
import AlarmListCard from '@/features/dashboard/AlarmListCard.vue'
import FactoryStatusCard from '@/features/dashboard/FactoryStatusCard.vue'
import HourlyAlarmCard from '@/features/dashboard/HourlyAlarmCard.vue'
import SensorTypeCard from '@/features/dashboard/SensorTypeCard.vue'
import ZoneMapCard from '@/features/dashboard/ZoneMapCard.vue'

const route = useRoute()
const router = useRouter()

/** 공정 배치도로 들어갈 수 있는 공장 (설계 범위: 5공장만) */
const ENTERABLE_FACTORY_ID = 5

const overview = ref(null)
const alarms = ref([])
const hourly = ref(null)
const loading = ref(true)
const errorMessage = ref('')

/** 세 가지를 한꺼번에 불러옴 (하나라도 실패하면 오류 문구) */
async function load(siteId) {
  loading.value = true
  errorMessage.value = ''
  try {
    const [o, a, h] = await Promise.all([
      getSiteOverview(siteId),
      getAlarms({ siteId }),
      getHourlyAlarms({ siteId }),
    ])
    overview.value = o
    alarms.value = a.items
    hourly.value = h
  } catch (error) {
    errorMessage.value = error.message
  } finally {
    loading.value = false
  }
}

watch(() => route.params.siteId, load, { immediate: true })

// 지도 카드 (공장 카드를 눌렀을 때 말풍선을 열려고 참조)
const zoneMap = ref(null)

/** 공장 대시보드로 이동 */
function enterFactory(factory) {
  router.push({ name: 'dashboard', params: { siteId: route.params.siteId, factoryId: factory.id } })
}

/** 공장 카드 클릭: 들어갈 수 있으면 이동, 아니면 지도에 말풍선 */
function onFactorySelect(factory) {
  if (factory.id === ENTERABLE_FACTORY_ID) enterFactory(factory)
  else zoneMap.value?.open(factory.code)
}
</script>

<template>
  <p v-if="loading" class="state">불러오는 중</p>
  <p v-else-if="errorMessage" class="state error">{{ errorMessage }}</p>

  <div v-else class="site-dashboard">
    <div class="left">
      <ZoneMapCard
        ref="zoneMap"
        :site-name="overview.site.name"
        :factories="overview.factories"
        :enterable-factory-id="ENTERABLE_FACTORY_ID"
        @enter-factory="enterFactory"
      />
      <FactoryStatusCard :factories="overview.factories" @select="onFactorySelect" />
    </div>

    <div class="right">
      <SensorTypeCard :site-name="overview.site.name" :levels-by-type="overview.levelsByType" />
      <AlarmListCard :alarms="alarms" />
      <HourlyAlarmCard :hourly="hourly" />
    </div>
  </div>
</template>

<style scoped>
/* 배치: 왼쪽 넓은 열 + 오른쪽 628px 열 (설계안 1920 화면 기준), 좁은 화면에서는 위아래로 */
.site-dashboard {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 628px;
  gap: 16px;
  align-items: start;
}

@media (max-width: 1400px) {
  .site-dashboard {
    grid-template-columns: minmax(0, 1fr);
  }
}

.left,
.right {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}

.state {
  color: var(--color-text-sub);
}

.state.error {
  color: var(--color-level-alarm-text);
}
</style>
