# ArgOS 프론트엔드 (관제실·본사 웹)

Vue 3 (`<script setup>`, JavaScript) + Vite + Vue Router + Pinia + Axios + ECharts(vue-echarts)

## 실행

```bash
cd gateway/frontend
npm install
cp .env.example .env   # 필요하면 값 입력
npm run dev            # 개발 서버 (http://localhost:5173)
npm run build          # 배포용 빌드 (dist/)
```

백엔드 개발 전이라 기본은 **예시 데이터(mock) 모드**입니다. 백엔드 없이 아래 예시 계정으로 로그인할 수 있습니다.

| 아이디 | 권한 | 첫 화면 |
| --- | --- | --- |
| `hq_admin` | 본사 관리자 | 사업장 선택 |
| `ulsan5_admin` | 공장 담당자 (울산공장 5공장) | 5공장 대시보드 |

비밀번호는 둘 다 `argos1234` 입니다. 실제 백엔드에 붙일 때는 `.env` 에 `VITE_USE_MOCK=false` 를 넣으면 `/api` 요청이 `http://localhost:8080` 으로 갑니다.

## 폴더 구조

```text
src/
├── api/          # 연계 서버 API (http.js = Axios 공통, mock/ = 예시 데이터)
├── assets/
│   ├── images/   # 설계안에서 만든 정적 그림 (로그인 배경, 한반도 지도)
│   └── styles/   # tokens.css(색·글꼴 토큰), base.css(전역 기본)
├── components/   # 공통 컴포넌트 (AppIcon, AppHeader, LevelBadge, BaseCard)
├── features/     # 도메인별 기능 (site: 한반도 지도, 도넛, 단계 막대, 집계)
├── layouts/      # BlankLayout(로그인), PlainLayout(메뉴 없는 상단 바), MainLayout(공장 화면)
├── pages/        # 화면 (auth, site, dashboard, history, inspection, threshold, user, factory)
├── router/       # 주소·권한 가드(index.js), 첫 화면(home.js), 상단 메뉴(menus.js)
├── stores/       # Pinia (auth: 로그인 상태)
├── types/        # 공통 코드 (상태 단계 LEVEL, 권한 ROLE)
└── utils/        # echarts 등록, 브라우저 저장, 날짜 형식
docs/
└── backend-notes.md   # 백엔드에 전달할 API 사항 (화면 만들 때마다 추가)
```

## 규칙

- 화면 배치·색·문구는 설계 자료의 화면설계안을 기준으로 맞춤
- 색·글꼴·모서리는 `src/assets/styles/tokens.css` 변수만 사용
- 상태·권한 문자열은 `src/types/codes.js` 상수만 사용
- API 호출은 `src/api/` 모듈을 통해서만 (응답 형식·인증 방식 변경 시 `http.js` 만 수정)
- 새 API 를 쓰면 `docs/backend-notes.md` 에 함께 적기
