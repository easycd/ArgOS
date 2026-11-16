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
| `user.scope.factoryIds` | 공장 담당자의 첫 화면(첫 번째 공장 대시보드), 다른 공장 주소 차단 |

### 정해야 할 것

| 번호 | 내용 |
| --- | --- |
| 1 | `firstPage` 값이 있지만 프론트는 지금 `role` 로 첫 화면을 정함. 둘 중 무엇을 기준으로 할지 |
| 2 | 에러 `AUTH_LOCKED`(5회 잠김), `USER_INACTIVE`, `CLIENT_NOT_ALLOWED` 는 지금 `error.message` 를 그대로 보여 줌. 남은 횟수(`remaining`)·풀리는 시각(`unlockAt`) 표시가 필요한지 |
| 3 | `pwResetRequired: true` 일 때 갈 비밀번호 변경 화면이 설계안에 없음 |

- 예시 계정(mock 전용): `hq_admin`(본사 관리자), `ulsan5_admin`(공장 담당자, 5공장) / 비밀번호 `argos1234`

---

## 3. 사업장 선택 (명세서 A2, 본사 관리자)

| API | 프론트 사용 | 명세서와 다른 점 |
| --- | --- | --- |
| `GET /sites` | 지도 핀, 도넛, 목록 머리줄 (`id, code, name, address, lat, lng, level, sensorLevels`) | 명세서 예시에서 아산·전주에 `address`, `sensorLevels` 가 빠져 있음 → **모든 사업장에 필요** |
| `GET /sites/{siteId}/tree` | 목록에서 사업장을 펼칠 때 (처음 한 번만) | 공장마다 **`todayAlarmCount`(오늘 알림 건수) 추가 필요** (화면 '오늘 알림' 칸) |
| `GET /sites/{siteId}/overview` | 아직 안 씀 ('이동' 은 지금 5공장 대시보드로 감) | - |

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

## 4. 공장 화면 공통 (상단 바)

| API | 프론트 사용 | 메모 |
| --- | --- | --- |
| (임시) 공장 이름 | 상단 바 '울산공장 5공장' | 명세서에 공장 하나만 조회하는 API 가 없어서 지금은 예시 데이터에서 찾음. 대시보드 작업 때 `GET /factories/{factoryId}/overview` 로 바꿀 예정 |
