/**
 * 사업장 화면의 상단 메뉴 (화면설계안 js/shell.js buildHeader 기준)
 * - 탭 4개 + '관리' 펼침(사용자 관리, 공장 관리)
 * - nav 값: 라우트 meta.nav 와 같으면 그 탭이 선택된 것으로 표시
 *   (대시보드 탭은 사업장 현황·공장 대시보드 등 여러 화면에서 켜져야 해서 주소 대신 nav 값으로 비교)
 * - router/index.js 는 이 목록으로 라우트를 만들고, AppNav 는 이 목록으로 메뉴를 그림
 */

/** 탭 4개 */
export const NAV_TABS = [
  { nav: 'dashboard', name: 'site-dashboard', label: '대시보드', icon: 'grid' },
  { nav: 'history', name: 'history', label: '통계·이력 관리', icon: 'chart' },
  { nav: 'inspection', name: 'inspection', label: '점검 관리', icon: 'clip' },
  { nav: 'threshold', name: 'threshold', label: '설비 기준값 관리', icon: 'slider' },
]

/** '관리' 펼침 메뉴 */
export const NAV_ADMIN = [
  { nav: 'admin', name: 'user', label: '사용자 관리', sub: '권한 부여·변경', icon: 'users' },
  { nav: 'admin', name: 'factory', label: '공장 관리', sub: '설비 재배치', icon: 'factory' },
]

/**
 * 사업장 아래 메뉴 화면들 (/sites/:siteId/...)
 * - 대시보드 화면(사업장 현황, 공장 대시보드)은 router/index.js 에 따로 있음
 */
export const MENU_ROUTES = [
  { name: 'history', path: 'history', nav: 'history', title: '통계·이력 관리', component: () => import('@/pages/history/HistoryPage.vue') },
  { name: 'inspection', path: 'inspections', nav: 'inspection', title: '점검 관리', component: () => import('@/pages/inspection/InspectionPage.vue') },
  { name: 'threshold', path: 'thresholds', nav: 'threshold', title: '설비 기준값 관리', component: () => import('@/pages/threshold/ThresholdPage.vue') },
  { name: 'user', path: 'users', nav: 'admin', title: '사용자 관리', component: () => import('@/pages/user/UserPage.vue') },
  { name: 'factory', path: 'settings', nav: 'admin', title: '공장 관리', component: () => import('@/pages/factory/FactoryPage.vue') },
]
