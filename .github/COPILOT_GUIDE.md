# Copilot Guide – ChronoF1 🏎️

**최종 목표**  
Historic Formula 1 results 조회 + 2018 시즌 이후 Live‑Timing Replay 를 제공하는 React SPA + NestJS API 모노레포.

---

## 1. 전체 스택

| 영역            | 기술                                                 | 비고                                            |
| --------------- | ---------------------------------------------------- | ----------------------------------------------- |
| **프런트**      | React 18, TypeScript, Vite, Zustand, React Router v6 | TailwindCSS, shadcn/ui 사용                     |
| **백엔드**      | NestJS 10, WebSocket Gateway, Prisma ORM             | PostgreSQL 15 + Timescale, Redis 7              |
| **데이터 적재** | Python3 scripts (FastF1 / Jolpica API)               | `apps/api/src/ingest` 모듈                      |
| **빌드**        | pnpm workspaces + Turborepo                          | `apps/` ( web \| api ), `packages/` shared libs |
| **배포**        | 미정                                                 | Docker Compose(Synology)                         |

---
## 2. 개발 환경 설정

## 3. 네이밍·코딩 규칙

### 공통

- **snake_case** → DB 컬럼 / REST JSON 필드
- **camelCase** → TypeScript 변수·속성
- **PascalCase** → React 컴포넌트, Nest Provider

### React

- 페이지 컴포넌트 → `src/features/<domain>/pages/*Page.tsx`
- 상태 → Zustand store (`useXStore`)·React Query (`useQueryX`)
- 컴포넌트 스타일 → Tailwind utility + shadcn base

### NestJS

- module = `<Domain>Module` (`ResultsModule`, `ReplayModule`)
- DTO → `packages/types` 공유, `class-transformer` 사용
- 비즈 로직 → `services/`, DB 로직 → Prisma `repositories/`

---

## 4. 디렉터리 구조(축약)

```text
apps/
  web/               # React SPA (Vite)
  api/
    src/
      ingest/        # ETL  (Python scripts call here via ChildProcess)
      replay/        # WS Gateway
      results/       # REST controllers
packages/
  types/             # DTO, entity typings (import "@f1/types")
  ui/                # Shared UI components
```

---

## 5. Copilot Chat 예시 프롬프트

- “Generate a Zustand store for `DriverTiming` objects keyed by `driverNumber`.”
- “Write a Prisma migration to add `stint_compound` to `stints` table.”
- “Create a React hook that opens WebSocket `ws://localhost:3000/replay/{sessionKey}` and throttles messages to 60 fps.”

> **중요** : Copilot 코드를 커밋하기 전에 ESLint + Prettier + `pnpm run test`가 통과하는지 꼭 확인!

---

## 6. 참고 문서

- Jolpica‑F1 DB Docs <https://dbdocs.io/jolpica/jolpica-f1>
- FastF1 API Guide <https://theoehrly.github.io/Fast-F1/>
- OpenF1 Docs <https://openf1.org/#api-endpoints>
