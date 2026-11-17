<!--
  '열화상 카메라' 카드 (설계안 js/lib.js irBox(), vEquip() 열화상)
  - 제목줄 오른쪽: 이 설비 구역의 최고 · 최저 온도 (구역이 정해지지 않은 설비는 없음)
  - 그림: LIVE 표시 + 구역 이름, 오른쪽 색 눈금(20~120 ℃), 최고 온도 지점 표시와 값
  - 아래: 구역 설명 + 마지막 수신 시각
  - 움직임 (설계안 extra.css): LIVE 점 깜빡임 1.2초, 최고 지점 표시 퍼짐 1.4초, 그림 밝기 살짝 일렁임 3초
-->
<script setup>
import { computed } from 'vue'
import BaseCard from '@/components/BaseCard.vue'
import colorBar from '@/assets/images/thermal/ir_bar.png'
import { LEVEL } from '@/types/codes'

const props = defineProps({
  /** GET /thermal/{cameraId}/latest 응답 */
  thermal: { type: Object, required: true },
  /** 설비 단계 (최고 온도 글자 색) */
  level: { type: String, required: true },
  /** 화면을 연 뒤 지난 초 (실시간 갱신 흉내: 촬영 시각에 더해 보여 줌) */
  elapsedSec: { type: Number, default: 0 },
})

const hot = computed(() => props.level !== LEVEL.NORMAL)

/** 마지막 수신 시각 'HH:mm:ss' (촬영 시각 + 지난 초) */
const time = computed(() => {
  const d = new Date(props.thermal.capturedAt)
  d.setSeconds(d.getSeconds() + props.elapsedSec)
  return d.toTimeString().slice(0, 8)
})

// 최고 지점 위치 (그림 안 비율 → %)
const point = computed(() => {
  const p = props.thermal.maxPoint
  return p ? { left: `${p.x * 100}%`, top: `${p.y * 100}%` } : null
})
</script>

<template>
  <BaseCard title="열화상 카메라" :sub="`도장 공정 ${thermal.tag}`">
    <template v-if="thermal.max != null" #actions>
      <span>최고&nbsp;<b class="mono temp" :class="{ hot }">{{ thermal.max }} ℃</b></span>
      <span>최저&nbsp;<b class="mono temp">{{ thermal.min }} ℃</b></span>
    </template>

    <div class="body">
      <div class="ir">
        <img class="frame" :src="thermal.imageUrl" alt="열화상 카메라 최신 장면" />
        <div class="tl">
          <span class="tag"><i />LIVE</span>
          <span class="tag name">{{ thermal.zone?.name ?? '도장 공정 전체' }}</span>
        </div>
        <!-- 색 눈금 -->
        <div class="bar"><img :src="colorBar" alt="" /></div>
        <span class="bt top">{{ thermal.scale.max }}℃</span>
        <span class="bt bottom">{{ thermal.scale.min }}℃</span>
        <!-- 최고 온도 지점: 네모 표시 + 왼쪽 아래에 값 (설계안 mlx -150, mly +30) -->
        <template v-if="point">
          <div class="mk" :style="point" />
          <div class="ml" :style="{ left: `calc(${point.left} - 150px)`, top: `calc(${point.top} + 30px)` }">
            <small>최고</small>{{ thermal.max }} ℃
          </div>
        </template>
      </div>
      <div class="foot">
        <span>{{ thermal.zone?.desc ?? '공정마다 열화상 카메라 1대로 전체를 봅니다' }}</span>
        <span class="mono">{{ time }}</span>
      </div>
    </div>
  </BaseCard>
</template>

<style scoped>
.temp {
  font-size: 15px;
  color: var(--color-text);
}

.temp.hot {
  color: var(--color-level-warn-text);
}

.body {
  padding: 16px 20px 0;
}

/* 설계안 .ir: 428 × 321 (4:3) */
.ir {
  position: relative;
  aspect-ratio: 4 / 3;
  border-radius: var(--radius-sm);
  overflow: hidden;
  background: #0b0720;
}

.frame {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  animation: ir-flick 3s ease-in-out infinite;
}

.tl {
  position: absolute;
  left: 10px;
  top: 10px;
  display: flex;
  gap: 6px;
}

.tag {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 3px 8px;
  border-radius: var(--radius-sm);
  background: rgba(2, 6, 23, 0.62);
  color: #fff;
  font-family: var(--font-mono);
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
}

.tag.name {
  font-family: var(--font-sans);
}

.tag i {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #ef4444;
  animation: ir-blink 1.2s steps(2, jump-none) infinite;
}

.bar {
  position: absolute;
  right: 10px;
  top: 36px;
  bottom: 36px;
  width: 10px;
  border: 1px solid rgba(255, 255, 255, 0.5);
  border-radius: 5px;
  overflow: hidden;
}

.bar img {
  display: block;
  width: 100%;
  height: 100%;
}

.bt {
  position: absolute;
  right: 26px;
  font-family: var(--font-mono);
  font-size: 10px;
  color: #fff;
  text-shadow: 0 1px 2px #000;
}

.bt.top {
  top: 34px;
}

.bt.bottom {
  bottom: 34px;
}

/* 최고 온도 지점: 흰 네모 + 위아래 짧은 선 */
.mk {
  position: absolute;
  width: 44px;
  height: 44px;
  margin: -22px 0 0 -22px;
  border: 2px solid #fff;
  border-radius: var(--radius-sm);
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.5);
  animation: ir-mark 1.4s ease-in-out infinite;
}

.mk::before,
.mk::after {
  content: '';
  position: absolute;
  left: 50%;
  width: 2px;
  height: 8px;
  margin-left: -1px;
  background: #fff;
}

.mk::before {
  top: -8px;
}

.mk::after {
  bottom: -8px;
}

.ml {
  position: absolute;
  padding: 3px 9px;
  border-radius: 7px;
  background: #fff;
  color: var(--color-text);
  font-family: var(--font-mono);
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
}

.ml small {
  margin-right: 5px;
  font-family: var(--font-sans);
  font-size: 11px;
  font-weight: 500;
  color: var(--color-text-sub);
}

.foot {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  padding: 9px 0 16px;
  font-size: 12.5px;
  color: #64748b;
}

@keyframes ir-blink {
  50% {
    opacity: 0;
  }
}

@keyframes ir-mark {
  0%,
  100% {
    box-shadow:
      0 0 0 1px rgba(0, 0, 0, 0.5),
      0 0 0 0 rgba(255, 255, 255, 0.6);
  }
  50% {
    box-shadow:
      0 0 0 1px rgba(0, 0, 0, 0.5),
      0 0 0 8px rgba(255, 255, 255, 0);
  }
}

@keyframes ir-flick {
  0%,
  100% {
    filter: brightness(1);
  }
  50% {
    filter: brightness(1.06) saturate(1.08);
  }
}

/* 움직임 줄이기: 반복 움직임 멈춤 */
@media (prefers-reduced-motion: reduce) {
  .frame,
  .tag i,
  .mk {
    animation: none;
  }
}
</style>
