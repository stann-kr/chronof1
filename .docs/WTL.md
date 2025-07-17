# ChronoF1 — 부트캠프 WTL 발표 자료

**Formula 1 Data Analytics & Live Timing Dashboard**

## 0. 프로젝트 개요

### 💡 프로젝트 한줄 요약

Formula 1 historic results + 2018 시즌 이후 Live‑Timing Replay 대시보드를 React SPA & Nest API 모노레포로 구현한다.

### 🎯 문제 인식 & 해결 방안

**현재 F1 데이터 접근의 한계:**

- 공식 F1 앱/웹사이트: 실시간 데이터만 제공, 과거 데이터 분석 제한
- ESPN, BBC 등: 기본 결과만 제공, 상세 타이밍 데이터 부족
- 팬들의 니즈: 특정 레이스의 상세 분석, 드라이버별 퍼포먼스 비교

**ChronoF1의 차별점:**

- 📊 **Rich Historical Data**: 2018년 이후 모든 세션의 상세 타이밍 데이터
- 🎬 **Interactive Replay**: 실제 레이스처럼 타임라인을 재생하며 분석
- 📱 **Progressive Web App**: 오프라인에서도 사용 가능한 모바일 최적화
- 🔄 **Real-time Integration**: 실제 레이스 주말 실시간 데이터 연동ronoF1 — 부트캠프 WTL 발표 자료

## 0. 프로젝트 한줄 요약

Formula 1 historic results + 2018 시즌 이후 Live‑Timing Replay 대시보드를 React SPA & Nest API 모노레포로 구현한다.

---

## 1. 핵심 기능 로드맵

| 구분           | 기능                                 | API/데이터                       | 완료 목표 |
| -------------- | ------------------------------------ | -------------------------------- | --------- |
| 1. 캘린더      | 연·라운드·세션 일정, D‑Day 표시      | `meetings`, `sessions` (Jolpica) | 1 주차    |
| 2. 결과 뷰     | Race / Quali / Sprint 결과, DNF 상태 | `session_result`, `standings`    | 2 주차    |
| 3. 랩차트      | 랩별 포지션·갭 그래프                | `laps`, `intervals`              | 3 주차    |
| 4. 피트·타이어 | Pit Stop 타임라인, 스틴트 컴파운드   | `pit_stops`, `stints`            | 3 주차    |
| 5. 리플레이    | x0.5 / x1 / x2 배속, 일시정지, Seek  | DB ↔ WS Gateway                 | 3 주차    |
| 6. PWA         | 오프라인 Shell, 홈화면 설치          | Vite PWA 플러그인                | 4 주차    |
| 7. 실시간 시연 | 발표 당일 1회 Live Timing            | OpenF1 WebSocket                 | 4 주차    |

---

## 2. 기술 스택 & 구조

ChronoF1 프로젝트는 효율적인 개발, 확장성, 그리고 최적의 성능을 목표로 다음과 같은 기술 스택과 아키텍처를 채택했습니다.

``` text
chronof1/
├ apps/
│ ├ web/         # React 18 + Vite SPA
│ └ api/         # NestJS 10 (API + WS Gateway)
├ packages/
│ ├ types/       # DTO 공유
│ ├ ui/          # Tailwind + shadcn 컴포넌트
│ └ utils/       # 포맷터 함수
├ scripts/       # Python ETL (FastF1, Jolpica 수집)
├ infra/
│ ├ docker/      # Dockerfile (web, api)
│ └ compose.yaml # Postgres + Redis
└ .github/       # CI / Copilot Guide
```

### 2.1. 모노레포 구성 (pnpm + Turborepo)

- **pnpm**: 효율적인 패키지 관리와 디스크 공간 절약을 위해 선택했습니다. 심링크를 활용하여 중복 설치를 방지하고, 의존성 관리를 간소화합니다.
- **Turborepo**: 모노레포 환경에서 빌드 및 테스트 속도를 최적화하는 빌드 시스템입니다. 캐싱과 병렬 실행을 통해 개발 생산성을 극대화하고 CI/CD 시간을 단축합니다.

### 2.2. 프론트엔드 (Web)

- **React 18**: 선언적 UI 구성과 컴포넌트 기반 개발을 통해 복잡한 대시보드 UI를 효율적으로 구축하기 위해 선택했습니다. 최신 React 18의 기능들을 활용하여 성능과 사용자 경험을 개선합니다.
- **Vite**: 빠르고 가벼운 개발 서버와 번들링을 제공하여 개발 워크플로우를 가속화합니다. SPA(Single Page Application) 형태로 사용자에게 끊김 없는 경험을 제공합니다.
- **Tailwind CSS + shadcn/ui**: 유틸리티-퍼스트 CSS 프레임워크인 Tailwind CSS를 사용하여 빠르고 일관된 스타일링을 적용합니다. shadcn/ui는 재사용 가능한 고품질 UI 컴포넌트를 제공하여 개발 속도를 높이고 디자인 일관성을 유지합니다.

### 2.3. 백엔드 (API)

- **NestJS 10**: TypeScript 기반의 프로그레시브 Node.js 프레임워크로, 확장 가능하고 유지보수하기 쉬운 서버 애플리케이션을 구축하기 위해 선택했습니다. 모듈화된 아키텍처와 강력한 DI(Dependency Injection)를 통해 API 및 WebSocket Gateway를 안정적으로 운영합니다.
  - **API**: F1 데이터 조회 및 관리를 위한 RESTful API를 제공합니다.
  - **WebSocket Gateway (ReplayModule)**: 실시간 라이브 타이밍 리플레이 기능을 위해 WebSocket 통신을 담당합니다. 클라이언트의 요청에 따라 DB에서 데이터를 조회하고, `await sleep(dt/speed)` 로직을 통해 실제 시간 흐름에 맞춰 데이터를 클라이언트로 푸시합니다.

### 2.4. 데이터베이스

- **PostgreSQL 15**: 안정성과 확장성이 뛰어난 관계형 데이터베이스입니다. F1 경기, 세션, 드라이버 등 구조화된 데이터를 저장하고 관리하는 데 사용됩니다.
- **TimescaleDB (PostgreSQL Extension)**: PostgreSQL의 확장 기능으로, 시계열 데이터 처리에 최적화되어 있습니다. F1 랩 타임, 피트 스톱, 인터벌 등 방대한 시계열 타이밍 데이터를 효율적으로 저장하고 쿼리하는 데 핵심적인 역할을 합니다.
- **Prisma**: Node.js 및 TypeScript를 위한 차세대 ORM(Object-Relational Mapping)입니다. 타입 안전성을 보장하며 데이터베이스 스키마 관리(Prisma Migrate)와 데이터 접근을 간소화하여 개발 생산성을 높입니다.

### 2.5. 데이터 수집 및 처리 (ETL)

- **Python ETL 스크립트 (`scripts/ingest/loader.py`)**: F1 데이터를 수집하고 가공하여 데이터베이스에 적재하는 ETL(Extract, Transform, Load) 프로세스를 담당합니다.
  - **FastF1**: F1 공식 데이터를 파싱하고 접근하기 위한 Python 라이브러리입니다.
  - **Jolpica**: F1 데이터를 제공하는 또 다른 소스로, FastF1과 함께 데이터의 풍부함을 더합니다.
  - 수집된 데이터는 Prisma를 통해 데이터베이스에 삽입됩니다.

### 2.6. 인프라 및 배포

- **Docker**: 애플리케이션(web, api)을 컨테이너화하여 개발, 테스트, 배포 환경의 일관성을 보장합니다. 환경 설정의 복잡성을 줄이고 이식성을 높입니다.
- **Docker Compose**: PostgreSQL, Redis 등 여러 서비스 컨테이너를 단일 명령으로 쉽게 정의하고 실행할 수 있도록 합니다. 개발 환경 설정을 간소화하고 서비스 간의 의존성을 관리합니다.
- **Redis**: 고성능 인메모리 데이터 스토어로, 주로 캐싱 및 실시간 데이터 처리에 활용될 수 있습니다. (현재는 WebSocket Gateway의 메시지 브로커 등으로 활용 가능성을 염두에 둠)

### 2.7. 공유 패키지 (packages/)

- **`types/`**: 프론트엔드와 백엔드 간에 공유되는 DTO(Data Transfer Object) 및 인터페이스를 정의하여 타입 안전성을 보장하고 개발 일관성을 유지합니다.
- **`ui/`**: Tailwind CSS와 shadcn/ui를 기반으로 구축된 재사용 가능한 UI 컴포넌트들을 포함하여, 웹 애플리케이션 전반의 디자인 시스템을 구축하고 개발 효율성을 높입니다.
- **`utils/`**: 날짜/시간 포맷팅, 데이터 변환 등 프로젝트 전반에서 공통적으로 사용되는 유틸리티 함수들을 모아 관리합니다.

### 2.8. CI/CD (.github/)

- **GitHub Actions**: `pnpm lint`, `test`, `build` 등의 자동화된 워크플로우를 통해 코드 품질을 유지하고, 변경 사항이 main 브랜치에 병합되기 전에 안정성을 검증합니다. PR(Pull Request) 시 1명 이상의 리뷰를 필수로 하여 코드 리뷰 문화를 장려합니다.

---

## 3. 개발 순서 (4 주)

1. **Week 1**
   - 모노레포 세팅(pnpm + Turborepo)
   - DB 스키마, 캘린더 페이지
2. **Week 2**
   - 결과 테이블, Prisma migrate
   - ETL Loader β (2023 싱가포르 GP)
3. **Week 3**
   - WebSocket Replay, 랩차트 시각화
   - 피트 타임라인 + 타이어 그래프
4. **Week 4**
   - PWA 완성, 실시간 키 테스트
   - Lighthouse 퍼포먼스 튜닝, 시연 영상 제작

---

## 4. 협업 & Git 워크플로

| 역할        | 담당           | 브랜치 네이밍 |
| ----------- | -------------- | ------------- |
| 프런트 (👩‍💻) | SPA UI / 차트  | `feat/web-…`  |
| 백엔드 (👨‍💻) | API / ETL / WS | `feat/api-…`  |

- `main` 보호 브랜치 – PR + 1 명 리뷰 + GitHub Actions 통과 필수
- .github CI – `pnpm lint → test → build`

---

## 5. 발표 시연 흐름

1. 시즌 캘린더 > 2024 Monaco GP Race 클릭
2. 결과 테이블 & 랩차트 하이라이트 확인
3. **리플레이 모드** – x2 속도로 1 랩 재생, 피트스톱 타임라인 연결
4. 실시간 세션키 전환 데모 (OpenF1 WS, 짧은 클립)

---

> 이 문서는 Copilot Guide와 달리 부트캠프 **WTL 발표용** 요약입니다.  
> 필요한 세부 항목(예: ERD 세부, API 명세)은 추가 섹션에 업데이트하세요.
