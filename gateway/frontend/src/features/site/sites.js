/**
 * 임시 사업장·공장 목록
 * - 백엔드 사업장 API(GET /sites)가 준비되기 전까지 화면 확인용으로 사용
 * - 설계: 사업장 울산·아산·전주, 이번 범위는 울산 5공장만 진입 가능
 * - 공장 ID 형식('ulsan-5')은 임시값 → DB의 실제 ID 형식이 정해지면 교체
 */
export const SITES = [
  {
    id: 'ulsan',
    name: '울산',
    factories: [{ id: 'ulsan-5', name: '울산 5공장', enabled: true }],
  },
  { id: 'asan', name: '아산', factories: [] },
  { id: 'jeonju', name: '전주', factories: [] },
]

/** 공장 ID 로 공장 이름 찾기 (없으면 ID 그대로 표시) */
export function getFactoryName(factoryId) {
  for (const site of SITES) {
    const factory = site.factories.find((f) => f.id === factoryId)
    if (factory) return factory.name
  }
  return factoryId
}
