<!--
  공장 대시보드 화면 (예: 5공장 공정 배치도 — 화면설계안 js/v-dash.js vPlant() 기준)
  - 왼쪽: 구역 현황(공정 배치도, PlantMapCard), 공정별 설비 상태(ProcessStatusCard)
  - 오른쪽: 센서별 단계 현황, 실시간 알림, 시간대별 알림 (사업장 현황과 같은 카드를 공장 범위로)
  - 이 파일은 데이터 불러오기와 화면 이동만 담당, 모양은 features 의 카드가 담당
  - 데이터 (지금은 예시 데이터): GET /factories/{factoryId}/overview, GET /alarms?factoryId=, GET /alarms/hourly?factoryId=
  - 공정을 누르면: 설비 배치도가 있는 공정(도장 공정)은 3D 설비 배치도로, 나머지는 안내 문구
-->
<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getAlarms, getHourlyAlarms } from '@/api/dashboard'
import { getFactoryOverview } from '@/api/factory'
import { getSiteName } from '@/api/sites'
import AppNotice from '@/components/AppNotice.vue'
import AlarmListCard from '@/features/dashboard/AlarmListCard.vue'
import HourlyAlarmCard from '@/features/dashboard/HourlyAlarmCard.vue'
import SensorTypeCard from '@/features/dashboard/SensorTypeCard.vue'
import PlantMapCard from '@/features/factory/PlantMapCard.vue'
import ProcessStatusCard from '@/features/factory/ProcessStatusCard.vue'
import { sumLevels } from '@/features/site/siteStats'
import { SENSOR_TYPES } from '@/types/codes'
import { useLiveReload } from '@/utils/useLiveReload'
import { useNotice } from '@/utils/useNotice'

const route = useRoute()
const router = useRouter()

const overview = ref(null)
const alarms = ref([])
const hourly = ref(null)
const siteName = ref('')
const loading = ref(true)
const errorMessage = ref('')

/**
 * 네 가지를 한꺼번에 불러옴 (하나라도 실패하면 오류 문구)
 * - silent: 상황이 바뀌어 다시 부를 때는 '불러오는 중'을 띄우지 않음
 */
async function load({ silent = false } = {}) {
  const { siteId, factoryId } = route.params
  if (!silent) loading.value = true
  errorMessage.value = ''
  try {
    const [o, a, h, name] = await Promise.all([
      getFactoryOverview(factoryId),
      getAlarms({ factoryId }),
      getHourlyAlarms({ factoryId }),
      getSiteName(siteId),
    ])
    overview.value = o
    alarms.value = a.items
    hourly.value = h
    siteName.value = name
  } catch (error) {
    errorMessage.value = error.message
  } finally {
    loading.value = false
  }
}

watch(() => route.params.factoryId, () => load(), { immediate: true })
useLiveReload(load)

// 공장 전체 센서 종류별 개수 = 공정들의 합 (센서별 단계 현황 카드)
const factoryLevelsByType = computed(() =>
  Object.fromEntries(
    SENSOR_TYPES.map(({ type }) => [type, sumLevels(overview.value.processes.map((p) => p.levelsByType[type]))]),
  ),
)

// 경로의 '울산공장' → 사업장 현황
const siteRoute = computed(() => ({ name: 'site-dashboard', params: { siteId: route.params.siteId } }))

const { message: noticeMessage, show: showNotice } = useNotice()

/** 공정 선택: 설비 배치도가 있으면 3D 설비 배치도로, 없으면 안내 */
function onSelectProcess(process) {
  if (!process.hasFloorplan) {
    showNotice(`${process.name}의 설비 배치도는 아직 등록되지 않았습니다.`)
    return
  }
  router.push({
    name: 'process',
    params: { siteId: route.params.siteId, factoryId: route.params.factoryId, processId: process.id },
  })
}
</script>

<template>
  <p v-if="loading" class="state">불러오는 중</p>
  <p v-else-if="errorMessage" class="state error">{{ errorMessage }}</p>

  <div v-else class="factory-dashboard">
    <div class="left">
      <PlantMapCard
        :site-name="siteName"
        :site-route="siteRoute"
        :factory-name="overview.factory.name"
        :processes="overview.processes"
        :cameras="overview.cameras"
        @select-process="onSelectProcess"
      />
      <ProcessStatusCard
        :factory-name="overview.factory.name"
        :processes="overview.processes"
        :cameras="overview.cameras"
        @select="onSelectProcess"
      />
    </div>

    <div class="right">
      <SensorTypeCard :site-name="overview.factory.name" :levels-by-type="factoryLevelsByType" />
      <AlarmListCard :alarms="alarms" />
      <HourlyAlarmCard :hourly="hourly" />
    </div>
  </div>

  <AppNotice :message="noticeMessage" />
</template>

<style scoped>
/* 배치: 사업장 현황과 같음 (왼쪽 넓은 열 + 오른쪽 628px 열) */
.factory-dashboard {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 628px;
  gap: 16px;
  align-items: start;
}

@media (max-width: 1400px) {
  .factory-dashboard {
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
