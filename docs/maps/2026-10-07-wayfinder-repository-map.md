# Wayfinder: repository map

작성일: 2026-10-07
상태: 티켓 세트 작성용 (설계 개정 2 승인 기준)
기준 문서:

- `docs/specs/frontend/2026-10-07-mes-platform-frontend-design.md` (개정 2)
- `docs/specs/backend/2026-10-07-mes-platform-backend-design.md`
- `docs/specs/database/2026-10-07-mes-platform-database-design.md`
- `docs/plans/backend/2026-10-07-mes-platform-backend-foundation-plan.md`

Wayfinder 전용 도구는 이 환경에 없어 저장소 검색과 파일 확인으로 같은 결과를 작성했다.

## 1. 현재 저장소 (확인된 사실)

`git status`: 커밋이 하나도 없는 `main`, 모든 파일이 untracked.

| 경로 | 내용 | 역할 |
|---|---|---|
| `AGENTS.md`, `CLAUDE.md` | 얇은 entrypoint | `docs/agents/PROJECT_RULES.md`를 가리킴 |
| `docs/agents/` | PROJECT_RULES, WORKFLOW, DEFINITION_OF_DONE | 에이전트 규칙. 구현 중에도 변경하지 않음 |
| `docs/reverse-engineering/frontend/` | Kdit 프론트엔드 baseline | 근거 문서 |
| `docs/specs/{frontend,backend,database}/` | 승인된 설계 | 구현 기준 |
| `docs/plans/backend/` | 백엔드 foundation 계획(Task 1~9) | 백엔드 구현 계획 |
| `docs/maps/`, `docs/tickets/`, `docs/decisions/` | 맵·티켓·결정 | 산출물 위치 |
| `scripts/agent-check.mjs`, `scripts/agent-init.mjs` | 저장소 검증·초기화 | Node ESM, 의존성 없음 |
| `.github/ISSUE_TEMPLATE/`, `pull_request_template.md` | feature·architecture·bug 템플릿 | Issue 형식 기준 |
| `.gitignore` | .NET, Node, `.env.*`(`!.env.example`) 무시 | 이미 환경 파일과 산출물 제외 |
| `README.md` | 계획된 solution 형태 | 슬라이스 진행 시 갱신 |

없는 것: `frontend/`, `contracts/`, `src/`, `tests/`, `MesPlatform.sln`, `.github/workflows/`, `package.json`, lockfile.

검증 seam: `node scripts/agent-check.mjs`가 유일한 자동 검사다. 필수 파일 목록을 하드코딩하므로 새 필수 문서를 추가해도 자동으로 검사되지는 않는다.

## 2. 진입점

| 영역 | 진입점 (생성 예정) |
|---|---|
| 프론트 | `frontend/mes-web/src/main.tsx` → `app/App.tsx` → `app/router/createAppRouter.tsx` |
| 계약 | `contracts/openapi.yaml`, `contracts/realtime-events.md` (CON-01) |
| 서버 | `src/MesPlatform.Server/Program.cs` (HTTP + SignalR Hub) |
| 워커 | `src/MesPlatform.Worker` (별도 프로세스) |

## 3. 경계와 의존 방향

프론트 (설계 §5):

```text
modules → shared → (platform)      modules → platform
app → modules, platform, shared
platform → (shared pure utils 만)
```

- `modules/*`는 서로 import하지 않는다. 공유가 필요하면 `shared` 또는 `platform`으로 올린다.
- `platform/api`만 HTTP를 호출한다. 모듈은 `modules/*/api`의 query·command adapter만 사용한다.
- `platform/api/generated`는 생성물이며 수정하지 않는다.

백엔드 (계획 Global Constraints): `Domain ← Application ← Infrastructure ← Server/Worker`, `Contracts`는 project reference 없음.

프론트 ↔ 백엔드 ↔ DB 접점은 공유 계약(`contracts/openapi.yaml`, `contracts/realtime-events.md`)이 정한다. 계약은 CON 티켓만 수정하고, 계약보다 먼저 독립적으로 구현된 API는 허용하지 않는다. DDL은 `database/`가 소유한다.

## 4. 변경 지점

### 4.1 새로 만들 것

| 경로 | 슬라이스 |
|---|---|
| `contracts/openapi.yaml`, `contracts/realtime-events.md` | CON-01이 작성, CON-02가 확장. FE·BE·DB는 소비만 함 |
| `frontend/mes-web/**` | Slice A~C |
| `.github/workflows/frontend.yml` | FE-01 |
| `MesPlatform.sln`, `src/**`, `tests/**`, `Directory.*`, `global.json`, `.editorconfig`, `.github/workflows/build.yml`, `scripts/verify.ps1` | 백엔드 plan Task 1~9 |
| `database/MesPlatform.Database/**` | DB-01, DB-02 |
| `docs/decisions/*.md` | 결정 확정 시 |

### 4.2 수정할 것 (기존)

| 경로 | 변경 |
|---|---|
| `README.md` | 슬라이스 진행 상태, 실행 방법 |
| `.gitignore` | 필요 시 `frontend/mes-web` 산출물·`.env.local` 확인 (현재 `.env.*` 이미 제외) |
| `scripts/agent-check.mjs` | `contracts/openapi.yaml` 존재 확인 추가는 선택. CON-01에서 판단 |
| `docs/specs/**` | 구현 중 실제 요구가 바뀔 때만 |

### 4.3 건드리지 않을 것

- `/Volumes/WorkSpace/Project/Kdit/**` 전체 (읽기 전용 참고)
- `docs/agents/**` (규칙 변경은 별도 승인)
- `docs/reverse-engineering/**` (근거 문서, 새 사실 발견 시 추가만)
- 이미 커밋하지 않은 초기 파일의 내용을 되돌리거나 재생성하지 않음

## 5. Kdit 참조 근거 (읽기 전용)

| 목적 | 위치 | 확인한 사실 |
|---|---|---|
| WorkOrder 모델 | `Kdit/frontend/home/kdit-web/src/models/entity/workOrder.ts` | `status: string`으로 상태가 열려 있고 허용 전이가 타입에 없다. 수량 필드(plannedQty, goodQty, defectQty, completedQty)와 FK 중심 구조다. |
| WorkOrder UI | `src/components/WorkOrder/WorkOrderDetailDialog.tsx` (191줄), `WorkOrderFormDialog.tsx` (304줄) | 상세는 dialog, 등록·수정은 별도 form dialog |
| 1-2 화면 | `src/pages/contents/monitoring/MonitoringRealtimeProcessMonitoring.tsx` (3,435줄) | baseline §10, §9 참고. Slice C가 대체할 대상 |
| 알림 Hub | `src/hooks/useNotificationHub.ts:64-96` | 15초 polling 보완 |
| Projection 설계 | Kdit `docs/superpowers/specs/2026-10-07-*` | 복사본이 `docs/specs/backend|database` |

WorkOrder 상태 값은 Kdit에서 자유 문자열이라 상태 전이표를 Kdit에서 복원할 수 없다. 백엔드 결정 항목 24.2로 남긴다.

## 6. 기존 규약

- 문서 한국어, 코드·식별자 영어 (기존 문서 관행)
- `MesPlatform`(.NET), `mes-web`(프론트), `Mes_Platform`(저장소)
- PascalCase(DB·C#), camelCase(JSON·TS)
- Issue 형식은 `.github/ISSUE_TEMPLATE/feature.md`의 8개 항목
- DoD: 로딩·빈·오류·재시도·취소·권한 상태, requestId·operationId 노출, 성능 측정 기록

## 7. 테스트 surface

| 수준 | 도구 | 위치 (생성 예정) |
|---|---|---|
| 저장소 | `node scripts/agent-check.mjs` | 기존 |
| 프론트 단위·통합 | Vitest, MSW | `frontend/mes-web/src/**/*.test.ts(x)` |
| 프론트 E2E | Playwright (mock 기반) | `frontend/mes-web/e2e/` |
| 계약 | OpenAPI 비교 | 백엔드 해당 slice 이후 |
| 백엔드 | xUnit, Architecture tests | `tests/**` |
| 성능 | 서버 p95: BE-09, 브라우저: FE-11 (Playwright) | BE-09, FE-11 |

## 8. 위험

1. 커밋이 없는 저장소라 첫 커밋 구성이 열려 있다. 티켓 확인 후 사용자 결정이 필요하다.
2. MUI X DataGrid Premium 라이선스 키는 번들에 포함되는 클라이언트 키다. `.env.local`로만 주입하고 `.env.example`에는 이름만 둔다.
3. 백엔드 구현 전에는 모든 프론트 검증이 `contracts/openapi.yaml` mock 기준이다. 계약 변경이 늦으면 프론트가 틀어질 수 있어 계약 테스트 티켓을 둔다.
4. 백엔드 plan Task 2의 WorkOrder 전이 규칙은 provisional로 표시했다(계약·UI가 의존하면 안 됨).

5. Projection 실제 계산(`ProcessResult` 기반)은 이 Epic에 없다. BE-08은 계산기 seam과 검증용 calculator까지이며, 원본 테이블 DDL과 실제 계산기는 후속 티켓이다.
6. Worker와 Server는 별도 프로세스다. Projection 갱신 후 SignalR 발행은 Transactional Outbox(Worker가 같은 transaction에 기록, Server Dispatcher가 발행, at-least-once)로 하며 정책 값은 BE-12가 확정한다. SignalR backplane은 후속이다.
