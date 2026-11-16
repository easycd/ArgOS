/**
 * 로그인 상태 스토어 (Pinia)
 * - 토큰과 로그인 사용자 정보를 보관
 * - 새로고침해도 유지되도록 utils/storage.js 로 저장·복원
 */
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import * as authApi from '@/api/auth'
import { clearAuth, loadAuth, saveAuth } from '@/utils/storage'

export const useAuthStore = defineStore('auth', () => {
  // 저장된 로그인 정보가 있으면 복원
  const saved = loadAuth()

  const accessToken = ref(saved?.accessToken ?? null)
  const refreshToken = ref(saved?.refreshToken ?? null)
  /** 로그인 사용자: { id, name, role, factoryId } */
  const user = ref(saved?.user ?? null)

  const isLoggedIn = computed(() => !!accessToken.value)
  const role = computed(() => user.value?.role ?? null)

  /** 로그인 결과를 상태와 브라우저에 저장 */
  function setSession(result) {
    accessToken.value = result.accessToken
    refreshToken.value = result.refreshToken ?? null
    user.value = result.user
    saveAuth({
      accessToken: accessToken.value,
      refreshToken: refreshToken.value,
      user: user.value,
    })
  }

  /** 아이디·비밀번호 로그인 */
  async function login(loginId, password) {
    const result = await authApi.login({ loginId, password })
    setSession(result)
  }

  /** 로그아웃: 서버 요청은 실패해도 화면 쪽 로그인 정보는 반드시 삭제 */
  async function logout({ callServer = true } = {}) {
    if (callServer && accessToken.value) {
      try {
        await authApi.logout()
      } catch {
        // 서버 로그아웃 실패는 무시
      }
    }
    accessToken.value = null
    refreshToken.value = null
    user.value = null
    clearAuth()
  }

  return { accessToken, refreshToken, user, isLoggedIn, role, login, logout }
})
