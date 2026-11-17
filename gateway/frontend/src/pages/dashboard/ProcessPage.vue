<!--
  공정 3D 설비 배치도 화면 (예: 5공장 도장 공정 — 화면설계안 js/v-dash.js vProcess() 기준)
  - 왼쪽: 구역 현황(3D 설비 배치도 + 배기팬 창 + 설비 줄, ProcessMapCard)
  - 오른쪽: 센서별 단계 현황(이 공정), 실시간 알림(이 공정), 오늘 설비 점검
  - 이 파일은 데이터 불러오기·합치기와 화면 이동, 배기팬 명령 보내기만 담당
  - 데이터 (지금은 예시 데이터): GET /processes/{id}/layout, /status, GET /alarms?processId=, GET /inspections/today
-->
<script setup>
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { USE_MOCK } from '@/api/mock'
import { getAlarms } from '@/api/dashboard'
import { getFactoryOverview } from '@/api/factory'
import { getProcessLayout, getProcessStatus, getTodayInspections, sendFanCommand } from '@/api/process'
import { getSiteName } from '@/api/sites'
import AppNotice from '@/components/AppNotice.vue'
import AlarmListCard from '@/features/dashboard/AlarmListCard.vue'
import SensorTypeCard from '@/features/dashboard/SensorTypeCard.vue'
import InspectionTodayCard from '@/features/process/InspectionTodayCard.vue'
import ProcessMapCard from '@/features/process/ProcessMapCard.vue'
import { buildProcessEquipment } from '@/features/process/processEquipment'
import { svgKeyOf } from '@/features/process/paintLayout'
import { LEVEL, SENSOR_TYPES } from '@/types/codes'
import { useLiveReload } from '@/utils/useLiveReload'
import { useNotice } from '@/utils/useNotice'

const route = useRoute()
const router = useRouter()

const layout = ref(null)
const status = ref(null)
const alarms = ref([])
const inspections = ref(null)
const names = ref({ site: '', factory: '' })
const loading = ref(true)
const errorMessage = ref('')

/** 불러오기 (silent: 상황이 바뀌어 다시 부를 때는 '불러오는 중'을 띄우지 않음) */
async function load({ silent = false } = {}) {
  const { siteId, factoryId, processId } = route.params
  if (!silent) loading.value = true
  errorMessage.value = ''
  try {
    const [l, s, a, i, siteName, factory] = await Promise.all([
      getProcessLayout(processId),
      getProcessStatus(processId),
      getAlarms({ processId }),
      getTodayInspections(processId),
      getSiteName(siteId),
      getFactoryOverview(factoryId),
    ])
    layout.value = l
    status.value = s
    alarms.value = a.items
    inspections.value = i
    names.value = { site: siteName, factory: factory.factory.name }
  } catch (error) {
    errorMessage.value = error.message
  } finally {
    loading.value = false
  }
}

watch(() => route.params.processId, () => load(), { immediate: true })
useLiveReload(load)

// 화면용 설비 목록: 배치도(layout) + 지금 값(status) 을 합침 (features/process/processEquipment.js)
const equipment = computed(() => buildProcessEquipment(layout.value, status.value))
// 공장 관리에서 저장한 배치(격자 칸 이동·사용 안 함)를 배치도에 반영
const mapOffsets = computed(() => Object.fromEntries((layout.value?.equipment ?? []).filter((e) => e.grid).map((e) => [svgKeyOf(e.code), e.grid])))
const mapInactive = computed(() => (layout.value?.equipment ?? []).filter((e) => e.active === false).map((e) => svgKeyOf(e.code)))

/** 이 공정 센서 종류별 단계 개수 (설비에 안 붙은 예비 센서도 포함, 열화상 제외) */
const levelsByType = computed(() => {
  const result = {}
  for (const { type } of SENSOR_TYPES) {
    const levels = status.value.sensors
      .filter((s) => layout.value.sensors.find((x) => x.id === s.id)?.type === type)
      .map((s) => s.level)
    result[type] = {
      [LEVEL.NORMAL]: levels.filter((l) => l === LEVEL.NORMAL).length,
      [LEVEL.WARN]: levels.filter((l) => l === LEVEL.WARN).length,
      [LEVEL.ALARM]: levels.filter((l) => l === LEVEL.ALARM || l === LEVEL.FIRE).length,
    }
  }
  return result
})

// 경로: 울산공장 › 5공장 › 도장 공정 3D 설비 배치도
const crumbs = computed(() => {
  const { siteId, factoryId } = route.params
  return [
    { label: names.value.site, to: { name: 'site-dashboard', params: { siteId } } },
    { label: names.value.factory, to: { name: 'dashboard', params: { siteId, factoryId } } },
    { label: `${layout.value?.name ?? ''} 3D 설비 배치도` },
  ]
})

const inspectionRoute = computed(() => ({ name: 'inspection', params: { siteId: route.params.siteId } }))

const { message: noticeMessage, show: showNotice } = useNotice()

/** 설비 선택 → 설비 상세 화면 */
function onSelectEquipment(eq) {
  router.push({ name: 'equipment', params: { ...route.params, equipmentId: eq.id } })
}

/**
 * 배기팬 '적용'
 * - 켜기/끄기가 바뀌었으면 { power }, 켜진 상태에서 회전수가 바뀌었으면 { rpm } 를 보냄
 * - 명세서: 서버는 접수(202)만 하고 결과는 SSE command.result 로 옴 → TODO: SSE 연결 후 결과로 확정
 *   지금은 접수되면 화면 값을 바로 바꿈
 */
const sendingFan = ref(false)
const mapCard = ref(null)

async function onFanApply(eq, { power, rpm }) {
  sendingFan.value = true
  try {
    if (power !== eq.fan.power) await sendFanCommand(eq.id, { power })
    if (power === 'ON' && rpm !== eq.fan.rpm) await sendFanCommand(eq.id, { rpm })
    const target = status.value.equipment.find((x) => x.id === eq.id)
    target.fan = { power, rpm, targetRpm: rpm }
    mapCard.value?.closeFan()
    showNotice(
      USE_MOCK
        ? `${eq.name} 배기팬 명령을 보냈습니다. (예시 데이터라 실제 설비는 움직이지 않습니다)`
        : `${eq.name} 배기팬 명령을 보냈습니다.`,
    )
  } catch (error) {
    showNotice(error.message)
  } finally {
    sendingFan.value = false
  }
}
</script>

<template>
  <p v-if="loading" class="state">불러오는 중</p>
  <p v-else-if="errorMessage" class="state error">{{ errorMessage }}</p>

  <div v-else class="process-page">
    <div class="left">
      <ProcessMapCard
        ref="mapCard"
        :crumbs="crumbs"
        :equipment="equipment"
        :offsets="mapOffsets"
        :inactive="mapInactive"
        :sending-fan="sendingFan"
        @select-equipment="onSelectEquipment"
        @fan-apply="onFanApply"
      />
    </div>

    <div class="right">
      <SensorTypeCard :site-name="layout.name" :levels-by-type="levelsByType" />
      <AlarmListCard :alarms="alarms" />
      <InspectionTodayCard :process-name="layout.name" :inspections="inspections" :inspection-route="inspectionRoute" />
    </div>
  </div>

  <AppNotice :message="noticeMessage" />
</template>

<style scoped>
/* 배치: 사업장·공장 화면과 같음 (왼쪽 넓은 열 + 오른쪽 628px 열) */
.process-page {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 628px;
  gap: 16px;
  align-items: start;
}

@media (max-width: 1400px) {
  .process-page {
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
