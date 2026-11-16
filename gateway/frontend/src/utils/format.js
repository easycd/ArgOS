/**
 * 날짜·숫자 표시 형식
 */
const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']
const pad = (n) => String(n).padStart(2, '0')

/** 남은 시간: 46800000ms → '13:00:00' (시:분:초) */
export function formatDuration(ms) {
  const total = Math.max(0, Math.floor(ms / 1000))
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return `${pad(h)}:${pad(m)}:${pad(s)}`
}

/** 상단 바 시계: 2026-11-16 (월) 15:30:05 */
export function formatClock(date) {
  const ymd = `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
  const hms = `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
  return `${ymd} (${WEEKDAYS[date.getDay()]}) ${hms}`
}
