/**
 * 로그인 상태 스토어 (Pinia)
 * - 액세스 토큰과 로그인 사용자 정보를 보관
 * - 새로고침해도 유지되도록 utils/storage.js 로 저장·복원
 * - 리프레시 토큰은 서버가 HttpOnly 쿠키로 관리하므로 여기서 다루지 않음 (API 명세서 A1)
 */
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import * as authApi from '@/api/auth'
import { clearAuth, loadAuth, saveAuth } from '@/utils/storage'

export const useAuthStore = defineStore('auth', () => {
  // 저장된 로그인 정보가 있으면 복원
  const saved = loadAuth()

  const accessToken = ref(saved?.accessToken ?? null)
  /** 로그인 사용자: { id, loginId, name, role, scope: { siteId, factoryIds, processIds } } */
  const user = ref(saved?.user ?? null)

  const isLoggedIn = computed(() => !!accessToken.value)
  const role = computed(() => user.value?.role ?? null)

  /** 아이디·비밀번호 로그인: 성공하면 상태와 브라우저에 저장 */
  async function login(loginId, password) {
    const result = await authApi.login({ loginId, password })
    accessToken.value = result.accessToken
    user.value = result.user
    saveAuth({ accessToken: accessToken.value, user: user.value })
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
    user.value = null
    clearAuth()
  }

  return { accessToken, user, isLoggedIn, role, login, logout }
})
