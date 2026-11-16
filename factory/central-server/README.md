# Factory Central Server

공장 제어망 내부에서 동작하는 ArgOS 중앙 서버의 초기 Spring Boot 프로젝트입니다.

## 책임 범위

- Kafka를 통한 전처리 센서 데이터 수신
- 센서 임계값 판정, 이벤트 및 경보 생성
- 원본 데이터와 제어 이력의 공장 내부 보관
- 사전 허용된 설비 명령의 검증 및 전달
- 연계 서버에 상태·추이·이벤트 등 허용된 데이터 제공

원본 센서값, 원본 열화상 및 PLC 로그를 외부에 직접 공개하는 기능은 포함하지 않습니다. 실제 제어 기능도 장비 연동과 안전 검증 전에는 구현 완료로 보지 않습니다.

## 개발 환경

- Java 17
- Spring Boot 3.4.5
- PostgreSQL 16
- Kafka
- Maven

## 시작 방법

1. `.env.example`을 참고해 환경변수를 설정합니다.
2. PostgreSQL과 Kafka를 먼저 실행합니다.
3. Maven이 설치된 환경에서 `mvn spring-boot:run`을 실행합니다.

상태 확인: `GET /actuator/health`  
서비스 확인: `GET /api/v1/system/info`

도메인 패키지는 기능 개발 시 `sensor`, `event`, `alarm`, `command`, `integration` 단위로 추가합니다.

