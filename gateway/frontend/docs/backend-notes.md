# 백엔드 전달 사항 (프론트엔드 기준 API 초안)

프론트엔드는 백엔드 개발 전이라 **예시 데이터(mock)** 로 화면을 만들고 있습니다.
이 문서는 프론트가 부르는 API와 기대하는 요청·응답 모양을 화면별로 정리한 것입니다. 화면을 만들 때마다 계속 추가합니다.

- 예시 데이터 실제 값: `gateway/frontend/src/api/mock/data.js`
- API 호출 코드: `gateway/frontend/src/api/*.js` (각 함수의 `http.get/post` 부분이 실제 요청)
- 표의 **상태**: `가정` = 프론트가 임시로 정한 것(합의 필요), `확정` = 팀 합의 완료

---

## 1. 공통 규칙

| 항목 | 내용 | 상태 |
| --- | --- | --- |
| 기본 주소 | `/api/v1` (프론트 개발 서버는 `/api` 를 `http://localhost:8080` 으로 프록시) | 가정 |
| 성공 응답 | `{ "success": true, "data": ... }` | 가정 |
| 실패 응답 | `{ "success": false, "error": { "code": "AUTH_INVALID", "message": "사용자에게 보여 줄 문구" } }` | 가정 |
| 오류 문구 | `error.message` 를 화면에 그대로 표시하므로 짧은 한국어 문장으로 | 가정 |
| 인증 헤더 | `Authorization: Bearer <accessToken>` | 가정 |
| 토큰 | 액세스 토큰 30분 + 리프레시 토큰 | 가정 |
| 401 처리 | 로그인 상태에서 401 → 프론트가 로그아웃 후 로그인 화면으로 이동 | 가정 |
| 시간 형식 | ISO 8601, `Asia/Seoul` (예: `2026-11-16T14:05:00+09:00`) | 가정 |
| 실시간 | SSE `GET /stream?scope=...` (아직 프론트 미구현) | 가정 |

### 공통 코드

| 코드 | 값 | 의미 |
| --- | --- | --- |
| level (상태) | `NORMAL` / `WARN` / `ALARM` / `FIRE` | 정상 / 주의 / 경보 / 화재 |
| role (권한) | `HQ_ADMIN` / `PLANT_ADMIN` / `WORKER` | 본사 관리자 / 공장 담당자 / 공정 담당자(모바일) |

---

## 2. 로그인 화면

### POST `/auth/login` — 로그인

| 구분 | 필드 | 타입 | 설명 |
| --- | --- | --- | --- |
| 요청 | `loginId` | string | 아이디 |
| 요청 | `password` | string | 비밀번호 |
| 응답 | `accessToken` | string | 액세스 토큰 |
| 응답 | `refreshToken` | string | 리프레시 토큰 |
| 응답 | `user.id` | number | 사용자 ID |
| 응답 | `user.name` | string | 상단 바에 표시할 이름 |
| 응답 | `user.role` | string | `HQ_ADMIN` / `PLANT_ADMIN` / `WORKER` |
| 응답 | `user.factoryId` | string \| null | 공장 담당자의 담당 공장 ID (본사 관리자는 null) |

응답 예시:

```json
{
  "success": true,
  "data": {
    "accessToken": "eyJ...",
    "refreshToken": "eyJ...",
    "user": { "id": 2, "name": "울산 5공장 담당자", "role": "PLANT_ADMIN", "factoryId": "ulsan-5" }
  }
}
```

실패 예시 (아이디·비밀번호 오류):

```json
{ "success": false, "error": { "code": "AUTH_INVALID", "message": "아이디 또는 비밀번호가 올바르지 않습니다." } }
```

- 로그인 후 이동: `HQ_ADMIN` → 사업장 선택, `PLANT_ADMIN` → 담당 공장 대시보드, `WORKER` → 웹 진입 불가(모바일 앱 안내)
- 예시 계정(mock 전용): `hq_admin`, `ulsan5_admin` / 비밀번호 `argos1234`

### POST `/auth/logout` — 로그아웃

- 요청 본문 없음 (헤더의 토큰으로 사용자 식별). 응답 `data` 는 `null`.

### 미정

- 리프레시 토큰 재발급 주소·방식 (예: `POST /auth/refresh`, 본문 전달 / httpOnly 쿠키)
- 토큰 저장 위치 (지금 프론트는 localStorage)

---

## 3. 사업장 선택 화면 (본사 관리자)

### GET `/sites` — 사업장 목록

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `id` | string | 사업장 ID |
| `name` | string | 사업장 이름 (울산, 아산, 전주) |
| `lat`, `lng` | number | 지도에 점을 찍기 위한 위도·경도 |
| `level` | string | 사업장 안 공장 중 가장 높은 상태 |
| `alarmCount` | number | 현재 처리 중인 알림 건수 |
| `factories[]` | array | 공장 목록 |
| `factories[].id` | string | 공장 ID |
| `factories[].name` | string | 공장 이름 |
| `factories[].level` | string | 공장 상태 |
| `factories[].alarmCount` | number | 공장 알림 건수 |
| `factories[].enabled` | boolean | 진입 가능 여부 (이번 범위는 울산 5공장만 true) |

응답 예시:

```json
{
  "success": true,
  "data": [
    {
      "id": "ulsan", "name": "울산", "lat": 35.54, "lng": 129.31, "level": "WARN", "alarmCount": 2,
      "factories": [{ "id": "ulsan-5", "name": "울산 5공장", "level": "WARN", "alarmCount": 2, "enabled": true }]
    },
    { "id": "asan", "name": "아산", "lat": 36.79, "lng": 127.0, "level": "NORMAL", "alarmCount": 0, "factories": [] }
  ]
}
```

---

## 4. 공장 공통 (상단 바)

### GET `/factories/{factoryId}` — 공장 기본 정보

| 필드 | 타입 | 설명 |
| --- | --- | --- |
| `id` | string | 공장 ID |
| `name` | string | 상단 바에 표시할 공장 이름 |
| `siteId` | string | 소속 사업장 ID |
| `level` | string | 공장 현재 상태 |

- 권한: 공장 담당자는 자기 `factoryId` 만 조회 가능해야 함 (프론트도 막지만 서버에서 반드시 검증)

---

## 5. 확인이 필요한 것

| 번호 | 내용 |
| --- | --- |
| 1 | ID 형식: 프론트는 임시로 문자열(`ulsan`, `ulsan-5`) 사용. DB가 숫자 ID면 알려 주세요. |
| 2 | 사업장 `level`·`alarmCount` 를 서버가 계산해서 줄지, 프론트가 공장 값으로 계산할지 |
| 3 | 사업장 위경도를 DB(`plant` 테이블)에 둘지 |
| 4 | 사용자 관리·공장 관리 메뉴를 공장 담당자도 쓸 수 있는지 |
