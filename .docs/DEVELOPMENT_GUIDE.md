# ChronoF1 프로젝트 구조 및 개발 가이드

안녕하세요! ChronoF1 프로젝트에 오신 것을 환영합니다. 이 문서는 프로젝트의 전체적인 구조를 이해하고, 개발 워크플로우를 파악하여 원활하게 기여할 수 있도록 돕기 위해 작성되었습니다.

## 1. 전체 구조 (Overall Architecture)

이 프로젝트는 **PNPM 워크스페이스**와 **Turborepo**를 사용하는 **모노레포(Monorepo)** 구조로 되어있습니다. 모노레포는 하나의 레포지토리 안에서 여러 개의 독립적인 프로젝트(애플리케이션, 라이브러리)를 관리하는 방식입니다.

- **`pnpm-workspace.yaml`**: PNPM에게 어떤 디렉터리들이 워크스페이스에 포함되는지 알려줍니다. (`apps/*`, `packages/*`)
- **`turbo.json`**: Turborepo의 설정 파일입니다. 빌드, 개발 서버 실행 등 전체 워크스페이스의 작업을 효율적으로 관리하고 캐싱을 통해 속도를 높여줍니다.
- **`apps/`**: 실제 배포되는 애플리케이션들이 위치하는 디렉터리입니다. (예: 백엔드 API, 프론트엔드 웹)
- **`packages/`**: 여러 애플리케이션에서 공통으로 사용되는 코드(UI 컴포넌트, 타입 정의, 설정 등)가 위치하는 디렉터리입니다.

---

## 2. 주요 애플리케이션 (`apps/`)

### 🔹 `apps/api` (백엔드 서버)

- **기술 스택**: [NestJS](https://nestjs.com/), TypeScript, [Prisma](https://www.prisma.io/)
- **역할**: 데이터 처리, 비즈니스 로직, 데이터베이스 통신을 담당하는 메인 API 서버입니다.
- **주요 모듈**:
  - **`src/main.ts`**: NestJS 애플리케이션의 시작점입니다.
  - **`src/prisma/`**: Prisma 클라이언트를 설정하고 NestJS 모듈로 제공하는 역할을 합니다. `schema.prisma` 파일은 데이터베이스 스키마를 정의합니다.
  - **`src/ingest/`**: 외부 F1 데이터(FastF1, Jolpica 등)를 가져와 데이터베이스에 저장하는 모듈입니다. 내부에 Python 스크립트를 실행하는 로직이 포함되어 있습니다.
  - **`src/replay/`**: 실시간 데이터 전송을 위한 WebSocket 게이트웨이가 구현되어 있습니다. (예: 레이스 리플레이)
  - **`src/results/`**: 저장된 레이스 결과 데이터를 클라이언트에 제공하는 REST API 엔드포인트가 구현되어 있습니다.

### 🔸 `apps/web` (프론트엔드)

- **기술 스택**: [React](https://reactjs.org/), TypeScript, [Vite](https://vitejs.dev/)
- **역할**: 사용자에게 보여지는 UI를 담당합니다. `api` 서버로부터 데이터를 받아와 시각화하고 상호작용합니다.
- **주요 파일/디렉터리**:
  - **`src/main.tsx`**: React 애플리케이션의 시작점입니다.
  - **`src/App.tsx`**: 메인 애플리케이션 컴포넌트입니다.
  - **`vite.config.ts`**: Vite 개발 서버 및 빌드 관련 설정 파일입니다.
  - 이 앱은 `packages/ui`의 공통 UI 컴포넌트와 `packages/types`의 타입 정의를 가져와 사용합니다.

---

## 3. 공통 패키지 (`packages/`)

공통 패키지는 코드의 재사용성을 높이고, 애플리케이션 간의 일관성을 유지하는 중요한 역할을 합니다.

- **`packages/types`**:
  - 백엔드(`api`)와 프론트엔드(`web`)에서 공통으로 사용되는 TypeScript 타입, DTO(Data Transfer Object), Entity(데이터베이스 모델) 등을 정의합니다.
  - 이를 통해 API 요청/응답 데이터의 타입을 안전하게 관리할 수 있습니다.

- **`packages/ui`**:
  - 여러 애플리케이션에서 공통으로 사용될 React UI 컴포넌트(예: Button, Card)를 모아둔 라이브러리입니다.

- **`packages/eslint-config`, `packages/typescript-config`**:
  - 전체 프로젝트의 ESLint(코드 스타일 및 오류 검사) 규칙과 TypeScript 컴파일러 설정을 중앙에서 관리합니다. 이를 통해 모든 코드베이스에서 일관된 스타일과 품질을 유지합니다.

---

## 4. 개발 워크플로우 (Development Workflow)

### 1. 의존성 설치

프로젝트를 처음 시작할 때, 루트 디렉터리에서 아래 명령어를 실행하여 모든 의존성을 한 번에 설치합니다.

```bash
pnpm install
```

### 2. 개발 서버 실행

전체 프로젝트(api, web)를 동시에 개발 모드로 실행하려면 루트 디렉터리에서 다음 명령어를 사용합니다. Turborepo가 두 애플리케이션을 동시에 실행하고 변경 사항을 감지하여 자동으로 재시작해줍니다.

```bash
pnpm dev
```

### 3. 새로운 의존성 추가

- **특정 앱/패키지에만 추가**: `--filter` 옵션을 사용합니다.

  ```bash
  # web 앱에 zustand 추가
  pnpm add zustand --filter web

  # api 앱에 class-validator 추가
  pnpm add class-validator --filter api
  ```

- **루트 워크스페이스에 개발 의존성으로 추가** (예: prettier)
  ```bash
  pnpm add -D -w prettier
  ```

### 4. 데이터 가져오기 (Ingestion)

`apps/api`의 `ingest` 모듈은 외부 데이터를 가져오는 역할을 합니다. 관련 Python 스크립트를 실행하여 데이터를 DB에 채워야 할 수 있습니다. 이 부분은 `ingest` 모듈의 컨트롤러나 서비스를 통해 트리거될 가능성이 높습니다. (자세한 내용은 해당 모듈 코드 참고)

### 5. 코드 스타일 및 린팅

프로젝트는 ESLint와 Prettier를 사용하여 코드 스타일을 관리합니다. 코드를 커밋하기 전에 린트를 실행하여 문제를 확인하는 것이 좋습니다.

```bash
pnpm lint
```

---

## 5. 주요 기술 스택 요약

- **모노레포**: PNPM Workspaces, Turborepo
- **백엔드**: NestJS, TypeScript
- **프론트엔드**: React, TypeScript, Vite
- **데이터베이스**: PostgreSQL (Prisma를 통해 관리)
- **스타일링**: CSS, (추후 `packages/ui`를 통한 디자인 시스템 구축)
- **코드 품질**: ESLint, Prettier

이 가이드가 프로젝트를 이해하는 데 도움이 되기를 바랍니다. 궁금한 점이 있다면 언제든지 질문해주세요!
