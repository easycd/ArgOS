# 백엔드 전달 사항 (프론트엔드 기준)

프론트엔드는 백엔드 개발 전이라 **예시 데이터(mock)** 로 화면을 만들고 있습니다.

- **기준 문서**: 설계 자료의 `ArgOS_API명세서.html` (API 87개, 프론트 쪽에서 화면 기준으로 먼저 적은 제안)
  - 설계 자료 묶음은 git에 올리지 않으므로, 필요하면 PM에게 받아 주세요.
- **이 문서**: 프론트가 실제로 구현한 API, 명세서와 **다르게 한 점 / 추가로 필요한 점 / 정해야 할 점**만 화면별로 정리합니다. 화면을 만들 때마다 계속 추가합니다.
- 예시 데이터 값: `gateway/frontend/src/api/mock/data.js` (명세서 응답 예시와 같은 모양)
- API 호출 코드: `gateway/frontend/src/api/*.js` (각 함수의 `http.get/post` 부분이 실제 요청)
- 예시 데이터 끄기: `gateway/frontend/.env` 에 `VITE_USE_MOCK=false` → `/api` 요청이 `http://localhost:8080` (gateway/backend) 으로 감

---

## 1. 공통 (명세서 '공통 규칙'과 같게 구현)

| 항목 | 프론트 구현 | 위치 |
| --- | --- | --- |
| 기본 주소 | `/api/v1` | `src/api/http.js` |
| 성공 응답 | `{ success: true, data }` → 화면에는 `data` 만 전달 | `src/api/http.js` |
| 실패 응답 | `{ success: false, error: { code, message } }` → `error.message` 를 화면에 그대로 표시 | `src/api/http.js` |
| 인증 | `Authorization: Bearer <accessToken>` | `src/api/http.js` |
| 401 | 지금은 로그인 상태에서 401 이면 로그아웃 후 로그인 화면으로 | `src/api/http.js` |
| 단계 | `NORMAL` / `WARN` / `ALARM` / `FIRE` | `src/types/codes.js` |
| 권한 | `HQ_ADMIN` / `PLANT_ADMIN` / `WORKER` | `src/types/codes.js` |

### 아직 안 한 것

- SSE `GET /stream?scope=...`: 대시보드 작업 때 추가

### 부탁

- `error.message` 는 화면에 그대로 나가므로 **짧은 한국어 문장**으로 보내 주세요. (예: `아이디 또는 비밀번호가 맞지 않습니다`)

---

## 2. 로그인 (명세서 A1)

| API | 프론트 사용 | 명세서와 다른 점 |
| --- | --- | --- |
| `POST /auth/login` | 요청 `{ loginId, password, client: "WEB" }`. 응답의 `accessToken`, `user`, **`sessionExpiresAt`** 사용 | **응답에 `sessionExpiresAt`(로그인 유지 만료 시각) 추가 필요** (아래 '로그인 유지 시간') |
| **`POST /auth/extend`** | 상단 바 '연장' 버튼 | **명세서에 없음, 새로 필요** (아래 '로그인 유지 시간') |
| `POST /auth/logout` | 로그아웃 버튼 | 없음 |
| `POST /auth/refresh` | **쓰지 않음** | **확정(2026-11-16 재원님)**: 토큰 자체를 13시간 유효로 하는 A안이라 리프레시 없음 (아래 '로그인 유지 시간') |
| `GET /me` | 아직 안 씀 (새로고침 시 지금은 브라우저에 저장한 user 사용) | - |

### 프론트가 쓰는 응답 필드

| 필드 | 쓰는 곳 |
| --- | --- |
| `accessToken` | 모든 요청 헤더 |
| `sessionExpiresAt` | 상단 바 남은 시간, 자동 로그아웃 (없으면 프론트가 '지금 + 13시간'으로 계산) |
| `user.name`, `user.loginId` | 상단 바 사용자 메뉴, 로그인 직후 불러오기 화면 |
| `user.role` | 첫 화면 분기, 메뉴·화면 권한 |
| `user.scope.siteId` | 공장 담당자의 첫 화면(담당 사업장 현황), 다른 사업장 주소 차단 |
| `user.scope.factoryIds` | 공장 담당자가 들어갈 수 있는 공장 대시보드, 다른 공장 주소 차단 |

### 정해야 할 것

| 번호 | 내용 |
| --- | --- |
| 1 | **공장 담당자 첫 화면이 명세서와 다름 (가정)**: 명세서 `firstPage` 는 `FACTORY_DASHBOARD` 지만, 프론트는 화면설계안대로 **사업장 현황**(`/sites/{siteId}`)으로 보냄. 프론트는 `firstPage` 대신 `role` 과 `scope` 로 첫 화면을 정함. 확정되면 `gateway/frontend/src/router/home.js` 의 `PLANT_ADMIN_HOME` 한 줄만 바꾸면 됨 |
| 2 | 에러 `AUTH_LOCKED`(5회 잠김), `USER_INACTIVE`, `CLIENT_NOT_ALLOWED` 는 지금 `error.message` 를 그대로 보여 줌. 남은 횟수(`remaining`)·풀리는 시각(`unlockAt`) 표시가 필요한지 |
| 3 | `pwResetRequired: true` 일 때 갈 비밀번호 변경 화면이 설계안에 없음 |

- 예시 계정(mock 전용): `hq_admin`(본사 관리자), `ulsan5_admin`(공장 담당자, 5공장) / 비밀번호 `argos1234`

### 로그인 유지 시간 (2026-11-16 변경)

재원님 요청으로 **로그인하면 13시간 유지, '연장'을 누르면 1시간 늘어나는 방식**으로 바꿨습니다. 명세서의 '액세스 토큰 30분 + 리프레시'와 다릅니다.

**방식 확정(2026-11-16 재원님): A안** — 토큰 자체를 13시간 유효로 하고, `POST /auth/refresh` 와 리프레시 토큰은 쓰지 않습니다. 연장하면 서버가 같은 토큰(또는 새 토큰)의 만료 시각을 1시간 늘립니다. (토큰을 새로 발급한다면 `/auth/extend` 응답에 `accessToken` 도 함께 주세요.)

| 항목 | 프론트 구현 | 백엔드에 필요한 것 |
| --- | --- | --- |
| 유지 시간 | 로그인 시각 + 13시간 | 토큰 유효 시간 13시간 (A안 확정). 로그인 응답에 만료 시각 `sessionExpiresAt` (ISO, 예: `2026-11-17T05:30:00+09:00`) |
| 연장 | 상단 바 '연장' → 만료 시각 + 1시간 (남은 시간에 더함, **횟수 제한 없음**) | `POST /auth/extend` (본문 없음, 헤더 토큰으로 사용자 식별) → 응답 `{ "sessionExpiresAt": "..." }` 새 만료 시각. 서버에서도 만료 시각을 늘려야 함 |
| 만료 | 남은 시간이 0이 되면 자동 로그아웃 → 로그인 화면에 "로그인 유지 시간이 끝났습니다" 안내 | 만료된 토큰으로 요청하면 401 (프론트는 로그아웃 처리) |
| 안내 | 만료 10분 전에 한 번 안내 문구 ("곧 끝납니다, 연장을 누르면 1시간") | 없음 |
| 새로고침 | 만료 시각을 브라우저(localStorage)에 저장해서 유지 | 없음 |

- 아직 정해야 할 것: 연장 횟수·최대 시간 제한, 여러 탭·기기에서 같은 계정을 쓸 때 만료 시각을 공유할지
- 프론트 설정 위치: `gateway/frontend/src/features/session/sessionConfig.js` (13시간, 1시간, 10분)

---

## 3. 사업장 선택 (명세서 A2, 본사 관리자)

| API | 프론트 사용 | 명세서와 다른 점 |
| --- | --- | --- |
| `GET /sites` | 지도 핀, 도넛, 목록 머리줄 (`id, code, name, address, lat, lng, level, sensorLevels`) | 명세서 예시에서 아산·전주에 `address`, `sensorLevels` 가 빠져 있음 → **모든 사업장에 필요** |
| `GET /sites/{siteId}/tree` | 목록에서 사업장을 펼칠 때 (처음 한 번만) | 공장마다 **`todayAlarmCount`(오늘 알림 건수) 추가 필요** (화면 '오늘 알림' 칸) |
| `GET /sites/{siteId}/overview` | '이동'·지도 핀·도넛을 누르면 사업장 현황 화면으로 감 (아래 5번) | - |

### 프론트가 쓰는 `tree` 필드

| 필드 | 쓰는 곳 |
| --- | --- |
| `factories[].id`, `name`, `level` | 공장 줄 |
| `factories[].levelsByType` | 센서 단계 막대·개수 (전류·온도·CO 를 더해서 표시) |
| `factories[].processes[].name`, `level` | 공정별 단계 칩 (이름 끝의 ' 공정'은 화면에서 줄여서 표시) |
| `factories[].todayAlarmCount` | 오늘 알림 (**추가 요청**) |

### 정해야 할 것

| 번호 | 내용 |
| --- | --- |
| 1 | 지도 핀 위치는 지도 그림 좌표라 프론트에 사업장 코드(`ULS-01` 등)별로 적어 둠. 사업장이 늘면 프론트 수정 필요 |
| 2 | 이번 범위에서 들어갈 수 있는 곳은 울산공장 5공장(`factoryId 5`)뿐이라 프론트에 고정. 나머지는 '준비 중' 안내 |

---

## 4. 상단 바 (사업장 안 화면 공통)

| API | 프론트 사용 | 메모 |
| --- | --- | --- |
| (임시) 사업장 이름 | 상단 바 '📍울산공장' | 이름만 주는 API 가 명세서에 없음. 실제 연결 시 지금은 `GET /sites/{siteId}/overview` 의 `site.name` 을 씀 (공장 담당자는 `GET /sites` 권한이 없어서). **이름만 주는 가벼운 API 또는 `GET /me` 의 `scope.siteName` 사용 여부 합의 필요** |

- 주소 구조: 사업장 현황 `/sites/{siteId}`, 공장 대시보드 `/sites/{siteId}/factories/{factoryId}`, 메뉴 화면 `/sites/{siteId}/history` 등 (프론트 주소, API 주소와는 별개)

---

## 5. 사업장 현황 (명세서 B1 '울산공장 현황')

| API | 프론트 사용 | 명세서와 다른 점 |
| --- | --- | --- |
| `GET /sites/{siteId}/overview` | 구역 현황 지도 색, 전체 공장 상태 카드, 센서별 단계 현황 도넛 | 아래 표 참고 |
| `GET /alarms?siteId=&date=today&size=20` | 실시간 알림 목록 (최근 순) | 진행 상태 칩은 `status` 로만 표시 (아래 참고) |
| `GET /alarms/hourly?siteId=&date=today` | 시간대별 알림 (주간 07~19시, 야간 19~07시) | 없음. 알림 없는 시간은 프론트가 0으로 채움 |
| `GET /alarms/{alarmId}` | 아직 안 씀 (알림 줄을 눌러 조치 내역 펼치기는 다음 작업) | - |

### 프론트가 쓰는 `overview` 필드

| 필드 | 쓰는 곳 |
| --- | --- |
| `site.name` | 카드 제목 옆, 상단 바 |
| `levelsByType.CURRENT/TEMP/CO` | 센서별 단계 현황 (종류별 도넛, 합계) |
| `factories[].id`, `name`, `level` | 지도 구역 색, 공장 카드, 말풍선 |
| `factories[].code` | **지도 구역과 짝 맞춤** (`P1`~`P5`, `EV`=엔진·변속기). 명세서 예시에는 5공장(`P5`)만 있음 → **모든 공장에 code 필요, 값 합의 필요** |
| `factories[].levelsByType` | 공장 카드의 전류·온도·CO 작은 도넛. 명세서 예시에는 `CURRENT` 만 있음 → **TEMP·CO 도 항상 필요** |
| `factories[].sensorCount`, `todayAlarmCount` | 공장 카드 아래 줄, 말풍선 |
| `factories[].processes[].name`, `level` | 5공장 말풍선의 공정 목록 |

### 프론트가 쓰는 `alarms` 필드

| 필드 | 쓰는 곳 |
| --- | --- |
| `id`, `level`, `status`, `title`, `location` | 알림 줄 |
| `sensorType` | 아이콘 (전류 / 온도 / CO) |
| `sensorTag`, `value`, `unit` | 위치 옆 센서 값 |
| `raisedAt` | 시각 (`HH:mm:ss` 만 표시) |

- 진행 상태 칩: `OPEN` 발생 중 / `ACKED` 확인함 / `ACTING` 조치 중 / `CLOSED` 조치 완료
- 화면설계안에는 '체크리스트 진행 2/5', '공장 담당자 확인 대기' 같은 문구가 있지만 목록 응답에 체크리스트 진행 정보가 없음 → **목록에 체크리스트 진행(`checklist.doneCount/totalCount`) 을 넣을지 합의 필요**

### 정해야 할 것

| 번호 | 내용 |
| --- | --- |
| 1 | 지도: 프론트는 설계안 고정 그림(울산공장 2D 지도)을 쓰고, 명세서의 `site.mapUrl`·`factories[].mapShape` 는 아직 안 씀. 사업장이 늘어나 지도를 서버에서 받을 때 다시 맞춤 |
| 2 | 이번 범위에서 공정 배치도로 들어갈 수 있는 공장은 5공장(`factoryId 5`)뿐이라 프론트에 고정 |
| 3 | 실시간(SSE `level.changed`, `alarm.created`) 연결은 다음 작업. 지금은 화면을 열 때 한 번만 불러옴 |
| 4 | **숫자 맞춤**: 설계안은 사업장 화면에서 '5공장 센서 19개', 공장 화면에서 공정 센서 합 61개(12+16+19+14)로 서로 다름. 프론트 예시 데이터는 **공정 합(61개)** 으로 맞춰 사업장 합계가 154개가 됨. 실제 데이터에서는 공장 `sensorCount`·`levelsByType` 이 공정 합과 같아야 함 |

---

## 6. 공장 대시보드 (명세서 B2 '5공장 공정 현황')

| API | 프론트 사용 | 명세서와 다른 점 |
| --- | --- | --- |
| `GET /factories/{factoryId}/overview` | 공정 배치도 건물 색·이름표, 공정별 설비 상태 카드, 센서별 단계 현황(공정 합) | 아래 표 참고 |
| `GET /alarms?factoryId=&date=today&size=20` | 이 공장의 실시간 알림 | 없음 (사업장 현황과 같은 API, 범위만 공장) |
| `GET /alarms/hourly?factoryId=&date=today` | 이 공장의 시간대별 알림 | 명세서 B2 에는 없지만 B1 과 같은 API 를 공장 범위로 씀 → **factoryId 범위 지원 필요** |
| `GET /notifications/summary` | 상단 바 채팅·알림 빨간 숫자 (명세서 I1) | 없음 |

### 프론트가 쓰는 `overview` 필드

| 필드 | 쓰는 곳 |
| --- | --- |
| `factory.name`, `level` | 카드 제목·경로 |
| `processes[].id`, `name`, `level` | 건물 색, 이름표, 공정 카드 |
| `processes[].code` | **배치도 건물과 짝 맞춤** (`PRS` 프레스 / `BDY` 차체 / `PNT` 도장 / `ASM` 의장). 명세서 예시에는 `PNT` 만 있음 → **모든 공정에 code 필요, 값 합의 필요** |
| `processes[].equipmentCount`, `sensorCount` | 공정 카드, 요약 말풍선 |
| **`processes[].equipmentLevels`** | 공정 카드의 설비 단계 도넛(정상·주의·경보 설비 수). **명세서에 없음 → 추가 필요** (예: `{ "NORMAL": 13, "WARN": 1, "ALARM": 0 }`) |
| `processes[].levelsByType` | 공정 카드의 전류·온도·CO 막대, 공장 전체 센서별 단계(공정 합) |
| `processes[].hasFloorplan` | 누르면 3D 설비 배치도로 갈지('도장 공정'만 true), 아니면 '아직 등록되지 않았습니다' 안내 |
| `cameras[].tag`, `processId` | 열화상 카메라 표시(IR-01 등), 공정 카드 아래 줄 |

### 정해야 할 것

| 번호 | 내용 |
| --- | --- |
| 1 | 배치도 그림: 프론트는 설계안 고정 그림(5공장 공정 건물 4개)을 쓰고, 카메라 위치도 그림에 고정. 명세서 `cameras[].x, y` 는 아직 안 씀 |
| 2 | 사업장 이름(경로의 '울산공장'): 공장 overview 응답에 `siteId`·`siteName` 이 있으면 따로 안 불러도 됨 → 넣을지 합의 |
| 3 | 상단 바 상태 띠("주의 1건 · 상도 건조로 · 눌러서 확인")와 체크리스트 진행 칸은 경보 창·체크리스트 화면이 생길 때 같이 만듦. 지금은 채팅·알림 빨간 숫자만 |

---

## 7. 공정 3D 설비 배치도 (명세서 B3 '도장 공정 3D 배치도')

| API | 프론트 사용 | 명세서와 다른 점 |
| --- | --- | --- |
| `GET /processes/{processId}/layout` | 설비 목록(이름·순서), 센서가 어느 설비에 붙었는지 | 아래 표 참고 |
| `GET /processes/{processId}/status` | 설비 상태 테두리 색, 센서 이름표 색, 배기팬 상태, 상도 건조로 센서 게이지 | 없음 |
| `POST /equipment/{equipmentId}/fan` | 배기팬 창 '적용' → `{ power: "ON"/"OFF" }` 또는 `{ rpm: 600~1800 }` | 없음. 프론트는 접수(202) 되면 화면 값을 바로 바꿈 (**TODO: SSE `command.result` 로 확정·5초 안에 안 오면 되돌리기**) |
| `GET /alarms?processId=&date=today` | 이 공정의 실시간 알림 | **processId 범위 지원 필요** (명세서는 siteId·factoryId 예시만) |
| `GET /inspections/today?processId=` | 오늘 설비 점검 카드 | 없음 |

### 프론트가 쓰는 `layout` 필드

| 필드 | 쓰는 곳 |
| --- | --- |
| `name` | 경로·카드 제목 ('도장 공정') |
| `equipment[].id`, `name` | 설비 줄, 말풍선, 설비 상세로 이동 |
| `equipment[].code` | **그림 속 설비와 짝 맞춤** (`PNT-TOP-OVEN` → 그림의 상도 건조로). 모든 설비에 code 필요, 값 합의 필요 (프론트 가정: `PNT-PRETREAT`, `PNT-ED-TANK`, `PNT-ED-OVEN`, `PNT-SEALING`, `PNT-PRIMER-BOOTH`, `PNT-PRIMER-OVEN`, `PNT-TOP-BOOTH`, `PNT-TOP-OVEN`, `PNT-AHU`, `PNT-PAINT-MIX`, `PNT-INCINERATOR`) |
| **`equipment[].seq`** | 공정 흐름 순서 번호(1~8) — 그림과 아래 설비 줄의 파란 번호. **명세서에 없음 → 추가 필요** (공장 관리 화면에서 정하는 값으로 보임) |
| `sensors[].id`, `tag`, `type`, `unit`, `equipmentId` | 설비별 센서 묶기 (`equipmentId` 가 null 이면 예비 센서: 개수에는 넣고 그림에는 안 나옴) |

- `equipment[].pos`·`size`·`shape`, `sensors[].pos`, `floorplan` 은 아직 안 씀: 그림은 설계안 고정 그림(축측 SVG)이고 위치도 그림에 고정. 공장 관리(설비 재배치) 화면을 만들 때 이 값으로 그리는 방식을 다시 정함

### 프론트가 쓰는 `status` 필드

| 필드 | 쓰는 곳 |
| --- | --- |
| `equipment[].level` | 설비 둘레 상태 테두리 (주의·경보만 빛번짐) |
| `equipment[].fan.power`, `rpm` | 배기팬 창 (켜기/끄기, 회전수) |
| `sensors[].value`, `level`, `alarm` | 센서 이름표 색, 말풍선 값, 게이지(눈금 끝 = 경보 기준 × 1.2) |

### 정해야 할 것

| 번호 | 내용 |
| --- | --- |
| 1 | 버너실 테두리: 프론트는 설비의 **CO 센서 단계**로 칠함 (전류만 주의면 건물만 주황, 버너실은 초록). 서버가 버너를 별도 설비로 줄지, 설비 안 부품 단계로 줄지 |
| 2 | 배기팬 끄기: 명세서는 '2초 길게 누르기'인데 지금은 ON/OFF 버튼 + '적용' 두 번 누르기로 대신함 (실수 방지 방식 합의) |
| 3 | 공정 센서 수: 도장 공정 19개 = 전류 9 + 온도 6 + CO 4. 설계안 그림에는 CO 센서가 3개(CO-11~13)라, 예시 데이터에서는 4번째를 예비 센서 CO-14(설비 미연결)로 둠 |

---

## 8. 설비 상세 (명세서 B4 '설비 상세')

| API | 프론트 사용 | 명세서와 다른 점 |
| --- | --- | --- |
| `GET /equipment/{equipmentId}` | 제목 줄(경로·상태·체크리스트 진행), 게이지 3개(눈금·기준), 열화상 카메라 id | 아래 표 참고 (`processId`, `seq`, `sensors[].usual` 추가 필요) |
| `GET /equipment/{equipmentId}/events?date=today` | 이벤트 이력 (최근이 위) | **`type: RECORD`(가동 시작·일일 점검 완료 같은 기록) 추가 필요**, `status`(조치 중 표시) 추가 |
| `GET /thermal/{cameraId}/latest` | 열화상 그림, 최고·최저 온도, 최고 지점 | **`?equipmentId=` 로 그 설비 구역 값 요청** (명세서는 카메라 하나에 값 하나). `scale`, `zone` 추가 |
| `GET /sensors/series?ids=&from=&to=&step=&compare=yesterday` | 센서 추이 3줄 + 전날 겹쳐 보기 | 없음. 프론트는 전날 값(`compare`)을 늘 같이 받고 스위치는 보이기만 바꿈 |
| `GET /processes/{processId}/layout`, `/status` | '설비 위치' 그림 (공정 배치도와 같은 그림을 이 설비 둘레만 크게) | 없음 (B3 과 같은 API) |

### 프론트가 쓰는 `GET /equipment/{id}` 필드

| 필드 | 쓰는 곳 |
| --- | --- |
| `name`, `path` (`["울산공장","5공장","도장 공정"]`) | 제목 줄 경로 |
| **`processId`** | 주소의 공정과 같은지 확인 (다르면 '이 공정의 설비가 아닙니다'). **명세서 응답에 없음 → 추가 필요** |
| **`seq`** | '설비 위치' 카드 설명 '도장 공정 · 8번 설비' (B3 `layout.equipment[].seq` 와 같은 값) |
| `code` | 그림 속 설비와 짝 맞춤 (B3 과 같음) |
| `level` | 제목 줄 상태 배지, 열화상 최고 온도 글자 색 |
| `sensors[].id`, `tag`, `type`, `unit`, `value`, `level` | 게이지, 추이 줄 |
| `sensors[].max` | 게이지 눈금 끝 (공정 배치도의 작은 고리는 경보 × 1.2 로 그림 → 이 값으로 통일할지 정해야 함) |
| `sensors[].warn`, `alarm` | 게이지 바깥 눈금 색 구간, 추이 기준선 |
| **`sensors[].usual`** | 게이지 아래 '평소 18.0 A'. **명세서에 없음 → 추가 필요** (최근 정상 구간 평균 등, 계산 방법 합의) |
| `cameraId` | 열화상 요청 (null 이면 카드 숨김) |
| `activeChecklist` | 제목 줄 '체크리스트 진행 2/5 김도현'. 프론트 가정 모양: `{ id, doneCount, totalCount, assignee }` (명세서는 `null` 예시만 있음) |

### 프론트가 쓰는 `events` 필드

| 필드 | 쓰는 곳 |
| --- | --- |
| `at` | 시각 |
| `type` | `ALARM` / `ACTION` / `THRESHOLD` / **`RECORD`(추가)** — 걸러 보기(전체·알람·조치·기준값)와 배지 |
| `level` | 알람 점·배지 색 (주의 주황 · 경보 빨강 · 정상이면 회색, 예: '전류 상승 시작') |
| `text`, `detail` | 제목, 한 줄 설명 (예: `CT-17 22.4 A (기준 21.6 A)`) |
| `alarmId` | 알림에 딸린 조치인지 (점 색 주황) |
| **`status`** | `ACTING` 이면 배지를 '조치 중'으로. **추가 필요** |
| `by` | 받기만 함 (설명 글자에 이미 이름을 넣어 보내 주세요) |

### 프론트가 쓰는 `thermal` 필드

| 필드 | 쓰는 곳 |
| --- | --- |
| `imageUrl`, `capturedAt` | 그림, '마지막 수신' 시각 |
| `max`, `min`, `maxPoint {x, y}` | 제목줄 최고·최저, 그림 위 최고 지점 표시 (그 설비 구역이 없으면 `null` → 표시 안 함) |
| `avg` | 받기만 함 (설계안 화면에 평균 칸이 없음, 화면설계서 B4 에는 있음) |
| **`scale {min, max}`** | 오른쪽 색 눈금 글자 (지금 20~120 ℃). **추가 필요** |
| **`zone {name, desc}`** | 그림 왼쪽 위 '배기팬 모터부', 아래 '상도 건조로 외벽 · 배기팬 · 버너실'. **추가 필요** (없으면 '도장 공정 전체') |

### 정해야 할 것

| 번호 | 내용 |
| --- | --- |
| 1 | 추이 간격: 명세서는 1시간 = 5초, 오늘 = 1분 평균. 프론트 요청은 1시간 = `1m`, 6시간·오늘 = `10m` (설계안 그림 기준). 서버가 정하는 대로 따라가도 됨 |
| 2 | 실시간 값: 지금은 예시 데이터 모드에서만 2초마다 값이 조금 흔들림. SSE `sensor.value`, `thermal.frame` 연결은 SSE 작업 때 (`features/equipment/useLiveValues.js` 자리) |
| 3 | 기준값이 바뀐 시점의 세로 표시(화면설계서 B4): 이벤트의 `THRESHOLD` 시각으로 그릴지, series 응답에 넣어 줄지 |
| 4 | 이벤트 시각은 예시 상황 '오늘 16:42' 기준 (16:38:20 전류 주의 → 16:38:31 확인 → 16:41:05 체크리스트 전송 → 조치 중). 실제 서버는 실제 시각 |

---

## 9. 알림 대응 — 주의 (명세서 C1 · C2, 화면설계서 C1 ~ C3 · I1)

백엔드 코드(`gateway/backend` 의 `AlarmController` · `ChecklistController` · `StreamHub`)가 생겨서, 프론트 예시 데이터는 **코드의 주소·응답 필드**에 맞췄습니다(명세서와 다르면 코드 기준).

| API | 프론트 사용 | 명세서·코드와 다른 점 |
| --- | --- | --- |
| `GET /alarms?status=OPEN,ACKED,ACTING&date=today&factoryId=` | 상단 바 상태 띠, 주의 창 자동 열기, 체크리스트 칩 | 없음 (공장 담당자는 담당 공장 범위로 보냄) |
| `GET /alarms` (실시간 알림 카드) | 줄의 진행 칩·'조치 중 · 김도현 (2/5)' | 응답의 `checklist {id,status,doneCount,totalCount}` · `assignee` 사용 (코드 AlarmViews 그대로) |
| `GET /alarms/{id}` | 알림 줄 펼치기 (발생 → 확인 → 체크리스트 전송 → 조치 → 조치 확인) | `timeline[].step` 중 `RAISED · ACK · CHECKLIST · REPORT · CONFIRM` 만 씀 |
| `GET /alarms/{id}/detail` | 주의 상세, 센서·열화상 확인 창 | 아래 '추가 필요' 참고 |
| `POST /alarms/{id}/ack` | 2초 길게 누르기 끝 | 없음. 이미 확인된 알림이면 409 를 가정 (`ALREADY_ACKED`) |
| `GET /checklist-templates?equipmentType=&sensorType=` | 주의 상세 기본 5개 항목 | 없음 |
| `GET /processes/{id}/workers` | 받는 사람 고르기, 담당자 변경 | 없음. 기본 선택 = 근무 중인 첫 사람 (진행 건 수가 응답에 없어서) |
| `POST /checklists` | 전송 | 없음 |
| `GET /checklists?status=ACTIVE&factoryId=` | 상단 바 체크리스트 진행 버튼, 완료 알림 띠 | 없음 |
| `GET /checklists/{id}` | 진행 현황 창 | `serverTime` 추가 요청 (아래) |
| `POST /checklists/{id}/remind` | 다시 알림 (30초 대기 표시) | 화면설계서는 60초, **코드 30초를 따름** |
| `PATCH /checklists/{id}/assignee` | 담당자 변경 (사유: 응답 없음 / 부재 / 기타) | 화면설계서는 `PATCH /checklists/{id}`, **코드 주소를 따름** |
| `POST /checklists/{id}/confirm` | 조치 확인 (결과 3가지 + 한 줄 메모) | 없음. `REPORTED` 일 때만 단추를 켬 |

### 추가 필요 (명세서·코드에 없음)

| 어디 | 필드 | 쓰는 곳 |
| --- | --- | --- |
| `GET /alarms/{id}/detail` | `usual` (평소 값) | '평소 18.0 A 대비 124%' |
| `GET /alarms/{id}/detail` | `rule.max` (기준 띠 끝) | 발생 원인 기준 띠 (없으면 경보 × 1.2) |
| `GET /alarms/{id}/detail` | `sensors[].warn` · `alarm` | 센서·열화상 확인 창 '주의 21.6 · 경보 27' |
| `GET /alarms/{id}/detail` | `thermal.usualAtMax` · `maxPoint` · `zoneName` · `cameraTag` | '평소 같은 위치 52.0 ℃', 최고 지점 표시, '배기팬 모터부' |
| `GET /alarms/{id}/detail` | `trend.unit` · `warn` · `alarm` | 작은 추이 그래프 기준선 |
| `GET /alarms/{id}/detail` | `equipmentId` | 체크리스트 칩 위치 (설비 상세) |
| `GET /checklists/{id}` | `serverTime` (서버 지금 시각) | '경과 시간'을 서버 시계로 셈 (PC 시계가 틀려도 맞게). 응답 헤더 `Date` 로 대신해도 됨 |

### 실시간 (SSE) — 지금은 예시 상황으로 흉내

- 프론트는 `src/api/live.js` 의 `emitLive(이벤트)` 한 곳으로 '바뀌었다'를 받고, 열린 화면·상단 바·창이 조용히 다시 불러옵니다(`useLiveReload`).
- SSE 연결 때 `GET /stream` 의 `alarm.created · alarm.updated · checklist.updated · level.changed · sensor.value` 를 받으면 `emitLive` 만 부르면 됩니다.
- 처음에는 이벤트 내용으로 부분 갱신하지 않고 **다시 불러오기**만 합니다(단순하게). 느리면 그때 이벤트 내용으로 바꿉니다.

### 정해야 할 것

| 번호 | 내용 |
| --- | --- |
| 1 | 본사 관리자: 주의 창·확인·전송·조치 확인 단추 없이 **열람만**(상태 띠는 공정 화면으로 이동, 체크리스트 진행 창은 읽기 전용). 서버도 본사 관리자의 ack·전송·confirm 을 막을지 |
| 2 | 주의 '나중에(5분 뒤 다시)'·주의음: 설계안에 없어 프론트는 안 만듦. 필요하면 서버가 다시 알림을 보낼지 프론트 타이머로 할지 |
| 3 | 체크리스트 '응답 없음': 프론트가 마지막 항목 완료(없으면 전송) 후 10분이 지나면 표시. 서버가 상태로 줄지 |
| 4 | 예상 원인 단추: 지금은 보기만. 누르면 그 원인에 맞는 항목으로 바꾸려면 `GET /checklist-templates` 에 원인별 묶음이 필요 |

---

## 10. 알림 대응 — 경보 · 화재 (명세서 C4 · C4F · C5, 화면설계서 C4 · C5)

| API | 프론트 사용 | 백엔드 코드 | 명세서·코드와 다른 점 / 추가 필요 |
| --- | --- | --- | --- |
| `GET /alarms/{id}/response` | 경보·화재 창 전체 | 있음 | 아래 '추가 필요 필드' |
| `POST /equipment/{id}/shutdown` | 설비 하나 셧다운 (2초 길게) | 있음 | 없음 |
| `POST /processes/{id}/shutdown` | '도장 공정 전체' 셧다운 (2초 + 확인) | 있음 | 없음 (`equipmentIds` 비움) |
| `POST /processes/{id}/call-workers` | 공정 담당자 호출 | 있음 | 없음 |
| `POST /alarms/{id}/close` | 경보 종료 (셧다운 뒤, 결과 한 줄) | 있음 | 없음. 409 `VALUE_STILL_OVER` 면 알림 띠 |
| `GET /fires?status=ACTIVE` | 본사 사업장 선택 화면 화재 띠·화재 상세 | **없음** | 명세서 C5 기준으로 프론트 구현 |
| `GET /fires/{id}` | 화재 창, 본사 화재 상세 | **없음** | 명세서 C4F + 추가 필드 |
| `POST /fires/{id}/clear` | 비밀번호 다시 입력 해제 | **없음** | **틀릴 때 401 이면 프론트가 로그아웃시킴** (아래) |
| `POST /fires/{id}/approve-unlock` | 본사 관리자 '잠금 풀기 승인' | **없음** | 명세서 기준 |
| `GET /notifications/summary` | 상단 바 | 있음 | `activeFire` 를 `{ id, location }` 로 가정 |

### 추가 필요 필드

| 어디 | 필드 | 쓰는 곳 |
| --- | --- | --- |
| `/alarms/{id}/response` | `location` (사업장부터) | 창 머리 위치 |
| `/alarms/{id}/response` | `thermal { imageUrl, max, min, avg, maxPoint, scale, zoneName }` | 창 안 열화상 (지금 응답에는 `cameraId` 만 → 따로 부르지 않게 같이 주면 좋음) |
| `/alarms/{id}/response` | `reasonDetail` | 사유 아래 한 줄 '전류 27.5 A (평소의 153%) · CO 34 ppm …' |
| `/alarms/{id}/response` | `shutdown { equipmentIds, steps: [{ label, at }], done, auto }` | 셧다운 단계 표시 (버너 연료 차단 → 컨베이어 정지 → 배기팬 정지). SSE `command.result` 에 단계가 오면 그걸로 대신해도 됨 |
| `/alarms/{id}/response` | `valueStillOver` | '경보 종료' 단추 켜기 (경보 기준 위 센서가 없을 때) |
| `/alarms/{id}/response` | `equipment[].runState` | 셧다운 고르기에서 이미 정지된 설비 막기 (코드에 있음) |
| `/fires/{id}` | `values { thermalMax, temp, co }` | 감지 근거 숫자 3칸 |
| `/fires/{id}` | `actions[].text` · `running` | 자동 조치 줄 문구, '송출 중' 칩 |
| `/fires/{id}` | `serverTime` | 경과 시간을 서버 시계로 |

### 정해야 할 것

| 번호 | 내용 |
| --- | --- |
| 1 | **화재 해제 비밀번호가 틀릴 때 401**: 프론트 공통 처리(`src/api/http.js`)가 로그인 상태의 401 을 '토큰 만료'로 보고 로그아웃시킴 → `400 FIRE_PASSWORD_MISMATCH` 로 바꾸거나, 프론트가 이 주소만 예외로 둘지 |
| 2 | 본사 관리자: 경보·화재 창은 **열람만** (셧다운·해제 단추 없음), 해제 잠금 풀기 승인만 함 — 명세서 가정. 서버도 403 `ACTION_NOT_ALLOWED` 로 막는지 |
| 3 | 경보 창 '공정 내 센서 데이터': 명세서는 공정 센서 전부, 설계안은 상도 건조로 3종 → 프론트는 응답의 `sensors` 를 그대로 그림(지금 예시는 3개) |
| 4 | 화재 중 추가 셧다운(다른 설비): 화면설계서에 있지만 설계안 화재 창에는 없어 아직 안 만듦 |
| 5 | 화재가 해제된 뒤 본사 화재 상세를 '해제됨 17:21 · 한지우'로 10초 보여 주는 것(C5): 아직 안 만듦 (해제되면 바로 사업장 목록으로) |
