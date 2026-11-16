/**
 * 앱 시작점
 * - 글꼴·전역 스타일 → Pinia → 라우터 → ECharts 순서로 등록
 */
import { createApp } from 'vue'
import { createPinia } from 'pinia'

// 글꼴 (npm 패키지로 포함 → 외부 인터넷이 막힌 공장망에서도 표시됨)
import 'pretendard/dist/web/variable/pretendardvariable-dynamic-subset.css'
import '@fontsource/fira-code/400.css'
import '@fontsource/fira-code/500.css'

// 디자인 토큰 → 전역 기본 스타일 순서 (base.css 가 토큰을 사용)
import '@/assets/styles/tokens.css'
import '@/assets/styles/base.css'

import App from './App.vue'
import router from './router'
import VChart from '@/utils/echarts'
import { setAuthHandlers } from '@/api/http'
import { useAuthStore } from '@/stores/auth'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

// 차트 컴포넌트 전역 등록: 어느 화면에서든 <VChart :option="option" /> 로 사용
app.component('VChart', VChart)

// Axios 에 토큰 조회 방법과 401(인증 만료) 처리 방법 등록
const auth = useAuthStore(pinia)
setAuthHandlers({
  getToken: () => auth.accessToken,
  onUnauthorized: async () => {
    await auth.logout({ callServer: false })
    router.push({ name: 'login' })
  },
})

app.mount('#app')
