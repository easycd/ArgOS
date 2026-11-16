/**
 * 날짜·숫자 표시 형식
 */
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']
const pad = (n) => String(n).padStart(2, '0')

/** 상단 바 시계: 2026-11-16 (월) 15:30:05 */
export function formatClock(date) {
  const ymd = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
  const hms = `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  return `${ymd} (${WEEKDAYS[date.getDay()]}) ${hms}`
}
