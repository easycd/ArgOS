<!--
  센서 데이터 · 열화상 확인 창 (화면설계안 js/v-modals.js mThermal())
  - 주의 상세의 '센서 데이터 · 열화상 확인' 단추로 열림 (화면설계서 C2 는 주의 상세 가운데 단으로 합침 → 설계안을 따름)
  - 왼쪽: 주의 발생 시점 열화상 1장(저장된 사진) + 최고 온도 위치 / 최고·평균 / 평소 같은 위치
  - 오른쪽: 그때 센서 3종 값·기준·단계 + 전류 추이
  - '주의 상세로 돌아가기', '확인' 모두 주의 상세로
-->
<script setup>
import { computed, onMounted, ref } from 'vue'
import MiniTrend from './MiniTrend.vue'
import { getAlarmDetail } from '@/api/alarms'
import AppIcon from '@/components/AppIcon.vue'
import BaseModal from '@/components/BaseModal.vue'
import ThermalImage from '@/features/equipment/ThermalImage.vue'
import SensorRing from '@/features/process/SensorRing.vue'
import { useAlertStore } from '@/stores/alert'
import { LEVEL_META, sensorTypeOf } from '@/types/codes'

const props = defineProps({
  alarmId: { type: Number, required: true },
})

const alert = useAlertStore()
const detail = ref(null)
const errorMessage = ref('')

onMounted(async () => {
  try {
    detail.value = await getAlarmDetail(props.alarmId)
  } catch (error) {
    errorMessage.value = error.message
  }
})

const time = computed(() => detail.value?.raisedAt.slice(11, 19) ?? '')
const fmt = (s) => Number(s.value).toFixed(sensorTypeOf(s.type)?.dec ?? 0)
const back = () => alert.open('detail', { alarmId: props.alarmId })
</script>

<template>
  <BaseModal :width="1180" label="센서 데이터 · 열화상 확인" @close="alert.close()">
    <template #default="{ close }">
      <div class="m-head">
        <span class="m-chip warn big"><AppIcon name="tri" :size="15" />2단계 주의</span>
        <h2>센서 데이터 · 열화상 확인</h2>
        <span class="loc">{{ detail?.location }}</span>
        <button type="button" class="m-close" aria-label="닫기" @click="close"><AppIcon name="x" /></button>
      </div>

      <p v-if="errorMessage" class="state">{{ errorMessage }}</p>
      <p v-else-if="!detail" class="state">불러오는 중</p>

      <div v-else class="cols">
        <section>
          <div class="m-sect"><AppIcon name="cam" :size="15" />열화상 이미지 <small>주의 발생 시점 1장</small></div>
          <ThermalImage
            class="gap img"
            :image-url="detail.thermal.imageUrl"
            :max="detail.thermal.max"
            :max-point="detail.thermal.maxPoint"
            max-label="최고 온도"
            :label-offset="{ x: -160, y: 36 }"
            :live="false"
            :zone-name="`${detail.thermal.cameraTag} · 도장 공정`"
            :time="time"
          />
          <div class="facts">
            <div class="m-box"><small>최고 온도 위치</small><b>{{ detail.thermal.zoneName }}</b></div>
            <div class="m-box"><small>최고 / 평균</small><b class="mono">{{ detail.thermal.max.toFixed(1) }} ℃ / {{ detail.thermal.avg.toFixed(1) }} ℃</b></div>
            <div class="m-box"><small>평소 같은 위치</small><b class="mono">{{ detail.thermal.usualAtMax.toFixed(1) }} ℃</b></div>
          </div>
        </section>

        <section>
          <div class="m-sect"><AppIcon name="chart" :size="15" />센서 데이터 <small>{{ time }} 기준</small></div>
          <div class="m-box gap">
            <div v-for="s in detail.sensors" :key="s.tag" class="vrow">
              <SensorRing :sensor="s" :size="46" />
              <div class="n">{{ sensorTypeOf(s.type)?.label }}<b class="mono">{{ s.tag }}</b></div>
              <div class="v mono" :class="`is-${LEVEL_META[s.level]?.key}`">{{ fmt(s) }}<small>{{ s.unit }}</small></div>
              <div class="th">주의 {{ s.warn }} · 경보 {{ s.alarm }}</div>
              <span class="m-chip" :class="LEVEL_META[s.level]?.key === 'normal' ? 'ok' : LEVEL_META[s.level]?.key">
                {{ LEVEL_META[s.level]?.label }}
              </span>
            </div>
          </div>
          <MiniTrend class="gap-s" :trend="detail.trend" title="전류 추이" :sub="`${detail.rule.sensorTag} · 최근 40분`" :height="204" />
          <div class="m-actions buttons">
            <button type="button" class="btn" @click="back"><AppIcon name="cl" :size="16" />주의 상세로 돌아가기</button>
            <button type="button" class="btn btn-primary" @click="back">확인</button>
          </div>
        </section>
      </div>
    </template>
  </BaseModal>
</template>

<style scoped>
.state {
  padding: 60px 28px;
  text-align: center;
  color: var(--color-text-sub);
}

/* 설계안: 왼쪽 620 · 오른쪽 472 */
.cols {
  display: grid;
  grid-template-columns: 620px 1fr;
  gap: 32px;
  padding: 20px 28px 28px;
}

.gap {
  margin-top: 10px;
}

.gap-s {
  margin-top: 12px;
}

.img {
  /* 사진이 뜰 때 200ms 투명도 (화면설계서 C2) */
  animation: softin 200ms ease-out both;
}

.facts {
  display: flex;
  gap: 10px;
  margin-top: 14px;
}

.facts > div {
  flex: 1;
  padding: 10px 14px;
}

.facts small {
  display: block;
  font-size: 12px;
  color: #64748b;
}

.facts b {
  font-size: 14px;
}

/* 센서 한 줄 (설계안 .vrow) */
.vrow {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border-bottom: 1px solid #f1f5f9;
}

.vrow:last-child {
  border-bottom: none;
}

.n {
  width: 64px;
  font-size: 13px;
  color: var(--color-text-sub);
}

.n b {
  display: block;
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text-weak);
}

.v {
  width: 104px;
  font-size: 22px;
  font-weight: 600;
}

.v small {
  margin-left: 3px;
  font-family: var(--font-sans);
  font-size: 12px;
  font-weight: 500;
  color: var(--color-text-weak);
}

.v.is-warn {
  color: var(--color-level-warn-text);
}

.v.is-alarm {
  color: var(--color-level-alarm-text);
}

.th {
  flex: 1;
  font-size: 12px;
  color: #64748b;
  white-space: nowrap;
}

.buttons {
  margin-top: 14px;
}

.buttons .btn {
  flex: 1;
  height: 46px;
}
</style>
