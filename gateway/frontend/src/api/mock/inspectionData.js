/**
 * 점검 관리(수기 서류 OCR) 예시 데이터 (화면설계안 v-inspect.js vInspect(), v-rev3.js inspectList(), API 명세서 E1)
 *
 * - 백엔드에 점검·서류·OCR 컨트롤러가 아직 없어 명세서 E1 의 주소·응답 모양을 따름
 * - 실제 글자 인식은 백엔드가 네이버 CLOVA OCR(템플릿)을 부르고, 키도 백엔드에만 있음 → 프론트는 결과만 받음
 * - 예시 원본은 F01 밀폐공간 작업허가서 한 장뿐 → 올리는 파일은 모두 F01 로 인식한 것으로 만듦 (설계안과 같음)
 * - 상태는 이 파일 안에만 있음 (새로고침하면 처음으로)
 * - 예시 전용: 파일 이름에 '실패' 가 들어가면 인식 실패(FAILED)로 끝남 (실패 화면 확인용)
 */
import f01Scan from '@/assets/images/inspection/f01_filled.jpg'

const pad = (n) => String(n).padStart(2, '0')
const ymd = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
const iso = (d) => `${ymd(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}:00+09:00`
const daysAgo = (n, h = 9, m = 0) => {
  const d = new Date()
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - n, h, m)
}
/** 깊은 복사 (화면이 받은 값을 고쳐도 원본이 바뀌지 않게) */
const copy = (v) => JSON.parse(JSON.stringify(v))

/* ───────── 서류 양식 (GET /doc-forms) ───────── */
/**
 * fields: 명세서 { key, label, type, unit, limit } + group(구역, 추가 필드)
 * - F01 은 설계안 인식 결과 순서 그대로 (작업 개요 → 가스 농도 측정 → 사전 안전조치 → 작업 종료 확인)
 * - F02 ~ F05 는 예시 원본이 없어 칸 이름만 가정 (확인 필요)
 */
const PRE_ITEMS = [
  ['작업 전 환기 실시', '배기팬 CF-03 가동'],
  ['산소 · 유해가스 농도 측정 및 기록', ''],
  ['감시인 배치, 작업자와 연락 방법 확인', ''],
  ['송기마스크 · 공기호흡기 등 보호구 비치', ''],
  ['출입금지 표지 게시, 출입 인원 점검', ''],
  ['구조용 장비 비치 (사다리 · 섬유로프 등)', ''],
  ['작업자 밀폐공간 특별안전교육 실시', ''],
  ['작업장 전원 · 밸브 잠금 및 표지 부착', ''],
]

const FORMS = [
  {
    formType: 'F01',
    name: '밀폐공간 작업허가서',
    fields: [
      { key: 'applyDate', label: '신청일', type: 'date', group: 'overview' },
      { key: 'place', label: '작업 장소', type: 'text', group: 'overview' },
      { key: 'equipmentNo', label: '설비번호', type: 'text', group: 'overview' },
      { key: 'workPeriod', label: '작업 기간', type: 'text', group: 'overview' },
      { key: 'manager', label: '작업 책임자', type: 'text', group: 'overview' },
      { key: 'supervisor', label: '감시인', type: 'text', group: 'overview' },
      { key: 'workers', label: '작업자', type: 'text', group: 'overview' },
      { key: 'co0850', label: '08:50 CO', type: 'number', unit: 'ppm', limit: 30, group: 'gas', time: '08:50 작업 전' },
      { key: 'co0930', label: '09:30 CO', type: 'number', unit: 'ppm', limit: 30, group: 'gas', time: '09:30 작업 중' },
      { key: 'co1030', label: '10:30 CO', type: 'number', unit: 'ppm', limit: 30, group: 'gas', time: '10:30 작업 중' },
      ...PRE_ITEMS.map(([label, note], i) => ({ key: `pre${i + 1}`, label, note, type: 'check', group: 'pre' })),
      { key: 'endAt', label: '종료 일시', type: 'datetime', group: 'end' },
      { key: 'exitCheck', label: '작업자 퇴출', type: 'text', group: 'end' },
      { key: 'remark', label: '특이 사항', type: 'text', group: 'end' },
      { key: 'signer', label: '확인자 서명', type: 'text', group: 'end' },
    ],
  },
  { formType: 'F02', name: '환기·배기설비 점검일지', fields: simpleFields(['점검일', '설비', '풍량', '벨트 상태', '점검자']) },
  { formType: 'F03', name: '수변전설비 점검일지', fields: simpleFields(['점검일', '변압기 온도', '전압', '절연 상태', '점검자']) },
  { formType: 'F04', name: '안전보건교육 일지', fields: simpleFields(['교육일', '교육 내용', '교육 시간', '참석 인원', '강사']) },
  { formType: 'F05', name: '위험성평가표', fields: simpleFields(['평가일', '작업명', '위험 요인', '위험성 수준', '평가자']) },
]
function simpleFields(labels) {
  return labels.map((label, i) => ({ key: `f${i + 1}`, label, type: i === 0 ? 'date' : 'text', group: 'overview' }))
}
export const FORM_NAME = Object.fromEntries(FORMS.map((f) => [f.formType, f.name]))

export const docForms = () => copy(FORMS)

/* ───────── F01 예시 인식 결과 ───────── */
// 원본 그림 크기 (설계안 910 × 1286). 상자는 명세서처럼 그림 크기에 대한 비율 [x, y, 너비, 높이]
const W = 910
const H = 1286
const box = (x, y, w, h) => [x / W, y / H, w / W, h / H].map((v) => Math.round(v * 10000) / 10000)

function f01Fields(today) {
  const md = `${today.slice(5, 7)}-${today.slice(8, 10)}`
  return [
    { key: 'applyDate', value: today, box: box(660, 200, 170, 26), needCheck: false },
    { key: 'place', value: '5공장 도장 공정 · 전처리 탈지 탱크 내부', box: box(150, 300, 470, 26), needCheck: false },
    { key: 'equipmentNo', value: 'PT-01', box: box(645, 232, 100, 26), needCheck: false },
    { key: 'workPeriod', value: `${md} 09:00 ~ 12:00`, box: box(150, 332, 580, 26), needCheck: false },
    { key: 'manager', value: '박성훈', box: box(195, 416, 90, 26), needCheck: false },
    { key: 'supervisor', value: '이재호', box: box(195, 450, 90, 26), needCheck: false },
    { key: 'workers', value: '최민규, 정우진', box: box(165, 483, 225, 26), needCheck: true, reason: '글자가 흐립니다' },
    { key: 'co0850', value: '4', box: box(132, 814, 650, 28), needCheck: false },
    { key: 'co0930', value: '6', box: box(132, 851, 650, 28), needCheck: false },
    { key: 'co1030', value: '7', box: box(420, 887, 40, 30), needCheck: true, reason: '숫자 1과 7이 비슷하게 쓰임' },
    ...PRE_ITEMS.map((_, i) => ({ key: `pre${i + 1}`, value: '예', box: null, needCheck: false })),
    { key: 'endAt', value: `${today} 11:50`, box: box(230, 984, 230, 26), needCheck: false },
    { key: 'exitCheck', value: '전원 퇴출 확인', box: box(680, 984, 170, 26), needCheck: false },
    { key: 'remark', value: '이상 없음', box: null, needCheck: false },
    { key: 'signer', value: '박성훈', box: box(158, 1091, 330, 26), needCheck: false },
  ]
}
const labelOf = (formType, key) => FORMS.find((f) => f.formType === formType)?.fields.find((f) => f.key === key)?.label ?? key

/* ───────── 등록된 서류 (GET /inspections) ───────── */
const WHO = ['한지우', '윤서연', '김도현', '박성훈', '이재호']
const PROC = ['도장 공정', '차체 공정', '프레스 공정', '의장 공정']
const fileNameOf = (formType, d, n = 0) => `${FORM_NAME[formType].replace(/[·\s]/g, '')}_${pad(d.getMonth() + 1)}${pad(d.getDate())}${n ? `_${n + 1}` : ''}.pdf`

let nextId = 2300
/** 서류 한 건 (목록 줄 + 인식 결과) */
function makeDoc({ formType, at, status, by, processName, fileName, progress = 100 }) {
  const id = nextId++
  const today = ymd(at)
  const fields = formType === 'F01' ? f01Fields(today) : []
  return {
    id,
    formType,
    formName: FORM_NAME[formType],
    fileName: fileName ?? fileNameOf(formType, at),
    processName: formType === 'F03' ? '변전소' : processName,
    uploadedBy: by,
    uploadedAt: iso(at),
    status, // RECOGNIZING | REVIEW | DONE | FAILED
    progress,
    startedAt: Date.now(),
    ocrMs: 8000, // 인식에 걸리는 시간 (예시)
    fields,
    reviewedBy: status === 'DONE' ? by : null,
    reviewedAt: status === 'DONE' ? iso(new Date(at.getTime() + 25 * 60000)) : null,
  }
}

/** 처음 목록: 오늘 3건(검수 대기 F01 · 인식 중 F03 · 검수 대기 F02) + 지난 12일 저장된 서류 (설계안 Q · inspectList ALL) */
function seed() {
  const list = []
  list.push(makeDoc({ formType: 'F01', at: daysAgo(0, 8, 41), status: 'REVIEW', by: '김도현', processName: '도장 공정' }))
  const f03 = makeDoc({ formType: 'F03', at: daysAgo(0, 8, 32), status: 'RECOGNIZING', by: '한지우', processName: '변전소', progress: 64 })
  // 설계안처럼 화면을 보는 동안 천천히 진행 (90초, 이미 64%)
  f03.ocrMs = 90000
  f03.startedAt = Date.now() - 0.64 * f03.ocrMs
  list.push(f03)
  list.push(makeDoc({ formType: 'F02', at: daysAgo(0, 8, 15), status: 'REVIEW', by: '이재호', processName: '도장 공정' }))
  for (let back = 1; back <= 12; back += 1) {
    const n = 1 + ((back * 7) % 3)
    for (let j = 0; j < n; j += 1) {
      const formType = `F0${1 + ((back + j * 2) % 5)}`
      const at = daysAgo(back, 9 + ((back + j * 3) % 8), (back * 13 + j * 17) % 60)
      list.push(makeDoc({ formType, at, status: 'DONE', by: WHO[(back + j) % 5], processName: PROC[(back + j) % 4], fileName: fileNameOf(formType, at, j) }))
    }
  }
  return list
}
const DOCS = seed()

/* ───────── 인식 진행 (시간 기준, 보통 8초) ───────── */
function advance(doc) {
  if (doc.status !== 'RECOGNIZING') return
  const p = Math.min(100, Math.round(((Date.now() - doc.startedAt) / doc.ocrMs) * 100))
  doc.progress = Math.max(doc.progress, p)
  if (doc.progress < 100) return
  // 예시 전용: 파일 이름에 '실패' 가 있으면 인식 실패
  if (doc.fileName.includes('실패')) {
    doc.status = 'FAILED'
    return
  }
  doc.status = 'REVIEW'
}

const rowOf = (d) => ({
  id: d.id,
  formType: d.formType,
  formName: d.formName,
  fileName: d.fileName,
  processName: d.processName,
  uploadedBy: d.uploadedBy,
  uploadedAt: d.uploadedAt,
  status: d.status,
  progress: d.progress,
  // 추가 필드: 목록에서 '확인 필요 n개' 를 보여 주려고
  needCheckCount: d.fields.filter((f) => f.needCheck).length,
  reviewedAt: d.reviewedAt,
})

/** GET /inspections?from=&to=&formType=&status=&q=&page=&size= */
export function list({ from, to, formType, status, q, page = 0, size = 20 } = {}) {
  DOCS.forEach(advance)
  const day = (s) => s.slice(0, 10)
  const rows = DOCS.filter(
    (d) =>
      (!from || day(d.uploadedAt) >= from) &&
      (!to || day(d.uploadedAt) <= to) &&
      (!formType || d.formType === formType) &&
      (!status || status.split(',').includes(d.status)) &&
      (!q || d.fileName.includes(q) || (d.processName ?? '').includes(q)),
  ).sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt) || b.id - a.id)
  return { items: rows.slice(page * size, page * size + size).map(rowOf), page, size, total: rows.length }
}

/** POST /inspections (파일 → 202 { id, fileName, status }) */
export function upload({ fileName, formType, processName = '도장 공정', by }) {
  const doc = makeDoc({ formType: formType || 'F01', at: new Date(), status: 'RECOGNIZING', by, processName, fileName, progress: 0 })
  // 예시 원본이 F01 뿐이라 양식을 정하지 않으면 F01 로 인식
  if (doc.formType !== 'F01') {
    doc.formType = 'F01'
    doc.formName = FORM_NAME.F01
  }
  doc.fields = f01Fields(ymd(new Date()))
  doc.startedAt = Date.now()
  DOCS.unshift(doc)
  return { id: doc.id, fileName: doc.fileName, status: doc.status }
}

const find = (id) => DOCS.find((d) => d.id === Number(id))

/** GET /inspections/{id}/ocr */
export function ocr(id) {
  const doc = find(id)
  if (!doc) return { error: { code: 'NOT_FOUND', message: '없는 서류입니다.', status: 404 } }
  advance(doc)
  if (doc.status === 'FAILED') return { error: { code: 'OCR_FAILED', message: '글자를 읽지 못했습니다. 더 선명하게 스캔해 다시 올리세요.', status: 422 } }
  const done = doc.status === 'REVIEW' || doc.status === 'DONE'
  const fields = done ? doc.fields.map((f) => ({ ...f, label: labelOf(doc.formType, f.key) })) : []
  return {
    data: {
      id: doc.id,
      status: doc.status,
      progress: doc.progress,
      formType: doc.formType,
      pageCount: 1,
      fileName: doc.fileName,
      fields: copy(fields),
      needCheckCount: fields.filter((f) => f.needCheck).length,
      // 추가 필드: 저장한 사람·시각 (저장된 서류를 열 때 '저장했습니다 · 11-12 16:44' 표시)
      reviewedBy: doc.reviewedBy,
      reviewedAt: doc.reviewedAt,
    },
  }
}

/** GET /inspections/{id}/file → 원본 그림 주소 (예시는 F01 그림 하나) */
export function fileUrl(id) {
  return find(id)?.formType === 'F01' ? f01Scan : null
}

/**
 * PUT /inspections/{id} { status: REVIEW | DONE, fields: [{ key, value, checked }] }
 * - DONE 인데 확인하지 않은 칸이 남으면 409 NEED_CHECK_REMAINS
 */
export function save(id, { status, fields }, by) {
  const doc = find(id)
  if (!doc) return { error: { code: 'NOT_FOUND', message: '없는 서류입니다.', status: 404 } }
  const byKey = Object.fromEntries(fields.map((f) => [f.key, f]))
  const next = doc.fields.map((f) => {
    const sent = byKey[f.key]
    if (!sent) return f
    const changed = sent.value !== f.value
    // 값을 고치거나 '확인'을 누르면 확인 필요가 풀림
    return { ...f, value: sent.value, needCheck: f.needCheck && !(sent.checked || changed) }
  })
  if (status === 'DONE' && next.some((f) => f.needCheck)) {
    return { error: { code: 'NEED_CHECK_REMAINS', message: '확인 필요 칸이 남아 있어 저장할 수 없습니다.', status: 409 } }
  }
  doc.fields = next
  doc.status = status
  if (status === 'DONE') {
    doc.reviewedBy = by
    doc.reviewedAt = iso(new Date())
    // 이번 달 현황: 완료 하나 늘고 예정 하나 줄어듦 (연결된 점검 일정이 완료로)
    SUMMARY.done += 1
    SUMMARY.planned = Math.max(0, SUMMARY.planned - 1)
  }
  return { data: { id: doc.id, status: doc.status, reviewedBy: doc.reviewedBy, reviewedAt: doc.reviewedAt, scheduleId: 640 } }
}

/** POST /inspections/{id}/ocr (다시 인식: 고친 값을 지우고 처음부터) */
export function reocr(id) {
  const doc = find(id)
  if (!doc) return { error: { code: 'NOT_FOUND', message: '없는 서류입니다.', status: 404 } }
  doc.status = 'RECOGNIZING'
  doc.progress = 0
  doc.startedAt = Date.now()
  doc.ocrMs = 8000
  doc.fields = f01Fields(doc.uploadedAt.slice(0, 10))
  return { data: { id: doc.id, status: doc.status } }
}

/* ───────── 이번 달 현황 (GET /inspections/summary) ───────── */
const SUMMARY = { done: 32, planned: 7, delayed: 2 }
// 서류별 저장·전체 (설계안 DL: 저장 / 검수 대기 / 미제출)
const BY_FORM_BASE = { F01: [18, 1], F02: [24, 0], F03: [10, 2], F04: [6, 1], F05: [4, 0] } // [저장, 미제출]

/** 점검 일정 점 (설계안 ev: 날짜 → 완료 g · 예정 b · 지연 r). 이번 달 날짜에 맞춤 */
const EVENTS = { 2: 'g', 3: 'gg', 4: 'g', 5: 'g', 6: 'gr', 9: 'g', 10: 'gg', 11: 'gr', 12: 'gb', 13: 'b', 16: 'b', 17: 'bb', 19: 'b', 20: 'b', 23: 'b', 26: 'b', 30: 'b' }

export function summary(month) {
  DOCS.forEach(advance)
  const [y, m] = (month || ymd(new Date()).slice(0, 7)).split('-').map(Number)
  const review = (t) => DOCS.filter((d) => d.formType === t && d.status === 'REVIEW').length
  const savedToday = (t) => DOCS.filter((d) => d.formType === t && d.status === 'DONE' && d.reviewedAt?.slice(0, 10) === ymd(new Date())).length
  const byForm = FORMS.map((f) => {
    const [saved, missing] = BY_FORM_BASE[f.formType]
    const done = saved + savedToday(f.formType)
    const r = review(f.formType)
    return { formType: f.formType, name: f.name, done, review: r, total: done + r + missing }
  })
  const total = SUMMARY.done + SUMMARY.planned + SUMMARY.delayed
  const last = new Date(y, m, 0).getDate()
  const calendar = Object.entries(EVENTS)
    .filter(([d]) => Number(d) <= last)
    .map(([d, ev]) => ({
      date: `${y}-${pad(m)}-${pad(Number(d))}`,
      done: [...ev].filter((c) => c === 'g').length,
      planned: [...ev].filter((c) => c === 'b').length,
      delayed: [...ev].filter((c) => c === 'r').length,
    }))
  return { month: `${y}-${pad(m)}`, rate: Math.round((SUMMARY.done / total) * 100), ...SUMMARY, byForm, calendar }
}

/** 그날 점검 목록 (명세서에 없음 — 달력 날짜를 누를 때 보여 줄 목록, 추가 요청) */
const SCHEDULE_NAMES = ['환기·배기설비 점검', '수변전설비 점검', '밀폐공간 작업 전 점검', '안전보건교육']
export function daySchedule(date) {
  const cell = summary(date.slice(0, 7)).calendar.find((c) => c.date === date)
  if (!cell) return []
  const d = Number(date.slice(8, 10))
  const states = [...Array(cell.done).fill('DONE'), ...Array(cell.planned).fill('PLANNED'), ...Array(cell.delayed).fill('DELAYED')]
  return states.map((status, i) => ({
    scheduleId: 600 + d * 3 + i,
    title: SCHEDULE_NAMES[(d + i) % 4],
    processName: `5공장 ${PROC[(d + i) % 4]}`,
    status,
  }))
}
