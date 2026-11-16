/**
 * 공통 코드 (상태 단계, 권한)
 * - 백엔드와 같은 문자열 값을 사용해야 하므로 화면 코드에서 문자열을 직접 쓰지 말고 이 상수를 사용
 * - 값이 바뀌면 이 파일만 고치면 됨
 */

/** 상태 4단계 */
export const LEVEL = Object.freeze({
  NORMAL: 'NORMAL', // 정상
  WARN: 'WARN', // 주의
  ALARM: 'ALARM', // 경보
  FIRE: 'FIRE', // 화재
})

/**
 * 상태별 화면 표시 정보
 * - label: 이름, key: CSS 클래스용 이름(is-normal 등), icon: AppIcon 이름
 * - color: 진한 색(점·선·도넛) — tokens.css 의 변수
 */
export const LEVEL_META = Object.freeze({
  [LEVEL.NORMAL]: { label: '정상', key: 'normal', icon: 'check', color: 'var(--color-level-normal)' },
  [LEVEL.WARN]: { label: '주의', key: 'warn', icon: 'tri', color: 'var(--color-level-warn)' },
  [LEVEL.ALARM]: { label: '경보', key: 'alarm', icon: 'alert', color: 'var(--color-level-alarm)' },
  [LEVEL.FIRE]: { label: '화재', key: 'fire', icon: 'flame', color: 'var(--color-level-fire)' },
})

/** 센서 단계 3가지 (정상·주의·경보) 표시 순서 — 개수 표시·막대·도넛에서 공통 사용 */
export const SENSOR_STAGES = Object.freeze([LEVEL.NORMAL, LEVEL.WARN, LEVEL.ALARM])

/** 권한 3종 */
export const ROLE = Object.freeze({
  HQ_ADMIN: 'HQ_ADMIN', // 본사 관리자: 전체 사업장, PC 웹
  PLANT_ADMIN: 'PLANT_ADMIN', // 공장 담당자: 담당 공장, PC 웹
  WORKER: 'WORKER', // 공정 담당자: 배정 공정, 모바일 앱
})

/** 권한별 화면 표시 이름 */
export const ROLE_LABEL = Object.freeze({
  [ROLE.HQ_ADMIN]: '본사 관리자',
  [ROLE.PLANT_ADMIN]: '공장 담당자',
  [ROLE.WORKER]: '공정 담당자',
})

/** PC 웹에 들어올 수 있는 권한 (WORKER 는 모바일 앱 사용) */
export const WEB_ROLES = Object.freeze([ROLE.HQ_ADMIN, ROLE.PLANT_ADMIN])
