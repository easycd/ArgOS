/**
 * '데이터가 바뀌었다' 신호 (실시간 갱신 자리)
 * - 화면은 live.revision 이 바뀌면 자기 데이터를 조용히 다시 불러옴 (utils/useLiveReload.js)
 * - 지금(예시 데이터 모드): 상황 바꾸기 도구·주의 확인·체크리스트 전송 등 예시 상황이 바뀔 때 emitLive 를 부름
 *   (api/mock/scenario.js)
 * - TODO(SSE 작업): 실제 서버에 붙이면 GET /stream 을 EventSource 로 열고, 아래 이벤트가 오면 emitLive(이벤트 이름)
 *   alarm.created · alarm.updated · checklist.updated · level.changed · sensor.value · threshold.changed · command.result
 *   (백엔드 gateway/backend .../stream/StreamHub 와 같은 이름)
 */
import { reactive } from 'vue'

export const live = reactive({
  /** 바뀔 때마다 1씩 커지는 번호 (화면은 이 값만 지켜봄) */
  revision: 0,
  /** 마지막 이벤트 이름 (예: 'alarm.created') — 디버깅·강조 표시용 */
  lastEvent: '',
})

/** 데이터가 바뀌었음을 알림 */
export function emitLive(event) {
  live.lastEvent = event
  live.revision += 1
}
