/**
 * 공장 진입 후 상단 메뉴 6개 (순서 = 화면 표시 순서)
 * - router/index.js 는 이 목록으로 라우트를 만들고, MainLayout 은 이 목록으로 메뉴를 그림
 * - 별도 파일로 둔 이유: 레이아웃이 router/index.js 를 import 하면 서로 import 하는 순환이 생김
 */
export const FACTORY_MENUS = [
  { name: 'dashboard', path: 'dashboard', label: '대시보드', component: () => import('@/pages/dashboard/DashboardPage.vue') },
  { name: 'history', path: 'history', label: '통계·이력 관리', component: () => import('@/pages/history/HistoryPage.vue') },
  { name: 'inspection', path: 'inspections', label: '점검 관리', component: () => import('@/pages/inspection/InspectionPage.vue') },
  { name: 'threshold', path: 'thresholds', label: '설비 기준값 관리', component: () => import('@/pages/threshold/ThresholdPage.vue') },
  { name: 'user', path: 'users', label: '사용자 관리', component: () => import('@/pages/user/UserPage.vue') },
  { name: 'factory', path: 'settings', label: '공장 관리', component: () => import('@/pages/factory/FactoryPage.vue') },
]
