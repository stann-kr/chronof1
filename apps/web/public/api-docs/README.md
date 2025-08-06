# 🏎️ ChronoF1 API Documentation

프론트엔드 개발자를 위한 독립적인 API 문서입니다. 백엔드 서버를 실행하지 않고도 API 명세를 확인할 수 있습니다.

## 📋 문서 접근 방법

### 1. 웹 앱에서 접근 (권장)

```bash
# 프론트엔드 개발 서버 실행
cd apps/web
pnpm dev

# 브라우저에서 접근
http://localhost:5173
# 메인 페이지에서 API Documentation 관련 버튼 클릭
```

### 2. 직접 접근

```bash
# 브라우저에서 직접 접근
http://localhost:5173/api-docs/           # 메인 문서 페이지
http://localhost:5173/api-docs/redoc.html # ReDoc 문서  
http://localhost:5173/api-docs/swagger-ui.html # Swagger UI
```

## 📂 파일 구조

```text
apps/web/public/api-docs/
├── index.html          # 메인 문서 페이지 (선택 가능)
├── redoc.html          # ReDoc 정적 페이지 (권장)
├── swagger-ui.html     # Swagger UI 정적 페이지 (테스트용)
├── swagger.json        # API 명세 JSON
└── README.md          # 이 파일
```

## 🔄 API 명세 업데이트 방법

백엔드 API가 변경되었을 때 문서를 업데이트하는 방법:

```bash
# 방법 1: 실행 중인 서버에서 추출 (빠름)
cd apps/api  
pnpm swagger:extract

# 방법 2: 빌드 후 생성 (완전함)
pnpm swagger:generate
```

## ✨ 문서 종류별 특징

### 📖 ReDoc (권장)

- **특징**: 깔끔한 3-panel 레이아웃
- **장점**: 읽기 편한 문서, 상세한 스키마
- **적합**: API 이해 및 참조

### 🛠️ Swagger UI

- **특징**: 상호작용 가능한 문서  
- **장점**: API 테스트 가능, Try It Out 기능
- **적합**: API 개발 및 테스트

### 🏠 메인 페이지

- **특징**: 프로젝트 개요 및 링크 모음
- **장점**: 한눈에 볼 수 있는 가이드
- **적합**: 첫 방문자 및 개요 파악

## ✨ 주요 특징

### 🚀 완전한 F1 API 명세
- **라이브 타이밍**: WebSocket 기반 실시간 F1 데이터
- **히스토리 데이터**: 시즌, 이벤트, 세션, 드라이버 정보
- **상세한 데이터 구조**: 50+ 필드의 F1 텔레메트리 데이터

### 📱 사용자 친화적 인터페이스
- **커스텀 디자인**: McLaren 오렌지 테마
- **상세한 가이드**: WebSocket 연결 방법과 사용법
- **Try It Out**: 실제 API 호출 테스트 가능

### 🔧 개발자 편의 기능
- **백엔드 서버 불필요**: 정적 파일로 독립 실행
- **실시간 테스트**: localhost:3000 API 서버와 연동
- **자동 요청 변환**: 상대 경로를 절대 경로로 변환

## 📋 API 개요

### REST API Endpoints
- **GET /live-timing/seasons** - 시즌 목록
- **GET /live-timing/seasons/:year/events** - 연도별 이벤트
- **GET /live-timing/events/:eventId/sessions** - 세션 목록
- **GET /live-timing/sessions/:sessionId/drivers** - 드라이버 목록

### WebSocket API
- **연결**: `ws://localhost:3000/live-timing`
- **이벤트**: `join-session`, `replay-control`
- **응답**: `chunk-data`, `playback-position`, `timing-update`

## 🏁 F1 데이터 상세 정보

### 타이밍 데이터
- 현재/베스트/마지막 랩 타임 (밀리초 정밀도)
- 3구간별 타임과 세션 베스트 기록
- 실시간 순위와 포지션 변경

### 텔레메트리 데이터
- 속도, 스로틀, 브레이크 압력
- 기어, RPM, DRS 상태
- 트랙상 3D 위치 좌표

### 레이스 데이터
- 앞차와의 거리, 타이어 정보
- 드라이버 상태, 팀 정보
- 날씨 및 트랙 조건

## 🔗 유용한 링크

- **백엔드 Swagger**: http://localhost:3000/api-docs (API 서버 실행 시)
- **WebSocket 테스트**: apps/api/src/modules/live-timing/websocket/test/
- **FastF1 문서**: https://theoehrly.github.io/Fast-F1/
- **F1 DB 스키마**: https://dbdocs.io/jolpica/jolpica-f1

## 🚀 프로젝트 정보

- **Framework**: NestJS + React + TypeScript
- **Database**: PostgreSQL + TimescaleDB
- **WebSocket**: Socket.IO
- **Data Source**: FastF1 Library
- **Build Tool**: Vite + Turborepo
