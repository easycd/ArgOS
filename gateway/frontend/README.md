# ArgOS 프론트엔드 (관제실·본사 웹)

Vue 3 (`<script setup>`, JavaScript) + Vite + Vue Router + Pinia + Axios + ECharts(vue-echarts)

## 실행

```bash
cd gateway/frontend
npm install
cp .env.example .env   # 필요하면 값 입력 (비워 두면 /api/v1 사용)
npm run dev            # 개발 서버
npm run build          # 배포용 빌드 (dist/)
```

개발 서버에서는 로그인 화면 아래 **개발용 바로 들어가기** 버튼으로 백엔드 없이 권한별 화면을 확인할 수 있습니다. 이 버튼은 빌드 결과물에는 나타나지 않습니다.

## 폴더 구조

```text
src/
├── api/          # 연계 서버 API (http.js = Axios 공통 인스턴스)
├── assets/styles # tokens.css(색·글꼴 토큰), base.css(전역 기본)
├── components/   # 공통 컴포넌트
├── features/     # 도메인별 기능 (site: 사업장·공장 목록)
├── layouts/      # BlankLayout(로그인·사업장 선택), MainLayout(상단 바 + 본문)
├── pages/        # 화면 (auth, site, dashboard, history, inspection, threshold, user, factory)
├── router/       # 주소·권한 가드(index.js), 상단 메뉴(menus.js)
├── stores/       # Pinia (auth: 로그인 상태)
├── types/        # 공통 코드 (상태 단계 LEVEL, 권한 ROLE)
└── utils/        # echarts 등록, 로그인 정보 저장
```

## 규칙

- 색·글꼴·모서리는 `src/assets/styles/tokens.css` 변수만 사용
- 상태·권한 문자열은 `src/types/codes.js` 상수만 사용
- API 호출은 `src/api/` 모듈을 통해서만 (응답 형식·인증 방식 변경 시 `http.js` 만 수정)
