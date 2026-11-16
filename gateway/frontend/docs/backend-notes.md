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

- `401 TOKEN_EXPIRED` → `POST /auth/refresh` → 원래 요청 재시도: 백엔드 준비되면 `http.js` 인터셉터에 추가
- SSE `GET /stream?scope=...`: 대시보드 작업 때 추가

### 부탁

- `error.message` 는 화면에 그대로 나가므로 **짧은 한국어 문장**으로 보내 주세요. (예: `아이디 또는 비밀번호가 맞지 않습니다`)

---

## 2. 로그인 (명세서 A1)

| API | 프론트 사용 | 명세서와 다른 점 |
| --- | --- | --- |
| `POST /auth/login` | 요청 `{ loginId, password, client: "WEB" }`. 응답의 `accessToken`, `user` 사용 | 없음 |
| `POST /auth/logout` | 로그아웃 버튼 | 없음 |
| `POST /auth/refresh` | 아직 안 씀 | - |
| `GET /me` | 아직 안 씀 (새로고침 시 지금은 브라우저에 저장한 user 사용) | - |

### 프론트가 쓰는 응답 필드

| 필드 | 쓰는 곳 |
| --- | --- |
| `accessToken` | 모든 요청 헤더 |
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
