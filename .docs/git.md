# ChronoF1 Git 협업 가이드

## 1. 브랜치 전략 (Git Flow 기반)

### 브랜치 구조

```text
main (프로덕션)
  ↑
develop (개발 통합)
  ↑
feat/feature-name (기능 개발)
fix/bug-description (버그 수정)
hotfix/critical-fix (긴급 수정)
release/v1.0.0 (릴리스 준비)
```

### 브랜치 네이밍 컨벤션

> 팀원별로 브랜치명 앞에 이름 prefix(`stann/`, `danbe/` 등)를 붙이면 작업 내역을 명확히 구분할 수 있습니다.
> 권장 형식: `{이름}/{타입}/{도메인}-{설명}`
> 예시: `stann/feat/web-calendar`, `danbe/fix/api-websocket`, `stann/refactor/types-driver`, `danbe/docs/api-guide`

| 브랜치 타입 | 네이밍 규칙 | 예시 | 설명 |
|------------|-------------|------|------|
| **기능 개발** | `{이름}/feat/{domain}-{feature}` | `stann/feat/web-calendar` | 새로운 기능 개발 |
| | | `danbe/feat/api-replay` | API 기능 개발 |
| | | `stann/feat/ui-components` | UI 컴포넌트 개발 |
| **버그 수정** | `{이름}/fix/{domain}-{issue}` | `danbe/fix/web-chart-render` | 웹 차트 렌더링 버그 |
| | | `stann/fix/api-websocket` | API WebSocket 연결 오류 |
| **핫픽스** | `{이름}/hotfix/{critical-issue}` | `danbe/hotfix/security-patch` | 보안 패치 |
| **릴리스** | `{이름}/release/v{version}` | `stann/release/v1.0.0` | 릴리스 준비 |
| **개선/리팩토링** | `{이름}/refactor/{scope}` | `danbe/refactor/api-structure` | 코드 구조 개선 |
| **문서** | `{이름}/docs/{topic}` | `stann/docs/api-guide` | 문서 작성/수정 |

### 브랜치 보호 규칙

**`main` 브랜치:**

- Direct push 금지 (PR만 허용)
- 최소 1명의 코드 리뷰 승인 필수
- GitHub Actions CI 통과 필수
- 병합 후 브랜치 자동 삭제

**`develop` 브랜치:**

- Direct push 금지 (PR만 허용)
- CI 통과 필수

---

## 2. 커밋 메시지 컨벤션 (Conventional Commits)

### 기본 형식

```text
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### 타입 정의

| 타입 | 설명 | 예시 |
|------|------|------|
| `feat` | 새로운 기능 추가 | `feat(web): add lap chart component` |
| `fix` | 버그 수정 | `fix(api): resolve WebSocket timeout issue` |
| `docs` | 문서 수정 | `docs(readme): update installation guide` |
| `style` | 코드 포맷팅 (기능 변경 없음) | `style(web): fix eslint warnings` |
| `refactor` | 코드 리팩토링 | `refactor(types): extract common interfaces` |
| `test` | 테스트 추가/수정 | `test(api): add unit tests for replay service` |
| `chore` | 빌드/설정 관련 | `chore: update dependencies` |
| `perf` | 성능 개선 | `perf(web): optimize chart rendering` |
| `ci` | CI/CD 관련 | `ci: add docker build workflow` |

### 스코프 가이드

| 스코프 | 설명 | 사용 예시 |
|--------|------|-----------|
| `web` | 프론트엔드 관련 | `feat(web): add calendar navigation` |
| `api` | 백엔드 API 관련 | `fix(api): handle database connection error` |
| `ui` | UI 컴포넌트 라이브러리 | `feat(ui): add button variants` |
| `types` | 공통 타입 정의 | `refactor(types): update driver DTO` |
| `etl` | 데이터 수집/처리 | `feat(etl): add FastF1 integration` |
| `infra` | 인프라/배포 관련 | `chore(infra): update docker compose` |
| `config` | 설정 파일 관련 | `chore(config): update eslint rules` |

### 좋은 커밋 메시지 예시

```bash
# 기능 추가
feat(web): implement interactive lap chart with D3.js

- Add position change animations
- Include driver color coding
- Support hover tooltips with timing details

Closes #123

# 버그 수정
fix(api): resolve WebSocket connection timeout

The connection was timing out after 30s due to missing
heartbeat mechanism. Added ping/pong to maintain connection.

Fixes #456

# 리팩토링
refactor(types): extract common F1 data interfaces

- Move session types to shared package
- Update imports across web and api
- Improve type safety for lap data

# 문서 업데이트
docs(api): add WebSocket API documentation

- Document replay events and data structures
- Include code examples for client integration
- Add troubleshooting section
```

---

## 3. PR (Pull Request) 가이드

### PR 템플릿

```markdown
## 변경 사항 요약
<!-- 이 PR에서 무엇을 변경했는지 간단히 설명 -->

## 상세 설명
<!-- 변경 사항에 대한 자세한 설명 -->

## 관련 이슈
<!-- 해결하는 이슈가 있다면 링크 -->
Closes #123
Fixes #456

## 테스트 시나리오
<!-- 어떻게 테스트했는지 설명 -->
- [ ] 로컬 환경에서 기능 동작 확인
- [ ] 유닛 테스트 통과
- [ ] E2E 테스트 시나리오 검증

## 스크린샷 (UI 변경 시)
<!-- UI 변경이 있다면 Before/After 스크린샷 -->

## 체크리스트
- [ ] 코드 리뷰 준비 완료
- [ ] ESLint/Prettier 통과
- [ ] TypeScript 컴파일 오류 없음
- [ ] 테스트 케이스 추가/수정
- [ ] 문서 업데이트 (필요 시)
```

### 코드 리뷰 가이드

**리뷰어 체크포인트:**

- [ ] 코드 로직이 명확하고 이해하기 쉬운가?
- [ ] 타입 안전성이 보장되는가?
- [ ] 성능상 문제는 없는가?
- [ ] 보안 취약점은 없는가?
- [ ] 테스트 커버리지가 충분한가?
- [ ] 네이밍이 일관되고 명확한가?

**리뷰 코멘트 예시:**

```text
제안: 이 부분은 `useMemo`를 사용하면 불필요한 재계산을 방지할 수 있을 것 같습니다.

버그: `drivers` 배열이 빈 배열일 때 처리가 필요합니다.

좋습니다: 타입 정의가 명확하고 재사용성이 높네요!

질문: 이 로직을 별도 함수로 분리한 이유가 있나요?
```

---

## 4. 워크플로우

### 일반적인 개발 플로우

```bash
# 1. 최신 develop 브랜치로 이동
git checkout develop
git pull origin develop

# 2. 새 기능 브랜치 생성
git checkout -b feat/web-lap-chart

# 3. 개발 진행 (여러 커밋 가능)
git add .
git commit -m "feat(web): add basic lap chart component"
git commit -m "feat(web): implement position animations"

# 4. 원격 브랜치에 푸시
git push origin feat/web-lap-chart

# 5. GitHub에서 PR 생성 (develop ← feat/web-lap-chart)

# 6. 코드 리뷰 및 수정

# 7. PR 승인 후 Squash and Merge

# 8. 로컬 브랜치 정리
git checkout develop
git pull origin develop
git branch -d feat/web-lap-chart
```

### 핫픽스 플로우

```bash
# 1. main에서 핫픽스 브랜치 생성
git checkout main
git pull origin main
git checkout -b hotfix/critical-security-patch

# 2. 수정 작업
git commit -m "fix: patch security vulnerability in auth"

# 3. main과 develop 양쪽에 병합
# PR 1: main ← hotfix/critical-security-patch
# PR 2: develop ← hotfix/critical-security-patch
```

---

## 5. 팀 협업 규칙

### 역할별 브랜치 권한

| 역할 | 권한 | 담당 영역 |
|------|------|-----------|
| **Frontend Lead** | `feat/web-*`, `fix/web-*` | React SPA, UI/UX, 차트 시각화 |
| **Backend Lead** | `feat/api-*`, `fix/api-*` | NestJS API, ETL, WebSocket |
| **DevOps** | `feat/infra-*`, `ci/*` | Docker, CI/CD, 배포 |

### 일일 동기화

**매일 오전 스탠드업:**

- 어제 완료한 작업
- 오늘 진행할 작업
- 블로커나 도움이 필요한 부분

**주간 코드 리뷰 세션:**

- 주요 PR 함께 리뷰
- 코딩 컨벤션 논의
- 기술적 의사결정 공유

### 긴급 상황 대응

**버그 발견 시:**

1. 즉시 팀에 알림 (Slack/Discord)
2. 이슈 생성 및 우선순위 설정
3. 핫픽스 브랜치로 즉시 수정
4. 테스트 후 빠른 배포

### 품질 관리

**자동화된 검사:**

- ESLint + Prettier (코드 스타일)
- TypeScript 컴파일 (타입 안전성)
- Jest Unit Tests (기능 테스트)
- Playwright E2E Tests (통합 테스트)
- Lighthouse CI (성능 모니터링)

**수동 검사:**

- Cross-browser 테스트
- 모바일 반응형 확인
- 접근성 (a11y) 검증

---

## 6. 트러블슈팅

### 자주 발생하는 문제들

**브랜치 충돌 해결:**

```bash
# develop 최신화 후 rebase
git checkout feat/my-feature
git fetch origin
git rebase origin/develop

# 충돌 해결 후
git add .
git rebase --continue
git push --force-with-lease origin feat/my-feature
```

**실수로 잘못된 브랜치에 커밋한 경우:**

```bash
# 최근 커밋을 다른 브랜치로 이동
git checkout correct-branch
git cherry-pick <commit-hash>
git checkout wrong-branch
git reset --hard HEAD~1
```

**커밋 메시지 수정:**

```bash
# 마지막 커밋 메시지 수정
git commit --amend -m "새로운 커밋 메시지"

# 이미 푸시한 경우 (주의: 다른 사람이 pull하기 전에만)
git push --force-with-lease origin branch-name
```

---

> 이 가이드는 팀의 생산성과 코드 품질을 높이기 위한 규칙입니다.  
> 궁금한 점이나 개선 사항이 있다면 언제든 팀에 공유해 주세요! 🚀
