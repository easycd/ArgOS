<!--
  사업장 선택 화면 (본사 관리자 전용)
  - 화면설계안 js/v-rev.js vRegion() 의 평상시(화재 아님) 화면 기준
  - 배치: 왼쪽 위 지도(SiteMapCard) / 왼쪽 아래 센서 단계(SiteSensorCard) / 오른쪽 목록(SiteListCard)
  - 이 파일은 데이터 불러오기와 화면 이동만 담당, 모양은 features/site 의 각 카드가 담당
  - 이번 범위는 울산공장 5공장만 진입 가능, 나머지는 '준비 중' 안내
-->
<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getActiveFires } from '@/api/emergency'
import { getSites } from '@/api/sites'
import AppNotice from '@/components/AppNotice.vue'
import SiteListCard from '@/features/site/SiteListCard.vue'
import SiteMapCard from '@/features/site/SiteMapCard.vue'
import SiteSensorCard from '@/features/site/SiteSensorCard.vue'
import FireBanner from '@/features/site/FireBanner.vue'
import FirePanel from '@/features/site/FirePanel.vue'
import { useAlertStore } from '@/stores/alert'
import { useLiveReload } from '@/utils/useLiveReload'
import { useNotice } from '@/utils/useNotice'

const router = useRouter()

/** 지금 진입 가능한 사업장·공장 (설계 범위: 울산공장 5공장만) */
const AVAILABLE_SITE_ID = 1
const AVAILABLE_FACTORY_ID = 5

// 사업장 목록 (GET /sites)
const sites = ref([])
const loading = ref(true)
const errorMessage = ref('')

/**
 * 화재 (GET /fires?status=ACTIVE) — 있으면 위에 화재 띠, 오른쪽 목록 자리에 '화재 상세' (화면설계서 C5)
 * - 서버 시각 기준 경과 시간: 응답의 serverTime 과 내 시계 차이를 기억
 */
const fire = ref(null)
let serverOffset = 0

/** 사업장 목록 불러오기 (silent: 상황이 바뀌어 다시 부를 때는 '불러오는 중'을 띄우지 않음) */
async function load({ silent = false } = {}) {
  if (!silent) loading.value = true
  try {
    const [list, fires] = await Promise.all([getSites(), getActiveFires()])
    sites.value = list
    fire.value = fires[0] ?? null
    if (fire.value?.serverTime) serverOffset = new Date(fire.value.serverTime).getTime() - Date.now()
    errorMessage.value = ''
  } catch (error) {
    errorMessage.value = error.message
  } finally {
    loading.value = false
  }
}

onMounted(load)
useLiveReload(load) // 상황(정상·주의 등)이 바뀌면 숫자·색만 다시

/* ───────── 화재 경과 시간 (1초마다) ───────── */
const tick = ref(Date.now())
const timer = setInterval(() => (tick.value = Date.now()), 1000)
onBeforeUnmount(() => clearInterval(timer))
const pad = (n) => String(n).padStart(2, '0')
const serverNow = computed(() => new Date(tick.value + serverOffset))
const elapsed = computed(() => {
  if (!fire.value) return ''
  const sec = Math.max(0, Math.floor((serverNow.value.getTime() - new Date(fire.value.detectedAt).getTime()) / 1000))
  return `${pad(Math.floor(sec / 3600))}:${pad(Math.floor(sec / 60) % 60)}:${pad(sec % 60)}`
})
const nowText = computed(() => serverNow.value.toTimeString().slice(0, 8))

/** '5공장 대시보드로 이동': 그 공정 배치도로 + 화재 대응 창(열람) */
const alert = useAlertStore()
function goFire() {
  const f = fire.value
  router.push({ name: 'process', params: { siteId: f.siteId, factoryId: f.factoryId, processId: f.processId } })
  alert.open('alarm', { alarmId: f.alarmId })
}

// 짧은 안내 문구
const { message: noticeMessage, show: showNotice } = useNotice()

/**
 * 사업장으로 이동 (지도 핀, 도넛 카드, '이동' 버튼) → 사업장 현황 화면
 * - 지금은 울산공장만 들어갈 수 있음
 */
function enterSite(siteId) {
  if (siteId !== AVAILABLE_SITE_ID) {
    const site = sites.value.find((s) => s.id === siteId)
    showNotice(`${site?.name ?? '이 사업장'} 화면은 준비 중입니다. 지금은 울산공장만 볼 수 있습니다.`)
    return
  }
  router.push({ name: 'site-dashboard', params: { siteId } })
}

/** 공장 줄을 눌렀을 때 → 공장 대시보드 (FactoryRow 가 진입 가능한 공장만 이벤트를 보냄) */
function enterFactory(factory) {
  router.push({ name: 'dashboard', params: { siteId: AVAILABLE_SITE_ID, factoryId: factory.id } })
}
</script>

<template>
  <div class="site-select">
    <p v-if="loading" class="state">불러오는 중</p>
    <p v-else-if="errorMessage" class="state error">{{ errorMessage }}</p>

    <template v-else>
      <FireBanner v-if="fire" :fire="fire" :elapsed="elapsed" class="banner" />
      <div class="left">
        <SiteMapCard :sites="sites" :current-id="AVAILABLE_SITE_ID" @select="enterSite" />
        <SiteSensorCard :sites="sites" @select="enterSite" />
      </div>
      <FirePanel v-if="fire" :fire="fire" :now="nowText" @go="goFire" />
      <SiteListCard
        v-else
        :sites="sites"
        :current-site-id="AVAILABLE_SITE_ID"
        :link-factory-id="AVAILABLE_FACTORY_ID"
        @enter="enterSite"
        @enter-factory="enterFactory"
      />
    </template>

    <AppNotice :message="noticeMessage" />
  </div>
</template>

<style scoped>
/* 배치: 왼쪽 700px 열 + 오른쪽 목록 (설계안 1920 화면 기준), 좁은 화면에서는 위아래로 */
.site-select {
  display: grid;
  grid-template-columns: minmax(0, 700px) minmax(0, 1fr);
  gap: 16px;
  align-items: start;
}

@media (max-width: 1200px) {
  .site-select {
    grid-template-columns: minmax(0, 1fr);
  }
}

.banner {
  grid-column: 1 / -1;
}

.left {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.state {
  grid-column: 1 / -1;
  color: var(--color-text-sub);
}

.state.error {
  color: var(--color-level-alarm-text);
}
</style>
