/**
 * 라우터 (화면 주소 정의 + 권한 가드)
 *
 * 화면 흐름 (설계 기준):
 *  로그인 → 권한 분기
 *   - 본사 관리자(HQ_ADMIN): 사업장 선택 → 공장 진입
 *   - 공장 담당자(PLANT_ADMIN): 담당 공장으로 바로 진입
 *   - 공정 담당자(WORKER): 모바일 앱 사용 (웹 진입 불가)
 *  공장 진입 후 상단 메뉴 6개
 */
import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { ROLE, WEB_ROLES } from '@/types/codes'

import BlankLayout from '@/layouts/BlankLayout.vue'
import MainLayout from '@/layouts/MainLayout.vue'
import { FACTORY_MENUS } from './menus'

/**
 * 로그인 사용자의 첫 화면
 * - 로그인 직후, 권한 없는 주소로 들어왔을 때 이동할 곳
 */
export function homeRouteOf(user) {
  if (user?.role === ROLE.HQ_ADMIN) {
    return { name: 'site-select' }
  }
  if (user?.role === ROLE.PLANT_ADMIN && user.factoryId) {
    return { name: 'dashboard', params: { factoryId: user.factoryId } }
  }
  return { name: 'login' }
}

const routes = [
  // 로그인 전 화면 + 사업장 선택: 상단 바 없는 빈 레이아웃
  {
    path: '/',
    component: BlankLayout,
    children: [
      {
        path: 'login',
        name: 'login',
        component: () => import('@/pages/auth/LoginPage.vue'),
        meta: { public: true }, // 로그인 없이 접근 가능
      },
      {
        path: 'sites',
        name: 'site-select',
        component: () => import('@/pages/site/SiteSelectPage.vue'),
        meta: { roles: [ROLE.HQ_ADMIN] }, // 본사 관리자만
      },
    ],
  },

  // 공장 진입 후: 상단 바 + 본문 레이아웃
  {
    path: '/factories/:factoryId',
    component: MainLayout,
    meta: { roles: WEB_ROLES },
    children: [
      { path: '', redirect: { name: 'dashboard' } },
      ...FACTORY_MENUS.map((menu) => ({
        path: menu.path,
        name: menu.name,
        component: menu.component,
        meta: { title: menu.label },
      })),
    ],
  },

  // 그 외 주소: 첫 화면으로
  { path: '/:pathMatch(.*)*', redirect: '/' },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

/**
 * 권한 가드: 화면 이동 전마다 실행
 * - 반환값 true: 이동 허용 / 라우트 객체: 그 화면으로 대신 이동
 */
router.beforeEach((to) => {
  const auth = useAuthStore()

  // 0) 웹에서 갈 곳이 없는 사용자(WORKER, 담당 공장 없는 공장 담당자)는 저장된 로그인 정보 정리
  //    (안 하면 로그인 화면 ↔ 첫 화면 사이에서 무한 이동이 생김)
  if (auth.isLoggedIn && homeRouteOf(auth.user).name === 'login') {
    auth.logout({ callServer: false })
  }

  // 1) 로그인 화면
  if (to.meta.public) {
    // 이미 로그인했으면 첫 화면으로
    return auth.isLoggedIn ? homeRouteOf(auth.user) : true
  }

  // 2) 로그인 안 했으면 로그인 화면으로 (로그인 후 돌아올 주소를 redirect 로 전달)
  if (!auth.isLoggedIn) {
    // '/' 는 돌아올 의미가 없으므로 redirect 생략
    const query = to.fullPath === '/' ? {} : { redirect: to.fullPath }
    return { name: 'login', query }
  }

  // 3) 주소가 '/' 뿐이면 권한별 첫 화면으로
  if (to.path === '/') {
    return homeRouteOf(auth.user)
  }

  // 4) 화면별 허용 권한 검사 (부모 라우트의 meta 도 합쳐져서 들어옴)
  if (to.meta.roles && !to.meta.roles.includes(auth.role)) {
    return homeRouteOf(auth.user)
  }

  // 5) 공장 담당자는 자기 담당 공장만 볼 수 있음
  if (auth.role === ROLE.PLANT_ADMIN && to.params.factoryId && to.params.factoryId !== auth.user.factoryId) {
    return homeRouteOf(auth.user)
  }

  return true
})

export default router
