<!--
  로그인 화면 (가운데 카드)
  - 로그인 성공 → 권한별 첫 화면으로 이동 (router/index.js 의 homeRouteOf)
  - 공정 담당자(WORKER)는 모바일 앱을 쓰므로 웹 로그인 차단
  - 개발 모드에서만 백엔드 없이 들어가는 버튼 표시
-->
<script setup>
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { homeRouteOf } from '@/router'
import { useAuthStore } from '@/stores/auth'
import { ROLE } from '@/types/codes'

const route = useRoute()
const router = useRouter()
const auth = useAuthStore()

const loginId = ref('')
const password = ref('')
const loading = ref(false)
const errorMessage = ref('')

// npm run dev 로 실행했을 때만 true (빌드 결과물에서는 false)
const isDev = import.meta.env.DEV

/** 로그인 후 이동: 원래 가려던 주소(redirect)가 있으면 그쪽, 없으면 권한별 첫 화면 */
async function goNext() {
  const home = homeRouteOf(auth.user)

  // 웹에서 갈 곳이 없는 권한(WORKER 등)이면 로그아웃 후 안내
  if (home.name === 'login') {
    await auth.logout({ callServer: false })
    errorMessage.value = '공정 담당자는 모바일 앱을 이용해 주세요.'
    return
  }

  router.push(route.query.redirect || home)
}

async function onSubmit() {
  if (!loginId.value || !password.value) {
    errorMessage.value = '아이디와 비밀번호를 입력해 주세요.'
    return
  }

  loading.value = true
  errorMessage.value = ''
  try {
    await auth.login(loginId.value, password.value)
    await goNext()
  } catch (error) {
    // http.js 에서 ApiError 로 통일되어 message 만 보여 주면 됨
    errorMessage.value = error.message
  } finally {
    loading.value = false
  }
}

/** [개발 전용] 권한 골라서 바로 들어가기 */
async function onDevLogin(role) {
  auth.devLogin(role)
  await goNext()
}
</script>

<template>
  <div class="login-card">
    <h1 class="title">ArgOS</h1>
    <p class="subtitle">환경안전 통합관제</p>

    <form class="form" @submit.prevent="onSubmit">
      <label class="field">
        <span>아이디</span>
        <input v-model.trim="loginId" type="text" autocomplete="username" />
      </label>
      <label class="field">
        <span>비밀번호</span>
        <input v-model="password" type="password" autocomplete="current-password" />
      </label>

      <p v-if="errorMessage" class="error">{{ errorMessage }}</p>

      <button type="submit" class="btn btn-primary" :disabled="loading">
        {{ loading ? '로그인 중' : '로그인' }}
      </button>
    </form>

    <!-- 개발 모드 전용: 백엔드 로그인 API 준비 전 화면 확인용 (준비되면 삭제) -->
    <div v-if="isDev" class="dev-login">
      <p>개발용 바로 들어가기</p>
      <button type="button" class="btn" @click="onDevLogin(ROLE.HQ_ADMIN)">본사 관리자</button>
      <button type="button" class="btn" @click="onDevLogin(ROLE.PLANT_ADMIN)">공장 담당자</button>
    </div>
  </div>
</template>

<style scoped>
.login-card {
  width: 100%;
  max-width: 360px;
  padding: 32px 28px;
  background: var(--color-surface);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-sm);
}

.title {
  margin: 0;
  font-size: 24px;
  font-weight: 800;
}

.subtitle {
  margin: 4px 0 24px;
  color: var(--color-text-sub);
}

.form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field input {
  height: 38px;
  padding: 0 10px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
}

.error {
  margin: 0;
  color: var(--color-level-alarm);
}

.dev-login {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px dashed var(--color-border);
}

.dev-login p {
  width: 100%;
  margin: 0;
  color: var(--color-text-sub);
  font-size: 12px;
}
</style>
