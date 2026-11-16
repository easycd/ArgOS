# Gateway Backend

연계 PC에서 웹 프론트엔드와 React Native 앱에 API를 제공하는 초기 Spring Boot 프로젝트입니다.

## 책임 범위

- 로그인과 역할 기반 접근 제어
- 대시보드, 경보·조치 이력, 통계 API
- SSE 기반 실시간 상태 및 경보 전달
- 사용자·공장·공정·설비·기준값 관리 API
- 점검 일정, 체크리스트, 문서 인식 결과 관리
- FCM 푸시 요청 및 중앙 서버와 허용된 데이터·명령 교환

연계 서버는 센서·PLC·카메라에 직접 접속하지 않습니다. FCM, OCR, 중앙 서버 연동은 계약이 확정된 뒤 별도 모듈로 구현합니다.

## 개발 환경

- Java 17
- Spring Boot 3.4.5
- PostgreSQL 16
- Maven

## 시작 방법

1. `.env.example`을 참고해 환경변수를 설정합니다.
2. 연계 서버용 PostgreSQL을 실행합니다.
3. Maven이 설치된 환경에서 `mvn spring-boot:run`을 실행합니다.

상태 확인: `GET /actuator/health`  
서비스 확인: `GET /api/v1/system/info`

현재는 두 확인 경로만 공개되어 있으며, 나머지 요청은 기본 차단됩니다. 인증 방식과 API 계약을 확정한 뒤 `auth`, `dashboard`, `alarm`, `inspection`, `document`, `admin`, `integration` 패키지를 추가합니다.
