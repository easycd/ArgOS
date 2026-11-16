<!--
  사업장 선택 화면 (본사 관리자 전용)
  - 화면설계안 js/v-rev.js vRegion() 의 평상시(화재 아님) 화면 기준
  - 왼쪽 위: 사업장 지도 / 왼쪽 아래: 전체 사업장 센서 단계 / 오른쪽: 사업장 목록(사업장 → 공장 → 공정 → 센서)
  - 데이터 (지금은 예시 데이터):
    - GET /sites : 지도·도넛·목록 머리줄
    - GET /sites/{siteId}/tree : 목록에서 사업장을 펼칠 때 공장 → 공정 단계
  - 이번 범위는 울산공장 5공장만 진입 가능, 나머지는 '준비 중' 안내
-->
<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { getSiteTree, getSites } from '@/api/sites'
import AppIcon from '@/components/AppIcon.vue'
import LevelBadge from '@/components/LevelBadge.vue'
import KoreaMap from '@/features/site/KoreaMap.vue'
import SensorDonut from '@/features/site/SensorDonut.vue'
import StageBar from '@/features/site/StageBar.vue'
import { factoryLevels, sumLevels, totalOf } from '@/features/site/siteStats'
import { LEVEL, LEVEL_META, SENSOR_STAGES } from '@/types/codes'

const router = useRouter()

/** 지금 진입 가능한 사업장·공장 (설계 범위: 울산공장 5공장만) */
const AVAILABLE_SITE_ID = 1
const AVAILABLE_FACTORY_ID = 5

// 단계 표시용 (정상·주의·경보)
const STAGES = SENSOR_STAGES.map((level) => ({
  level,
  key: LEVEL_META[level].key,
  label: LEVEL_META[level].label,
  color: LEVEL_META[level].color,
}))

// 상태 키 (CSS 클래스 is-normal 등에 사용)
const keyOf = (level) => LEVEL_META[level]?.key ?? 'normal'

/* ───────── 사업장 목록 ───────── */
const sites = ref([])
const loading = ref(true)
const errorMessage = ref('')

onMounted(async () => {
  try {
    sites.value = await getSites()
    // 기본으로 펼쳐 둔 사업장(울산공장)의 공장 목록도 바로 불러옴
    openIds.value.forEach(loadTree)
  } catch (error) {
    errorMessage.value = error.message
  } finally {
    loading.value = false
  }
})

// 전체 사업장 합계 (도넛 카드 머리줄)
const allCounts = computed(() => sumLevels(sites.value.map((s) => s.sensorLevels)))

/* ───────── 펼치기: 사업장별 공장 목록 (처음 펼칠 때 한 번만 불러옴) ───────── */
/** { [siteId]: { loading, error, factories } } */
const trees = ref({})

async function loadTree(siteId) {
  if (trees.value[siteId]?.factories) return
  trees.value[siteId] = { loading: true, error: '', factories: null }
  try {
    const tree = await getSiteTree(siteId)
    trees.value[siteId] = {
      loading: false,
      error: '',
      // 공장 줄의 센서 개수 = 전류·온도·CO 개수 합
      factories: tree.factories.map((f) => ({ ...f, counts: factoryLevels(f) })),
    }
  } catch (error) {
    trees.value[siteId] = { loading: false, error: error.message, factories: null }
  }
}

// 펼침 상태(기본은 울산공장 펼침), 필터(전체 / 주의 이상)
const openIds = ref(new Set([AVAILABLE_SITE_ID]))
const onlyAbnormal = ref(false)
const visibleSites = computed(() =>
  onlyAbnormal.value ? sites.value.filter((s) => s.level !== LEVEL.NORMAL) : sites.value,
)

function toggleOpen(siteId) {
  const next = new Set(openIds.value)
  if (next.has(siteId)) {
    next.delete(siteId)
  } else {
    next.add(siteId)
    loadTree(siteId)
  }
  openIds.value = next
}

/** 공정 이름은 표에서 짧게: '도장 공정' → '도장' (설계안 표 모양) */
const shortName = (name) => name.replace(/ 공정$/, '')

// 짧은 안내 문구 (3초 뒤 사라짐)
const notice = ref('')
let noticeTimer = null
function showNotice(text) {
  notice.value = text
  clearTimeout(noticeTimer)
  noticeTimer = setTimeout(() => (notice.value = ''), 3000)
}
onBeforeUnmount(() => clearTimeout(noticeTimer))

/**
 * 사업장으로 이동 (지도 핀, 도넛 카드, '이동' 버튼)
 * - 설계안: 울산공장 → 울산공장(사업장) 현황 화면
 * - TODO: 사업장 현황 화면(GET /sites/{siteId}/overview)이 생기면 그쪽으로.
 *         지금은 진입 가능한 5공장 대시보드로 이동
 */
function enterSite(siteId) {
  if (siteId !== AVAILABLE_SITE_ID) {
    const site = sites.value.find((s) => s.id === siteId)
    showNotice(`${site?.name ?? '이 사업장'} 화면은 준비 중입니다. 지금은 울산공장만 볼 수 있습니다.`)
    return
  }
  router.push({ name: 'dashboard', params: { factoryId: AVAILABLE_FACTORY_ID } })
}

/** 공장 줄을 눌렀을 때: 진입 가능한 공장(5공장)만 이동 */
function enterFactory(factory) {
  if (factory.id !== AVAILABLE_FACTORY_ID) return
  router.push({ name: 'dashboard', params: { factoryId: factory.id } })
}
</script>

<template>
  <div class="site-select">
    <p v-if="loading" class="state">불러오는 중</p>
    <p v-else-if="errorMessage" class="state error">{{ errorMessage }}</p>

    <template v-else>
      <!-- 왼쪽 열 -->
      <div class="left">
        <!-- 사업장 지도 -->
        <section class="card">
          <header class="card-head">
            <h3>사업장 지도</h3>
            <span class="sub">사업장을 누르면 이동</span>
            <div class="right">
              <span v-for="s in STAGES" :key="s.level" class="legend">
                <i :style="{ borderColor: s.color }" />{{ s.label }}
              </span>
            </div>
          </header>
          <KoreaMap :sites="sites" :current-id="AVAILABLE_SITE_ID" @select="enterSite" />
        </section>

        <!-- 전체 사업장 센서 단계 -->
        <section class="card">
          <header class="card-head">
            <h3>전체 사업장 센서 단계</h3>
            <span class="sub">{{ sites.length }}곳 · 센서 {{ totalOf(allCounts) }}개</span>
            <div class="right">
              <span
                v-for="s in STAGES"
                :key="s.level"
                class="count"
                :class="{ [`is-${s.key}`]: s.level !== LEVEL.NORMAL && allCounts[s.level] }"
              >
                <i :style="{ background: s.color }" />{{ s.label }} <b class="mono">{{ allCounts[s.level] }}</b>
              </span>
            </div>
          </header>
          <div class="donuts">
            <button
              v-for="site in sites"
              :key="site.id"
              type="button"
              class="donut-card"
              :class="`is-${keyOf(site.level)}`"
              @click="enterSite(site.id)"
            >
              <SensorDonut :counts="site.sensorLevels" label="센서" />
              <b>{{ site.name }}</b>
              <span class="mono code">{{ site.code }}</span>
              <span class="donut-list">
                <span v-for="s in STAGES" :key="s.level">
                  <i :style="{ background: s.color }" />{{ s.label }}
                  <b class="mono" :class="{ [`is-${s.key}`]: s.level !== LEVEL.NORMAL && site.sensorLevels[s.level] }">
                    {{ site.sensorLevels[s.level] }}
                  </b>
                </span>
              </span>
            </button>
          </div>
        </section>
      </div>

      <!-- 오른쪽: 사업장 목록 -->
      <section class="card list-card">
        <header class="card-head">
          <h3>사업장 목록</h3>
          <span class="sub">{{ sites.length }}곳 · 사업장 → 공장 → 공정 → 센서</span>
          <div class="right">
            <span class="seg">
              <button type="button" :class="{ on: !onlyAbnormal }" @click="onlyAbnormal = false">전체</button>
              <button type="button" :class="{ on: onlyAbnormal }" @click="onlyAbnormal = true">주의 이상</button>
            </span>
          </div>
        </header>

        <div class="site-list">
          <div v-if="visibleSites.length === 0" class="empty">
            <AppIcon name="check" :size="28" />
            <b>주의 이상인 사업장이 없습니다</b>
            모든 사업장이 정상입니다.
          </div>

          <div
            v-for="site in visibleSites"
            :key="site.id"
            class="site"
            :class="[`is-${keyOf(site.level)}`, { open: openIds.has(site.id), current: site.id === AVAILABLE_SITE_ID }]"
          >
            <!-- 사업장 줄 (누르면 펼치기/접기) -->
            <div
              class="site-head"
              role="button"
              tabindex="0"
              :aria-expanded="openIds.has(site.id)"
              @click="toggleOpen(site.id)"
              @keydown.enter="toggleOpen(site.id)"
            >
              <AppIcon name="cr" :size="16" class="chev" />
              <div class="name">
                <b>{{ site.name }}</b>
                <LevelBadge :level="site.level" />
                <span class="mono code">{{ site.code }}</span>
              </div>
              <div class="loc">
                <AppIcon name="pin" :size="15" />
                <span>{{ site.address }}</span>
                <span class="mono">{{ site.lat.toFixed(4) }}°N, {{ site.lng.toFixed(4) }}°E</span>
              </div>
              <div class="counts">
                <span
                  v-for="s in STAGES"
                  :key="s.level"
                  :class="{ [`is-${s.key}`]: s.level !== LEVEL.NORMAL && site.sensorLevels[s.level] }"
                >
                  <i :style="{ background: s.color }" />{{ s.label }}<b class="mono">{{ site.sensorLevels[s.level] }}</b>
                </span>
              </div>
              <button
                type="button"
                class="btn"
                :class="{ 'btn-primary': site.id === AVAILABLE_SITE_ID }"
                @click.stop="enterSite(site.id)"
              >
                이동 <AppIcon name="arrow" :size="16" />
              </button>
            </div>

            <!-- 공장 표 (펼쳤을 때) -->
            <div class="site-body">
              <div class="table">
                <div class="th">
                  <span>공장</span>
                  <span>공정별 단계</span>
                  <span>센서 단계 (정상 · 주의 · 경보)</span>
                  <span>오늘 알림</span>
                </div>
                <p v-if="trees[site.id]?.loading" class="tree-state">불러오는 중</p>
                <p v-else-if="trees[site.id]?.error" class="tree-state error">{{ trees[site.id].error }}</p>
                <div
                  v-for="factory in trees[site.id]?.factories ?? []"
                  :key="factory.id"
                  class="tr"
                  :class="[`is-${keyOf(factory.level)}`, { link: factory.id === AVAILABLE_FACTORY_ID }]"
                  :role="factory.id === AVAILABLE_FACTORY_ID ? 'button' : undefined"
                  :tabindex="factory.id === AVAILABLE_FACTORY_ID ? 0 : undefined"
                  @click="enterFactory(factory)"
                  @keydown.enter="enterFactory(factory)"
                >
                  <span class="fname">
                    <i :style="{ background: LEVEL_META[factory.level].color }" />{{ factory.name }}
                  </span>
                  <span class="procs">
                    <em v-for="p in factory.processes" :key="p.id" :class="`is-${keyOf(p.level)}`">
                      <i />{{ shortName(p.name) }}
                    </em>
                  </span>
                  <span class="stages">
                    <StageBar :counts="factory.counts" />
                    <b class="mono">{{ factory.counts[LEVEL.NORMAL] }}</b>
                    <b class="mono" :class="{ 'is-warn': factory.counts[LEVEL.WARN] }">{{ factory.counts[LEVEL.WARN] }}</b>
                    <b class="mono" :class="{ 'is-alarm': factory.counts[LEVEL.ALARM] }">{{ factory.counts[LEVEL.ALARM] }}</b>
                  </span>
                  <span class="mono alarms">{{ factory.todayAlarmCount }}건</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </template>

    <!-- 안내 문구 -->
    <p v-if="notice" class="notice" role="status">
      <AppIcon name="info" :size="16" />{{ notice }}
    </p>
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

.state {
  grid-column: 1 / -1;
  color: var(--color-text-sub);
}

.state.error {
  color: var(--color-level-alarm-text);
}

.left {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* 카드 (설계안 .card / .ch) */
.card {
  background: var(--color-surface);
  border: 1px solid var(--color-border-card);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.card-head {
  height: 48px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 20px;
  border-bottom: 1px solid var(--color-border);
  white-space: nowrap;
}

.card-head h3 {
  font-size: 16px;
  font-weight: 700;
  letter-spacing: -0.2px;
}

.card-head .sub {
  font-size: 13px;
  color: var(--color-text-weak);
}

.card-head .right {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  color: var(--color-text-sub);
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

.count {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12.5px;
}

.count i,
.counts i {
  width: 8px;
  height: 8px;
  border-radius: 2px;
}

.count b {
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text);
}

/* 주의·경보 개수가 있으면 숫자를 상태 색으로 */
.count.is-warn b,
.counts .is-warn b,
b.is-warn {
  color: var(--color-level-warn-text);
}

.count.is-alarm b,
.counts .is-alarm b,
b.is-alarm {
  color: var(--color-level-alarm-text);
}

/* 전체 사업장 센서 단계: 사업장별 도넛 카드 */
.donuts {
  display: flex;
  gap: 12px;
  padding: 16px 20px 18px;
}

.donut-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px 16px 12px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: #fff;
  cursor: pointer;
  transition:
    border-color 0.15s,
    box-shadow 0.15s,
    transform 0.15s;
}

.donut-card:hover {
  border-color: #93c5fd;
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.08);
}

.donut-card.is-warn {
  border-color: var(--color-level-warn);
  background: #fff7ed;
}

.donut-card.is-alarm {
  border-color: var(--color-level-alarm);
  background: #fef2f2;
}

.donut-card > b {
  margin-top: 10px;
  font-size: 15px;
}

.code {
  font-size: 11.5px;
  color: var(--color-text-weak);
}

.donut-list {
  align-self: stretch;
  margin-top: 10px;
  display: flex;
  flex-direction: column;
  gap: 5px;
  font-size: 12.5px;
  color: var(--color-text-sub);
}

.donut-list > span {
  display: flex;
  align-items: center;
  gap: 6px;
}

.donut-list i {
  width: 8px;
  height: 8px;
  border-radius: 2px;
}

.donut-list b {
  margin-left: auto;
  color: var(--color-text);
}

/* 구분 버튼 (전체 / 주의 이상) */
.seg {
  display: inline-flex;
  padding: 3px;
  border-radius: var(--radius-sm);
  background: #f1f5f9;
}

.seg button {
  padding: 5px 12px;
  border: none;
  border-radius: var(--radius-xs);
  background: none;
  font-size: 13px;
  font-weight: 500;
  color: var(--color-text-sub);
  cursor: pointer;
}

.seg button.on {
  background: #fff;
  color: var(--color-text);
  font-weight: 700;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.12);
}

/* 사업장 목록 */
.site-list {
  padding: 16px 20px;
}

.site {
  margin-bottom: 12px;
  border: 1px solid var(--color-border-card);
  border-radius: var(--radius-md);
  background: #fff;
  overflow: hidden;
}

.site.current {
  border: 1.5px solid var(--color-primary);
}

.site.is-warn {
  border-color: var(--color-level-warn);
}

.site.is-alarm {
  border-color: var(--color-level-alarm);
}

.site-head {
  height: 76px;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 0 16px 0 14px;
  cursor: pointer;
}

.site-head:hover {
  background: var(--color-surface-sub);
}

.chev {
  color: var(--color-text-weak);
  transition: transform 0.2s ease-out;
}

.site.open .chev {
  transform: rotate(90deg);
}

.name {
  width: 230px;
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}

.name b {
  font-size: 18px;
}

.name .code {
  padding: 1px 6px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xs);
  font-size: 12px;
}

.loc {
  position: relative;
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding-left: 22px;
  font-size: 13px;
  color: var(--color-text-sub);
  white-space: nowrap;
}

.loc span {
  overflow: hidden;
  text-overflow: ellipsis;
}

.loc .app-icon {
  position: absolute;
  left: 0;
  top: 2px;
  color: var(--color-text-weak);
}

.loc .mono {
  font-size: 12px;
  color: var(--color-text-weak);
}

.counts {
  display: flex;
  gap: 14px;
  font-size: 12.5px;
  color: var(--color-text-sub);
  white-space: nowrap;
}

.counts span {
  display: flex;
  align-items: center;
  gap: 5px;
}

.counts b {
  font-size: 16px;
  font-weight: 600;
  color: var(--color-text);
}

.site-head .btn {
  height: 38px;
  padding: 0 14px;
}

/* 펼침: 높이 0 ↔ 내용 높이 (설계안과 같은 grid 방식) */
.site-body {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 0.28s cubic-bezier(0.2, 0.8, 0.2, 1);
}

.site.open .site-body {
  grid-template-rows: 1fr;
}

.table {
  min-height: 0;
  overflow: hidden;
}

.th,
.tr {
  display: grid;
  grid-template-columns: 190px 1fr 330px 80px;
  align-items: center;
  gap: 12px;
  padding: 0 16px 0 44px;
}

.th {
  height: 34px;
  background: var(--color-surface-sub);
  border-top: 1px solid var(--color-border);
  font-size: 12px;
  font-weight: 600;
  color: var(--color-text-weak);
}

.th span:last-child,
.alarms {
  text-align: right;
}

.tr {
  height: 46px;
  border-top: 1px solid #f1f5f9;
  font-size: 14px;
}

.tr.link {
  cursor: pointer;
}

.tr.link:hover {
  background: var(--color-surface-sub);
}

.tr.is-warn {
  background: #fff7ed;
}

.tr.is-alarm {
  background: #fef2f2;
}

.fname {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  white-space: nowrap;
}

.fname i {
  width: 9px;
  height: 9px;
  border-radius: 50%;
}

.procs {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.procs em {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 2px 8px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-xs);
  background: #fff;
  font-size: 12.5px;
  font-style: normal;
  color: var(--color-text-sub);
  white-space: nowrap;
}

.procs em i {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--color-level-normal);
}

.procs em.is-warn {
  border-color: var(--color-level-warn);
  background: var(--color-level-warn-soft);
  color: var(--color-level-warn-text);
  font-weight: 700;
}

.procs em.is-warn i {
  background: var(--color-level-warn);
}

.procs em.is-alarm,
.procs em.is-fire {
  border-color: var(--color-level-alarm);
  background: var(--color-level-alarm-soft);
  color: var(--color-level-alarm-text);
  font-weight: 700;
}

.procs em.is-alarm i,
.procs em.is-fire i {
  background: var(--color-level-alarm);
}

.stages {
  display: flex;
  align-items: center;
  gap: 10px;
}

.stages b {
  width: 26px;
  text-align: right;
  font-size: 13px;
  font-weight: 600;
  color: var(--color-text-sub);
}

.alarms {
  font-size: 13px;
  color: var(--color-text-sub);
}

.tree-state {
  padding: 12px 16px 12px 44px;
  border-top: 1px solid #f1f5f9;
  font-size: 13px;
  color: var(--color-text-sub);
}

.tree-state.error {
  color: var(--color-level-alarm-text);
}

.empty {
  height: 260px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 13px;
  color: var(--color-text-sub);
}

.empty .app-icon {
  color: var(--color-level-normal);
}

.empty b {
  font-size: 15px;
  color: var(--color-text);
}

/* 안내 문구 (화면 아래 가운데) */
.notice {
  position: fixed;
  left: 50%;
  bottom: 32px;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  border-radius: var(--radius-md);
  background: var(--color-text);
  color: #fff;
  font-size: 14px;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.2);
  animation: softin 0.2s both;
  z-index: 20;
}
</style>
