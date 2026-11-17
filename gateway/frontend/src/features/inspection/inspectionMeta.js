/**
 * 점검 관리 공통 이름표 (화면설계안 vInspect() 의 CHIP · 단계 · 구역)
 */

/** 서류 종류 */
export const FORM_TYPES = [
  { value: 'F01', label: '밀폐공간 작업허가서' },
  { value: 'F02', label: '환기·배기설비 점검일지' },
  { value: 'F03', label: '수변전설비 점검일지' },
  { value: 'F04', label: '안전보건교육 일지' },
  { value: 'F05', label: '위험성평가표' },
]
export const FORM_LABEL = Object.fromEntries(FORM_TYPES.map((f) => [f.value, f.label]))

/** 예시 원본이 있는 서류 (설계안: 밀폐공간 작업허가서만) */
export const SAMPLE_FORM = 'F01'

/** 등록 목록 상태 칩 (current: 지금 열어 둔 서류면 '검수 중') */
export function statusChip(status, current = false) {
  if (status === 'REVIEW') return current ? { cls: 'info', label: '검수 중' } : { cls: 'warn', label: '검수 대기' }
  return (
    {
      UPLOADING: { cls: 'gray', label: '올리는 중' },
      RECOGNIZING: { cls: 'info', label: '인식 중' },
      DONE: { cls: 'ok', label: '저장' },
      FAILED: { cls: 'alarm', label: '인식 실패' },
    }[status] ?? { cls: 'gray', label: status }
  )
}

/** 단계 4개 */
export const STEPS = ['파일 올리기', '문자 인식', '원본 대조', '저장']

/** 인식 결과 구역 (doc-forms 의 group) */
export const GROUPS = {
  overview: { label: '작업 개요', icon: 'file' },
  gas: { label: '가스 농도 측정', icon: 'wind' },
  pre: { label: '사전 안전조치', icon: 'shield' },
  end: { label: '작업 종료 확인', icon: 'user' },
}

/** 점검 일정 상태 (점 색) */
export const SCHEDULE_STATE = {
  DONE: { label: '완료', color: 'var(--color-level-normal)', chip: 'ok' },
  PLANNED: { label: '예정', color: '#3b82f6', chip: 'info' },
  DELAYED: { label: '지연', color: 'var(--color-level-alarm)', chip: 'alarm' },
}

const pad = (n) => String(n).padStart(2, '0')
/** Date → 'YYYY-MM-DD' (PC 시간 기준) */
export const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
/** '2026-11-12T16:44:02+09:00' → '11-12 16:44' */
export const shortTime = (iso) => (iso ? `${iso.slice(5, 10)} ${iso.slice(11, 16)}` : '')
