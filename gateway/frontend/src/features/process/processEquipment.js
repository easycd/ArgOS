/**
 * 화면용 설비 목록 만들기: 배치도(layout) + 지금 값(status) 을 합침
 * - 공정 배치도(ProcessPage)와 설비 상세(EquipmentPage, 설비 위치 그림)가 같이 씀
 * - key: 그림 안 설비 이름 (code 'PNT-TOP-OVEN' → 'top-oven')
 * - sensors: 이 설비에 붙은 센서 + 지금 값·단계
 */
import { svgKeyOf } from './paintLayout'
import { LEVEL } from '@/types/codes'

export function buildProcessEquipment(layout, status) {
  if (!layout || !status) return []
  const sensorNow = (id) => status.sensors.find((s) => s.id === id) ?? {}
  return layout.equipment.map((e) => {
    const now = status.equipment.find((x) => x.id === e.id) ?? {}
    return {
      id: e.id,
      key: svgKeyOf(e.code),
      name: e.name,
      seq: e.seq,
      level: now.level ?? LEVEL.NORMAL,
      fan: now.fan ?? null,
      sensors: layout.sensors.filter((s) => s.equipmentId === e.id).map((s) => ({ ...s, ...sensorNow(s.id) })),
    }
  })
}
