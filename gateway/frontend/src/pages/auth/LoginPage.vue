<!--
  로그인 화면 (화면설계안 _design/화면설계안_소스/js/v-login.js, css/views.css .v-login 기준)
  - 배경: 설계안 기본 시안(1번, 선으로 그린 공장 단지)을 그대로 이미지로 사용
  - 가운데 카드: 아이디·비밀번호, 아이디 저장, 비밀번호 재설정 안내, 로그인 버튼, 권한 안내
  - 로그인 성공 → 불러오기 화면(스플래시) → 권한별 첫 화면 (router/index.js 의 homeRouteOf)
  - 공정 담당자(WORKER)는 모바일 앱을 쓰므로 웹 로그인 차단
-->
<script setup>
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { USE_MOCK } from '@/api/mock'
import AppIcon from '@/components/AppIcon.vue'
import { homeRouteOf } from '@/router/home'
import { useAuthStore } from '@/stores/auth'
import { ROLE, ROLE_LABEL } from '@/types/codes'
import { loadSavedLoginId, saveLoginId } from '@/utils/storage'
import loginBg from '@/assets/images/login-bg.svg'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

// 입력값 ('아이디 저장'으로 저장된 아이디가 있으면 미리 채움)
const savedId = loadSavedLoginId()
const loginId = ref(savedId)
const password = ref('')
const rememberId = ref(true)
const showPassword = ref(false)

// 화면 상태
const loading = ref(false)
const fieldError = ref({ loginId: '', password: '' }) // 칸 아래 빨간 글씨
const alertBox = ref(null) // 카드 위쪽 오류 상자: { icon, title, text }
const notice = ref('') // 비밀번호 재설정 안내
const shaking = ref(false) // 실패 시 카드 흔들기
const splash = ref(null) // 불러오기 화면: { text, percent, user }

const loginIdInput = ref(null)
const passwordInput = ref(null)

// 예시 데이터 모드면 예시 계정 안내를 보여 줌
const showMockHint = USE_MOCK

onMounted(() => {
  // 저장된 아이디가 있으면 비밀번호 칸에, 없으면 아이디 칸에 커서
  ;(savedId ? passwordInput : loginIdInput).value?.focus()
})

/** 입력하면 오류 표시 지우기 */
function clearErrors() {
  fieldError.value = { loginId: '', password: '' }
  alertBox.value = null
}

/** 카드 흔들기 (애니메이션 다시 시작하려고 한 번 껐다 켬) */
function shake() {
  shaking.value = false
  requestAnimationFrame(() => (shaking.value = true))
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * 로그인 직후 불러오기 화면 (설계안과 같은 3단계 문구)
 * - 실제 데이터 로딩과 연결된 것은 아니고 화면 전환 연출용 (약 2초)
 */
async function playSplash(user) {
  const second = user.role === ROLE.HQ_ADMIN ? '사업장 정보를 불러오는 중' : '담당 공장 정보를 불러오는 중'
  const steps = [
    ['계정 권한을 확인하는 중', 30],
    [second, 68],
    ['센서와 연결하는 중', 100],
  ]
  splash.value = { text: steps[0][0], percent: 0, user: `${user.name} · ${ROLE_LABEL[user.role]}` }
  for (const [text, percent] of steps) {
    splash.value = { ...splash.value, text, percent }
    await wait(620)
  }
  await wait(200)
}

async function onSubmit() {
  clearErrors()
  notice.value = ''

  // 1) 빈 칸 검사
  if (!loginId.value.trim()) {
    fieldError.value.loginId = '아이디를 입력해 주세요.'
    loginIdInput.value?.focus()
    return
  }
  if (!password.value) {
    fieldError.value.password = '비밀번호를 입력해 주세요.'
    passwordInput.value?.focus()
    return
  }

  // 2) 로그인 요청
  loading.value = true
  try {
    await auth.login(loginId.value.trim(), password.value)
  } catch (error) {
    loading.value = false
    if (error.code === 'NETWORK_ERROR') {
      alertBox.value = { icon: 'wifioff', title: '서버에 연결하지 못했습니다', text: '네트워크 상태를 확인한 뒤 다시 시도해 주세요.' }
    } else {
      // 아이디·비밀번호 오류: 비밀번호 비우고 다시 입력
      alertBox.value = { icon: 'alert', title: error.message, text: '다시 확인해 주세요.' }
      password.value = ''
      passwordInput.value?.focus()
    }
    shake()
    return
  }

  // 3) 웹에서 갈 곳이 없는 권한(WORKER 등)이면 로그아웃 후 안내
  const home = homeRouteOf(auth.user)
  if (home.name === 'login') {
    loading.value = false
    await auth.logout({ callServer: false })
    alertBox.value = { icon: 'info', title: '공정 담당자는 모바일 앱을 이용해 주세요', text: '관제 웹은 본사 관리자와 공장 담당자만 사용할 수 있습니다.' }
    return
  }

  // 4) 아이디 저장, 불러오기 화면 후 이동 (원래 가려던 주소가 있으면 그쪽)
  saveLoginId(rememberId.value ? loginId.value.trim() : '')
  await playSplash(auth.user)
  router.replace(route.query.redirect || home)
}
</script>

<template>
  <div class="login-page">
    <!-- 배경 (장식용) -->
    <div class="bg" aria-hidden="true">
      <img :src="loginBg" alt="" />
    </div>

    <form class="card" :class="{ shake: shaking, leave: splash }" novalidate autocomplete="off" @submit.prevent="onSubmit">
      <div class="logo">
        <span class="mark"><AppIcon name="eye" :size="22" /></span>
        <b>ArgOS</b>
      </div>
      <h1>로그인</h1>
      <p class="sub">환경안전 통합관제 시스템</p>

      <!-- 서버 오류·로그인 실패 -->
      <div v-if="alertBox" class="alert" role="alert">
        <AppIcon :name="alertBox.icon" :size="17" />
        <div>
          <b>{{ alertBox.title }}</b>
          {{ alertBox.text }}
        </div>
      </div>

      <div class="field">
        <label for="login-id">아이디</label>
        <div class="input" :class="{ bad: fieldError.loginId }">
          <AppIcon name="user" />
          <input
            id="login-id"
            ref="loginIdInput"
            v-model="loginId"
            spellcheck="false"
            autocomplete="username"
            :disabled="loading"
            @input="clearErrors"
          />
        </div>
        <span v-if="fieldError.loginId" class="field-error">
          <AppIcon name="alert" :size="14" />{{ fieldError.loginId }}
        </span>
      </div>

      <div class="field">
        <label for="login-pw">비밀번호</label>
        <div class="input" :class="{ bad: fieldError.password || alertBox?.icon === 'alert' }">
          <AppIcon name="lock" />
          <input
            id="login-pw"
            ref="passwordInput"
            v-model="password"
            :type="showPassword ? 'text' : 'password'"
            autocomplete="current-password"
            :disabled="loading"
            @input="clearErrors"
          />
          <button
            type="button"
            class="icon-btn"
            :aria-label="showPassword ? '비밀번호 숨기기' : '비밀번호 보기'"
            @click="showPassword = !showPassword"
          >
            <AppIcon :name="showPassword ? 'eyeoff' : 'eye'" />
          </button>
        </div>
        <span v-if="fieldError.password" class="field-error">
          <AppIcon name="alert" :size="14" />{{ fieldError.password }}
        </span>
      </div>

      <div class="row">
        <label class="check">
          <input v-model="rememberId" type="checkbox" />
          <span class="box"><AppIcon name="ok" :size="11" /></span>
          아이디 저장
        </label>
        <button type="button" class="link" @click="notice = '비밀번호 재설정은 환경안전팀에 요청해 주세요.'">
          비밀번호 재설정
        </button>
      </div>
      <p v-if="notice" class="notice">{{ notice }}</p>

      <button class="submit" type="submit" :class="{ busy: loading }" :disabled="loading">
        <span v-if="loading" class="spinner" />
        {{ loading ? '로그인 중' : '로그인' }}
      </button>

      <p class="guide">
        계정 권한에 따라 로그인 후 첫 화면이 다릅니다.<br />
        본사 관리자: 사업장 선택 · 공장 담당자: 담당 공장 대시보드
      </p>

      <!-- 예시 데이터 모드 전용 안내 (백엔드 연결 후 사라짐) -->
      <p v-if="showMockHint" class="mock-hint">예시 계정: hq_admin, ulsan5_admin / argos1234</p>
    </form>

    <p class="footer" :class="{ hidden: splash }">ArgOS v1.0 · 계정 문의: 환경안전팀</p>

    <!-- 로그인 직후 불러오기 화면 -->
    <div class="splash" :class="{ on: splash }" aria-live="polite">
      <template v-if="splash">
        <span class="mark big"><AppIcon name="eye" :size="34" /></span>
        <b>ArgOS</b>
        <p>{{ splash.text }}</p>
        <div class="bar"><i :style="{ width: `${splash.percent}%` }" /></div>
        <small>{{ splash.user }}</small>
      </template>
    </div>
  </div>
</template>

<style scoped>
.login-page {
  position: fixed;
  inset: 0;
  overflow: auto;
  background: #f3f5f8;
}

/* 배경: 가운데는 흐리게, 바깥은 진하게 (설계안 시안 1번과 같은 마스크) */
.bg {
  position: absolute;
  inset: 0;
  overflow: hidden;
  opacity: 0.75;
  pointer-events: none;
  -webkit-mask-image: radial-gradient(ellipse 520px 430px at 50% 49%, rgba(0, 0, 0, 0.12) 55%, #000 100%);
  mask-image: radial-gradient(ellipse 520px 430px at 50% 49%, rgba(0, 0, 0, 0.12) 55%, #000 100%);
}

.bg img {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 1920px;
  height: 1080px;
  margin: -540px 0 0 -960px;
  animation: drift 36s ease-in-out infinite alternate;
}

@keyframes drift {
  from {
    transform: translate3d(0, 0, 0) scale(1.04);
  }
  to {
    transform: translate3d(-28px, -14px, 0) scale(1.08);
  }
}

/* 가운데 카드 */
.card {
  position: relative;
  width: 440px;
  max-width: calc(100% - 32px);
  margin: max(32px, calc(50vh - 296px)) auto 80px;
  padding: 44px 40px 32px;
  background: #fff;
  border: 1px solid var(--color-border-card);
  border-radius: 10px;
  box-shadow: var(--shadow-card);
  animation: rise 0.5s cubic-bezier(0.2, 0.8, 0.2, 1) 0.12s both;
  transition:
    opacity 0.3s ease-in,
    transform 0.35s ease-in;
}

.card.shake {
  animation: shake 0.4s ease-in-out;
}

.card.leave {
  opacity: 0;
  transform: translateY(-14px) scale(0.97);
  pointer-events: none;
}

.logo {
  display: flex;
  align-items: center;
  gap: 10px;
}

.logo b {
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.3px;
}

.mark {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  background: var(--color-primary-hover);
  color: #fff;
  display: grid;
  place-items: center;
}

h1 {
  margin-top: 26px;
  font-size: 26px;
  font-weight: 700;
  letter-spacing: -0.4px;
}

.sub {
  margin-top: 6px;
  color: #64748b;
  font-size: 14px;
}

/* 오류 상자 */
.alert {
  display: flex;
  gap: 10px;
  margin-top: 16px;
  padding: 11px 12px;
  border: 1px solid #fecaca;
  background: #fef2f2;
  border-radius: var(--radius-sm);
  font-size: 12.5px;
  color: #7f1d1d;
  line-height: 19px;
  animation: softin 0.2s both;
}

.alert .app-icon {
  color: var(--color-level-alarm);
  margin-top: 1px;
}

.alert b {
  display: block;
  font-size: 13.5px;
  color: var(--color-level-alarm-text);
}

/* 입력칸 */
.field {
  margin-top: 18px;
}

.field label {
  display: block;
  margin-bottom: 7px;
  font-size: 13px;
  font-weight: 600;
  color: #334155;
}

.input {
  height: 46px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 12px 0 14px;
  border: 1px solid var(--color-border-strong);
  border-radius: var(--radius-sm);
  background: #fff;
  font-size: 15px;
  transition:
    border-color 0.15s,
    box-shadow 0.15s;
}

.input:focus-within {
  border-color: var(--color-primary);
}

.input > .app-icon {
  color: var(--color-text-weak);
}

.input.bad {
  border-color: var(--color-level-alarm);
  box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.12);
}

.input input {
  flex: 1;
  min-width: 0;
  height: 100%;
  border: none;
  outline: none;
  background: transparent;
  font-size: 15px;
}

.icon-btn {
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  border: none;
  border-radius: 5px;
  background: none;
  color: var(--color-text-weak);
  cursor: pointer;
}

.icon-btn:hover {
  background: #f1f5f9;
}

.field-error {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 6px;
  color: var(--color-level-alarm-text);
  font-size: 12.5px;
  font-weight: 600;
}

/* 아이디 저장 · 비밀번호 재설정 */
.row {
  display: flex;
  align-items: center;
  margin-top: 16px;
  font-size: 13px;
  color: var(--color-text-sub);
  user-select: none;
}

.check {
  display: flex;
  align-items: center;
  cursor: pointer;
}

/* 실제 체크박스는 숨기고 설계안 모양의 상자를 대신 보여 줌 (키보드 조작은 그대로 됨) */
.check input {
  position: absolute;
  opacity: 0;
  width: 1px;
  height: 1px;
}

.box {
  width: 16px;
  height: 16px;
  margin-right: 7px;
  display: grid;
  place-items: center;
  border: 1.5px solid var(--color-border-strong);
  border-radius: 3px;
  color: transparent;
  transition:
    background 0.15s,
    border-color 0.15s;
}

.box :deep(.app-icon) {
  stroke-width: 3.5;
}

.check input:checked + .box {
  background: var(--color-primary);
  border-color: var(--color-primary);
  color: #fff;
}

.check input:focus-visible + .box {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.link {
  margin-left: auto;
  padding: 0;
  border: none;
  background: none;
  color: var(--color-primary);
  font-size: 13px;
  cursor: pointer;
}

.notice {
  margin-top: 8px;
  font-size: 12.5px;
  color: var(--color-text-sub);
}

/* 로그인 버튼 */
.submit {
  width: 100%;
  height: 48px;
  margin-top: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 9px;
  border: none;
  border-radius: var(--radius-sm);
  background: var(--color-primary);
  color: #fff;
  font-size: 16px;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.15s;
}

.submit:hover {
  background: var(--color-primary-hover);
}

.submit.busy {
  background: #3b82f6;
  cursor: default;
}

.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.4);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.guide {
  margin-top: 22px;
  padding-top: 18px;
  border-top: 1px solid var(--color-border);
  font-size: 12.5px;
  color: #64748b;
  line-height: 20px;
}

.mock-hint {
  margin-top: 10px;
  font-size: 12px;
  color: var(--color-text-weak);
}

.footer {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 28px;
  text-align: center;
  font-size: 12px;
  color: #64748b;
  text-shadow:
    0 0 4px #fff,
    0 0 8px #fff;
  transition: opacity 0.3s;
}

.footer.hidden {
  opacity: 0;
}

/* 불러오기 화면 */
.splash {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(243, 245, 248, 0.9);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.35s ease-out 0.1s;
}

.splash.on {
  opacity: 1;
  pointer-events: auto;
}

.mark.big {
  width: 64px;
  height: 64px;
  border-radius: 16px;
  background: var(--color-primary);
  box-shadow: 0 10px 28px rgba(37, 99, 235, 0.3);
}

.splash b {
  margin-top: 16px;
  font-size: 26px;
  font-weight: 800;
  letter-spacing: -0.5px;
}

.splash p {
  height: 20px;
  margin-top: 26px;
  font-size: 14px;
  color: var(--color-text-sub);
}

.bar {
  width: 260px;
  height: 4px;
  margin-top: 12px;
  border-radius: 2px;
  background: #dde3ea;
  overflow: hidden;
}

.bar i {
  display: block;
  height: 100%;
  border-radius: 2px;
  background: var(--color-primary);
  transition: width 0.55s cubic-bezier(0.3, 0.6, 0.3, 1);
}

.splash small {
  margin-top: 14px;
  font-size: 12.5px;
  color: var(--color-text-weak);
}
</style>
