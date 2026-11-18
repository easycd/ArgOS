# 연계 서버 구현 API (로그인 외)

API 명세서 기준으로 구현한 것과, 명세서와 다르게 한 점입니다. 주소는 모두 `/api/v1` 아래입니다.
화면이 부르는 API는 전부 로그인 토큰이 필요하고, 서버가 요청마다 권한·담당 범위를 확인합니다.

## 구조

```
웹·앱 ──REST/SSE──▶ 연계 서버 ──HTTP──▶ 중앙 서버 (/api/v1/internal/**)
                     │                    마스터·현재 상태·추이·이벤트·경보 원본, 설비 명령
                     └─ 연계 DB: 사용자·로그인(V1), 조치 이력·체크리스트(V2)
```

- 사업장·공장·공정·설비·센서 마스터는 연계 DB 에 두지 않고 중앙에서 받아 30초 캐시합니다 (`MasterCache`).
- "지금"은 중앙 서버의 시연 시계를 따릅니다 (`SimTime`, 그날은 2026-11-16 09:00).
- 실시간은 중앙 피드를 1초마다 가져와 SSE 로 보냅니다 (`FeedPoller`).
- 화면 값으로 바꿔서 줍니다: 단계 1/2/3 → `NORMAL/WARN/ALARM`, 센서 TE/IT/AT/IR → `TEMP/CURRENT/CO/IR`, 운전 RUN → `RUNNING`.

## 설정

| 환경변수 / 설정 | 기본값 | 설명 |
| --- | --- | --- |
| `argos.central.base-url` (`CENTRAL_SERVER_BASE_URL`) | `http://localhost:8081` | 중앙 서버 주소 |
| `argos.central.api-key` (`CENTRAL_API_KEY`) | 비어 있음 | 중앙 서버 `ARGOS_INTERNAL_API_KEY` 와 같은 값 |
| `argos.central.feed-enabled` | `true` | 실시간 피드 가져오기 (테스트에서는 꺼도 됨) |

## API

| 화면 | API | 권한 | 비고 |
| --- | --- | --- | --- |
| 공통 | `GET /system/clock` | 로그인 | 시연 시계. 화면의 "오늘"은 이 값 기준 |
| A2 | `GET /sites` | 본사 | |
| A2 | `GET /sites/{id}/tree` | 본사 | 공장마다 `todayAlarmCount` 추가 |
| B1 | `GET /sites/{id}/overview` | 본사·공장 | 공장마다 `accessible`(내가 들어갈 수 있는지) 추가 |
| H1 | `GET /factories?siteId=` · `GET /processes?factoryId=` | 본사·공장 | 담당 범위만 |
| B2 | `GET /factories/{id}/overview` | 본사·공장 | `equipmentLevels`, `siteId`, `siteName` 추가 |
| B3 | `GET /processes/{id}/layout` | 전체 | `version` 은 1 고정, `floorplan` 은 null (파일 없음) |
| B3 | `GET /processes/{id}/status` | 전체 | 센서마다 `lowWarn`·`lowAlarm` 추가 (전류는 아래쪽 기준도 있음) |
| B4 | `GET /equipment/{id}` | 전체 | 센서 게이지 `max` 는 경보 기준 × 1.3 |
| B4 | `GET /equipment/{id}/events?date=&type=` | 전체 | ALARM(시작·해제), ACTION(조치 이력). THRESHOLD 는 아직 (변경 이력은 `/thresholds/history`) |
| B4 | `GET /sensors/series?ids=&from=&to=&step=&compare=yesterday` | 전체 | 최근 1시간은 5초, 그 이상은 1분·10분 |
| B1 | `GET /alarms?siteId·factoryId·processId&date=&from=&to=&status=&minLevel=&page=&size=` | 전체 | 줄마다 `checklist`(진행), `assignee`, `actionMinutes`, `valueStillOver` 추가 |
| B1 | `GET /alarms/hourly?siteId·factoryId&date=` | 본사·공장 | |
| B1 | `GET /alarms/{id}` | 전체 | 조치 내역 timeline |
| C1 | `GET /alarms/{id}/detail` | 전체 | `templateId`, `usual`(주 센서 직전 7일 평균), `rule.max`(경보 × 1.3), `trend.unit·warn·alarm` 추가. `thermal` 은 IR 센서 값 요약 (아래 '열화상') |
| C4 | `GET /alarms/{id}/response` | 전체 | `fireId` 는 null (화재 판정 전). `location`, `reasonDetail`('TE-305 163.9 ℃ (평소의 117%)', 평소 = 직전 7일 평균), `thermal`(주의 상세와 같은 IR 요약), `shutdown` 추가 (아래 '경보 셧다운 진행') |
| C0 | `POST /alarms/{id}/ack` | 공장 | 409 `ALARM_ALREADY_ACKED` (`error.ackedBy`) |
| C4 | `POST /alarms/{id}/close` `{ result, followUp }` | 공장 | 409 `VALUE_STILL_OVER` (`error.sensors`) |
| I1 | `GET /notifications/summary` | 전체 | 채팅·화재는 아직 0 / null |
| C1 | `GET /checklist-templates?equipmentType=&sensorType=` | 본사·공장 | |
| C1 | `GET /processes/{id}/workers` | 본사·공장 | `onDuty` 는 항상 true (근무조 정보 없음) |
| C1 | `POST /checklists` | 공장 | 푸시 실패해도 201, `push: "FAILED"` (명세서는 502) |
| I1 | `GET /checklists?status=&factoryId=` | 본사·공장 | |
| C2 | `GET /checklists/{id}` | 전체 | 공정 담당자는 자기 것만. `serverTime`(시연 시계 지금) 추가 → 화면 경과 시간용 |
| C2 | `POST /checklists/{id}/remind` | 공장 | 30초 잠금, 429 `REMIND_COOLDOWN` |
| C2 | `PATCH /checklists/{id}/assignee` | 공장 | |
| C2 | `POST /checklists/{id}/confirm` | 공장 | 값이 아직 기준 위면 체크리스트는 확인, 알림은 열린 채 409 `VALUE_STILL_OVER` |
| M2 | `GET /me/checklists?status=ACTIVE·DONE` | 공정 | |
| M2 | `PATCH /checklists/{id}/items/{itemId}` | 공정 | |
| M2 | `POST /checklists/{id}/report` | 공정 | 409 `ITEMS_NOT_DONE` |
| M1 | `POST /me/push-token` · `DELETE /me/push-token` | 로그인 | |
| B3 | `POST /equipment/{id}/fan` `{ power }` 또는 `{ rpm }` | 공장 | 202, 결과는 SSE `command.result` |
| C4 | `POST /equipment/{id}/shutdown` `{ alarmId, reason }` | 공장 | 202 |
| C4 | `POST /processes/{id}/shutdown` `{ alarmId, equipmentIds, reason }` | 공장 | 202, 이미 정지된 설비는 건너뜀 |
| C4 | `POST /processes/{id}/call-workers` `{ alarmId }` | 공장 | |
| 실시간 | `GET /stream?scope=process:12` | 로그인 | 아래 |

### SSE (`GET /stream`)

`sensor.value`(그 공정을 볼 때만) · `level.changed` · `alarm.created` · `alarm.updated` · `checklist.updated` ·
`command.result` · `threshold.changed` · `reset` · `ping`(15초). 모양은 명세서와 같고, 다음이 다릅니다.

- `alarm.updated` 에 `level`, `hazard`, `valueStillOver` 를 함께 보냄 (값이 기준 아래로 30초 유지되면 `valueStillOver: false` → 종료 버튼 켜기)
- `threshold.changed` `{ equipmentId, processId, season, at }`: 명세서에 없던 이벤트. 기준값이 바뀌면 B3·B4 게이지 기준을 다시 불러오면 됨
- `reset`: 시연 리셋·중앙 재시작 때. 화면은 전부 다시 불러오면 됨
- `Last-Event-ID` 로 놓친 이벤트 다시 받기는 아직 없음
- `fire.started` · `fire.updated` · `fire.cleared` · `chat.message` 추가 (아래 화재·채팅 참고)
- `thermal.frame` 은 아직 없음

### 기준값 관리 (D2)

권한: 본사·공장 관리자 (공장 관리자는 담당 공장 설비만).

| API | 비고 |
| --- | --- |
| `GET /equipment/tree?factoryId=` | 공정 › 설비 › 센서 트리 |
| `GET /equipment/{id}/thresholds` | 센서별 계절(`ALL`·`SUMMER`·`WINTER`…) 기준, `legal`(CO 법정 30ppm), `activeSeason`, `version`. 지속 조건은 초(`warnHoldSec`·`alarmHoldSec`) |
| `POST /thresholds/simulate` `{ sensorId, warn, alarm, lowWarn, lowAlarm, warnHoldSec, alarmHoldSec, days }` | 지난 N일(기본 7) 1분 추이로 "지금 기준 vs 바꾼 기준" 발생 건수 비교 (`current`·`proposed`·`diff`·`hits`) |
| `PUT /equipment/{id}/thresholds` `{ season, version, reason, sensors: [...] }` | 사유 필수. 바로 판정에 반영(`appliedNow: true`, 진행 중 판정은 유지). 오류 `REASON_REQUIRED`, 409 `THRESHOLD_CONFLICT`(다른 사람이 먼저 저장), `WARN_NOT_BELOW_ALARM`, `LOOSER_THAN_LEGAL`. 이용 로그 `THRESHOLD` |
| `GET /thresholds/history?equipmentId=&sensorId=&from=&to=` | 변경 전·후, 변경자 이름 (최초 값은 "초기 설정") |
| `GET /sensors/{id}` · `PUT /sensors/{id}` `{ sampleSec, active }` | 센서 수집 주기·사용 여부 |

- 화면은 초, 중앙 DB 는 샘플 수로 저장합니다. 샘플 = 초 ÷ 수집 주기(올림, 최소 1).
- 기준값은 "지금 계절" 행이 우선, 없으면 `ALL`. 계절은 시연 시계 날짜 기준 (11월 = 가을).

### 통계 · 이력 (D1)

권한: 본사·공장 관리자. 모든 API 가 같은 조건을 받습니다:
`from`·`to`(필수, `2026-11-10` 형식, 끝 날짜 포함) · `factoryId` · `processId` · `sensorType`(CURRENT·TEMP·CO·IR) · `level`(WARN·ALARM) · `shift`(DAY 07~19시 · NIGHT).
센서 종류는 경보의 대표 센서 기준, 근무조는 발생 시각 기준. 한 번에 최대 1년.

| API | 비고 |
| --- | --- |
| `GET /stats/summary` | `alarmCount`·`dangerCount`(경보 단계)·`avgActionMinutes`(종료된 것만)·`checklistDoneRate`(%) 마다 `{ value, diff }`. diff 는 바로 앞 같은 길이 기간 대비 |
| `GET /stats/trend?unit=HOUR·DAY·WEEK` | `points[{ key, warn, alarm, day, night }]`, 빈 구간도 0 으로 채움. unit 을 비우면 1일→HOUR, 62일 이하→DAY, 그 이상→WEEK |
| `GET /stats/by-process` | 공정별 `CURRENT·TEMP·CO·IR·total`, 많은 순 |
| `GET /stats/heatmap` | `cells[{ dow(월=1), hour, count }]`(0건 칸 생략), `max` |
| `GET /stats/alarms?sort=raisedAt,desc·actionMinutes,desc&page=&size=` | 이력 표. 줄 모양은 `/alarms` 와 같음 (명세서의 `/alarms` 필터 추가 대신 별도 주소) |
| `GET /stats/export?format=csv` | 지금 조건 그대로 CSV (UTF-8 BOM, 엑셀에서 바로 열림). **`format=xlsx` 도 지금은 CSV 로 줍니다.** 5만 건 초과는 400 `EXPORT_TOO_LARGE`. 이용 로그 `EXPORT` |

- 월간 보고서 PDF (`/reports/monthly`) 는 아직 없습니다.
- 계산은 연계 서버에서 합니다: 기간 경보를 중앙에서 500건씩 받아 거른 뒤 셉니다 (시연 데이터 규모 기준).

### 열화상 · 오늘 점검 (시연용 최소 구현)

| 화면 | API | 권한 | 비고 |
| --- | --- | --- | --- |
| B4 | `GET /thermal/{cameraId}/latest?equipmentId=` | 전체 | `cameraId` = IR 센서 id. 실제 그림(VMS)이 없어 `imageUrl` 은 null, `level` 로 화면이 예시 그림을 고름. `max` = IR 지금 값, `min`·`avg` 는 null. 카메라가 보는 설비(IR 센서가 든 관제 단위의 설비)가 아니면 값·`zone` 없이 줌 |
| B3 | `GET /inspections/today?processId=` | 전체 | 점검 기능 전이라 `{ doneCount: 0, totalCount: 0, items: [] }` |

- 알림 상세(`/alarms/{id}/detail`)의 `thermal`: `{ cameraId, cameraTag, imageUrl(null), level, max, avg, usualAtMax, maxPoint, scale, zoneName }`.
  `avg` = IR 최근 1시간 평균, `usualAtMax` = IR 지난 7일 평균. 공정에 IR 센서가 없으면 null.
- 없는 주소는 500 이 아니라 404 `NOT_FOUND`.

### 경보 셧다운 진행 (`/alarms/{id}/response` 의 `shutdown`)

`{ equipmentIds, startedAt, steps: [{ label, at }], done, auto: false }`. 셧다운 전이면 null.
- 대상 = 이 경보로 셧다운 명령을 보낸 설비 (조치 이력 `SHUTDOWN`), `done` = 대상 설비가 모두 정지(STOPPED)
- 단계: 버너 연료 차단(명령 시각) → 컨베이어 정지(+1초) → 배기팬 정지(모두 정지된 뒤). 설비가 단계별로 응답하지 않아 시각은 명령 기준으로 보여 줍니다
- 화면은 SSE `command.result` 가 오면 다시 불러오면 됨
- 알림 타임라인(`/alarms/{id}`)에서 확인 단추 없이 셧다운으로 조치에 들어간 경우 단계 이름은 `ACK`, 종료는 `CLOSE` (전에는 `ACKED`·`CLOSED`)

### 주의 알림 자동 종료

값이 기준 위일 때 조치 확인을 하면(409 `VALUE_STILL_OVER`) 체크리스트만 확인되고 알림은 열려 있습니다.
주의 창에는 종료 단추가 없으므로, 연계 서버가 실시간 피드에서 그 알림의 값이 기준 아래로 돌아온 것(`valueStillOver: false`)을 보면
체크리스트를 확인한 사람 이름으로 알림을 닫습니다 (조치 이력 `CLOSE` "값이 기준 아래로 돌아와 자동 종료"). 경보(3단계)는 대상이 아닙니다 (셧다운 뒤 '경보 종료').

### 사용자 관리 (G1) · 내 정보 수정 (A1)

| 화면 | API | 권한 | 비고 |
| --- | --- | --- | --- |
| G1 | `GET /users?role=&factoryId=&active=&q=&page=&size=` | 본사·공장 | `{ counts, inactiveCount, items, page, size, total }`. `counts`·`inactiveCount` 는 내가 볼 수 있는 사람 전체 기준(검색 조건과 상관없음). 줄마다 `scopeText`, `factoryId` 추가. 한 쪽 15행이 기본 |
| G1 | `GET /users/{id}` | 본사·공장 | `scope`, `scopeText`, `createdAt`, `lastLoginAt`, `pushReady`(앱 푸시 토큰 등록됨), `history[{ at, by, text }]` (최근 50건) |
| G1 | `GET /users/check-login-id?loginId=` | 본사·공장 | `{ available }`. 규칙(영문 소문자·숫자·밑줄 4~20자)에 안 맞거나 삭제한 사용자 아이디도 false |
| G1 | `POST /users` `{ name, loginId, phone, role, scope: { factoryIds, processIds } }` | 본사·공장 | `{ id, tempPassword }`. 임시 비밀번호는 이때 한 번만. 첫 로그인 때 비밀번호 변경(`pwResetRequired`) |
| G1 | `PUT /users/{id}` `{ name, phone, role, scope }` | 본사·공장 | `{ id, role, scopeText }` |
| G1 | `PATCH /users/{id}/status` `{ active }` | 본사·공장 | `{ id, active }`. 정지하면 바로 로그인·API 사용 불가 (403 `USER_INACTIVE`) |
| G1 | `DELETE /users/{id}` | 본사·공장 | 행은 남김(`deleted_at`, V3). 목록·로그인에서 빠지고 아이디는 다시 못 씀 |
| G1 | `POST /users/{id}/reset-password` | 본사·공장 | `{ tempPassword }`, 다음 로그인 때 비밀번호 변경 |
| A1 | `PUT /me` `{ name, phone }` | 로그인 | `{ id, name, phone }` (공정 담당자 앱도 사용) |

- 담당 범위: 본사 관리자는 범위 없음 / 공장 담당자는 `factoryIds` 1개 이상 / 공정 담당자는 `processIds` 1개 이상 (공장은 공정에서 정함, `factoryIds` 는 무시). 한 사업장 안에서만
- 권한 범위 (화면설계서 G1): 본사 관리자는 전부. 공장 담당자는 담당 공장의 공장 담당자·공정 담당자만 보고 고침 (본사 관리자는 안 보임, 본사 관리자 권한은 못 줌). 공정 담당자는 403
- 오류: 400 `VALIDATION_FAILED`·`SCOPE_REQUIRED`, 403 `ROLE_NOT_ALLOWED`(줄 수 없는 권한, 내 권한 변경)·`OUT_OF_SCOPE`, 404 `NOT_FOUND`,
  409 `LOGIN_ID_TAKEN`·`CANNOT_DISABLE_SELF`·`CANNOT_DELETE_SELF`·`LAST_PLANT_ADMIN`(그 공장의 마지막 공장 담당자를 정지·삭제·권한 변경)·`HAS_ACTIVE_CHECKLIST`(끝나지 않은 체크리스트가 있는 사람을 정지·삭제하거나 공정을 뺌)
- 변경은 이용 로그(`activity_log`, 유형 `USER`)에 "이름(아이디) · 내용"으로 남고, 상세의 `history` 는 그중 "내용"만 보여 줌. 기록 시각은 시연 시계 기준
- `PUT /me/password` 에서 지금 비밀번호가 틀릴 때 401 → 화면이 로그아웃되는 문제(프론트 backend-notes 14장 1번)는 로그인 코드라 아직 그대로

### 이용 로그 (G2)

권한: 본사·공장 관리자 (공장 관리자는 자기 사업장·담당 공정 범위만).

| API | 비고 |
| --- | --- |
| `GET /logs?from=&to=&factoryId=&processId=&userId=&type=&q=&page=&size=` | `items[{ id, at, loginId, name, role, scopeText, type, message, before, after }]`, `countsByType`, `byHour`(0~23시 24칸), `topUsers`(많이 쓴 4명, 명세서에 없음), `page`, `size`, `total` |
| `GET /logs/export` | 같은 조건 CSV (UTF-8 BOM). 내려받은 것도 `EXPORT` 로 남음 |

- `activity_log` 와 로그인 성공 기록(`login_history`)을 합쳐 보여 줌. 로그인 줄은 유형 `LOGIN`, id 는 음수(-이력 id)
- `type` 은 `LOGIN,LOGOUT` 처럼 쉼표로 여러 개. `countsByType` 은 유형 조건을 빼고 셈 (화면에서 다른 유형 칸으로 바꿀 수 있게)
- 로그인 기록 시각은 실제 시각, 다른 작업 로그는 시연 시계 시각

### 채팅 (I2)

권한: 본사·공장 관리자 (공정 담당자는 403 `CHAT_NOT_ALLOWED`). 대화방 = 사업장, `roomId` = 사업장 id.

| API | 비고 |
| --- | --- |
| `GET /chat/rooms` | 본사는 사업장 전부, 공장 담당자는 자기 사업장 방 하나. `peer`(상대 대표 1명, `online` = SSE 접속 중), `lastMessage`, `unreadCount` |
| `GET /chat/rooms/{roomId}/messages?before=&size=` | 오래된 것 → 최근 순, 기본 30개, `hasMore`. 내 글의 `read` 는 상대가 읽었는지 |
| `POST /chat/rooms/{roomId}/messages` `{ body, alarmId }` | 1~1,000자 (400 `VALIDATION_FAILED`). 보내면 SSE `chat.message` `{ roomId, id, senderId, senderName, body, alarmId, sentAt }` |
| `POST /chat/rooms/{roomId}/read` `{ lastReadMessageId }` | `{ unreadCount }` |

### 화재 대응 (C4F · C5)

| API | 권한 | 비고 |
| --- | --- | --- |
| `GET /fires?status=ACTIVE|CLEARED&siteId=` | 전체 (담당 범위만) | 진행 중 화재 목록 (지도 위치 `lat`·`lng` 는 사업장 좌표) |
| `GET /fires/{fireId}` | 전체 (담당 범위만) | 위치, 판정 근거, 열화상 최고 온도, 방송 상태, `unlock`, `actions`(DETECTED · BROADCAST · SHUTDOWN · EVACUATED) |
| `POST /fires/{fireId}/clear` `{ password, memo }` | 공장 담당자 | 로그인한 사람 비밀번호 재확인. 401 `FIRE_PASSWORD_MISMATCH`(`remaining`), 5회 틀리면 423 `FIRE_UNLOCK_LOCKED`, 본사는 403 `ACTION_NOT_ALLOWED`. 해제하면 방송 종료, 경보 종료, 이용 로그 `FIRE_CLEAR`, SSE `fire.cleared` |
| `POST /fires/{fireId}/approve-unlock` | 본사 관리자 | 실패 횟수 0으로. SSE `fire.updated` |

- **화재 판정 (가정)**: 위험 종류 화재(FIRE) 경보가 3단계이고 근거에 열화상(IR) 센서 이벤트가 있으면 화재. 중앙 경보 피드를 보다가 그 순간 `fire_incident` 를 만들고 SSE `fire.started` 를 보냄. 판정 기준이 바뀌면 `FireService.isFire` 한 곳만 고치면 됨
- 경고 방송은 방송 시스템 API 가 정해지기 전까지 로그만 남김 (`BroadcastSender`). 조치 이력에는 `BROADCAST` 로 남음
- 열화상 `min`·`avg` 와 대피 확인(EVACUATED) 입력 API 는 아직 없음. 대피 수는 조치 이력의 `EVACUATED` 를 셈
- 테이블: `V4__gateway_chat_fire.sql` (`chat_message`, `chat_read`, `fire_incident`, 테이블 명세서 v5 기준)

## 아직 없는 것

월간 보고서 PDF, xlsx 내보내기, 점검·OCR(`/inspections/*`, 오늘 점검은 빈 목록만), 공장 관리(배치 저장),
대피 확인 입력, 실제 FCM 전송·방송 시스템 연동, `thermal.frame`.
