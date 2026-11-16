<!--
  배기팬 창 (설계안 js/v-rev.js fanPop() 기준): 회전수·전류·상태, 켜기/끄기, 회전수 설정
  - '적용'을 누르면 apply 이벤트({ power, rpm }) — 실제 명령은 페이지가 API 로 보냄
  - 예시 데이터 모드에서는 실제 설비가 움직이지 않음 (모양과 예시 동작만)
  - 설정 범위: 600 ~ 1,800 rpm (명세서), 정격 1,180 rpm
-->
<script setup>
import { computed, ref, watch } from 'vue'
import AppIcon from '@/components/AppIcon.vue'

const props = defineProps({
  /** 화면용 설비 하나 { name, fan: { power, rpm }, sensors } */
  equipment: { type: Object, required: true },
  /** 창 위치 (배치도 칸 안 px) */
  position: { type: Object, required: true },
  /** 명령 보내는 중 */
  sending: { type: Boolean, default: false },
})

const emit = defineEmits(['apply', 'detail', 'close'])

const MIN_RPM = 600
const MAX_RPM = 1800
const RATED_RPM = 1180

// 창 안에서 바꾸는 값 (적용 전까지는 화면에서만)
const power = ref(props.equipment.fan.power)
const rpm = ref(props.equipment.fan.rpm)
watch(
  () => props.equipment,
  (eq) => {
    power.value = eq.fan.power
    rpm.value = eq.fan.rpm
  },
)

const isOn = computed(() => power.value === 'ON')
const changed = computed(() => power.value !== props.equipment.fan.power || rpm.value !== props.equipment.fan.rpm)

// 이 팬의 전류 센서 (예: CT-17)
const currentSensor = computed(() => props.equipment.sensors.find((s) => s.type === 'CURRENT'))

/** 전류 예상값: 꺼지면 0, 회전수를 바꾸면 비율만큼 (설계안과 같은 계산, 화면 표시용) */
const current = computed(() => {
  const s = currentSensor.value
  if (!s) return '–'
  if (!isOn.value) return '0.0'
  return ((s.value * rpm.value) / props.equipment.fan.rpm).toFixed(1)
})

// 창이 배치도 밖으로 나가지 않게 위치 조정은 부모 칸 기준으로 간단히
const style = computed(() => ({
  left: `${Math.max(16, props.position.x + 18)}px`,
  top: `${Math.max(16, props.position.y - 60)}px`,
}))
</script>

<template>
  <div class="fan-popover" :style="style" @click.stop>
    <div class="head">
      <span class="icon" :class="{ spin: isOn }" :style="{ animationDuration: `${(1100 / rpm).toFixed(2)}s` }">
        <AppIcon name="fan" :size="22" />
      </span>
      <div>
        <b>{{ equipment.name }} 배기팬</b>
        <small class="mono">{{ currentSensor?.tag ?? '' }} · 환기(배기)</small>
      </div>
      <button type="button" class="close" aria-label="닫기" @click="emit('close')"><AppIcon name="x" /></button>
    </div>

    <div class="values">
      <div>
        <span>회전수</span>
        <b class="mono" :class="{ off: !isOn }">{{ isOn ? rpm.toLocaleString() : 0 }}<small>rpm</small></b>
      </div>
      <div>
        <span>전류</span>
        <b class="mono">{{ current }}<small>A</small></b>
      </div>
      <div>
        <span>상태</span>
        <b class="state" :class="{ off: !isOn }">{{ isOn ? '가동 중' : '정지' }}</b>
      </div>
    </div>

    <div class="row">
      <span>가동</span>
      <span class="switch">
        <button type="button" :class="{ on: isOn }" @click="power = 'ON'">ON</button>
        <button type="button" :class="{ on: !isOn, off: !isOn }" @click="power = 'OFF'">OFF</button>
      </span>
    </div>

    <div class="row" :class="{ dis: !isOn }">
      <span>회전수 설정</span>
      <input v-model.number="rpm" type="range" :min="MIN_RPM" :max="MAX_RPM" step="20" :disabled="!isOn" aria-label="회전수" />
      <b class="mono">{{ rpm }}</b>
    </div>
    <div class="scale mono">
      <span>{{ MIN_RPM }}</span><span>정격 {{ RATED_RPM.toLocaleString() }}</span><span>{{ MAX_RPM.toLocaleString() }}</span>
    </div>

    <div class="buttons">
      <button type="button" class="btn" @click="emit('detail')">설비 상세</button>
      <button
        type="button"
        class="btn"
        :class="{ 'btn-primary': changed }"
        :disabled="!changed || sending"
        @click="emit('apply', { power, rpm })"
      >
        {{ sending ? '보내는 중' : changed ? '적용' : '바꾼 값 없음' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.fan-popover {
  position: absolute;
  z-index: 6;
  width: 320px;
  padding: 16px;
  background: #fff;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  box-shadow:
    0 14px 40px rgba(15, 23, 42, 0.18),
    0 2px 8px rgba(15, 23, 42, 0.08);
  animation: softin 0.15s both;
}

.head {
  display: flex;
  align-items: center;
  gap: 10px;
}

.head b {
  display: block;
  font-size: 15px;
}

.head small {
  font-size: 11.5px;
  color: var(--color-text-weak);
}

.icon {
  width: 38px;
  height: 38px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: var(--color-primary-soft);
  color: var(--color-primary);
}

/* 켜져 있으면 회전수에 맞춰 돌아감 */
.icon.spin .app-icon {
  animation: spin linear infinite;
  animation-duration: inherit;
}

.close {
  margin-left: auto;
  display: grid;
  padding: 0;
  border: none;
  background: none;
  color: var(--color-text-weak);
  cursor: pointer;
}

.values {
  display: flex;
  margin-top: 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
}

.values > div {
  flex: 1;
  padding: 9px 12px;
  border-right: 1px solid var(--color-border);
}

.values > div:last-child {
  border: none;
}

.values span {
  display: block;
  font-size: 11.5px;
  color: var(--color-text-weak);
}

.values b {
  display: block;
  margin-top: 2px;
  font-size: 20px;
  font-weight: 600;
  white-space: nowrap;
}

.values b.off {
  color: var(--color-text-weak);
}

.values b.state {
  font-size: 15px;
  color: var(--color-level-normal-text);
}

.values b.state.off {
  color: #64748b;
}

.values small {
  margin-left: 3px;
  font-family: var(--font-sans);
  font-size: 11px;
  font-weight: 500;
  color: var(--color-text-weak);
}

.row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 14px;
  font-size: 13px;
  color: var(--color-text-sub);
  transition: opacity 0.2s;
}

.row.dis {
  opacity: 0.4;
}

.row > span:first-child {
  width: 76px;
  flex: none;
}

.row input {
  flex: 1;
  min-width: 0;
  height: 20px;
  accent-color: var(--color-primary);
}

.row b {
  width: 42px;
  text-align: right;
  font-size: 13px;
  color: var(--color-text);
}

/* ON / OFF 스위치 */
.switch {
  display: inline-flex;
  overflow: hidden;
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-sm);
}

.switch button {
  padding: 6px 18px;
  border: none;
  background: #fff;
  font-family: var(--font-mono);
  font-size: 12.5px;
  font-weight: 600;
  color: var(--color-text-weak);
  cursor: pointer;
}

.switch button.on {
  background: var(--color-level-normal);
  color: #fff;
}

.switch button.on.off {
  background: #64748b;
}

.scale {
  display: flex;
  justify-content: space-between;
  margin: 2px 54px 0 88px;
  font-size: 10.5px;
  color: var(--color-text-weak);
}

.buttons {
  display: flex;
  gap: 8px;
  margin-top: 16px;
}

.buttons .btn {
  height: 38px;
}

.buttons .btn:last-child {
  flex: 1;
}
</style>
