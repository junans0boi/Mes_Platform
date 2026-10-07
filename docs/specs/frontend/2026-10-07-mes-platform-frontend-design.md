# Mes Platform frontend design

작성일: 2026-10-07
상태: 개정 2 — 승인됨 (D1~D14, 개정 2 추가 결정 반영). 티켓 세트 작성 단계
근거:
- `docs/reverse-engineering/frontend/2026-10-07-kdit-frontend-baseline.md`
- `docs/specs/backend/2026-10-07-mes-platform-backend-design.md`
- `docs/specs/database/2026-10-07-mes-platform-database-design.md`

개정 이력: 초안 → 개정 1 → 개정 2(성능 수치 채택, plantId 명시 전달, 인증 방향, ChangeWorkOrderStatus 보류, ProjectionVersion 확정, 가정 A1~A6 확정, 범위 밖 명시). 실시간 계약, 응답 envelope, 오류 구조, cursor 페이징, 라우터, 메뉴·권한, 전역 UI 상태, OpenAPI 도구, 다국어, grid preference, WorkOrder·Slice C 범위, 인증, 성능 기준을 확정했다. 확정 내용은 §21에 모았다.

## 1. 목적

`Mes_Platform`의 프론트엔드는 다음 MES 사업에서 반복 사용할 수 있는 하나의 React 애플리케이션으로 만든다.

이 설계는 Kdit의 실제 업무 흐름과 성능 문제를 보존하면서 다음 문제를 구조적으로 해결한다.

- 페이지 파일이 업무 규칙·API·레이아웃·상태를 함께 소유하는 문제
- 하나의 App 파일에 모든 라우트와 페이지 import가 모이는 문제
- 범용 DataGrid 훅이 CRUD, 사용자 설정, export, snackbar까지 담당하는 문제
- 페이지별 polling과 직접 JSON 파싱으로 실시간 처리 기준이 달라지는 문제
- 서버 상태와 전역 UI 상태가 같은 저장소에 섞이는 문제
- 100만 건 이상 데이터에서 브라우저가 전체 데이터를 받거나 다시 파싱하는 문제
- API 계약과 화면 모델이 직접 연결되지 않아 추적이 어려운 문제

## 2. 목표

- `frontend/mes-web` 하나로 생산·품질·재고·출하·모니터링·시스템 기능을 제공한다.
- 신규 기능은 기능 중심 vertical slice로 추가한다.
- 화면은 API URL과 DB 테이블명을 직접 알지 않는다.
- 목록 화면은 서버 페이징·정렬·필터링·가상화를 기본으로 한다.
- 실시간 화면은 `ProcessUnitStatusCurrent` projection(API: `process-unit-status`)과 변경 무효화 이벤트를 기준으로 한다. 화면 코드는 DB 이름을 직접 쓰지 않는다.
- Command 결과에서 `requestId`, `operationId`, 오류 code를 확인할 수 있게 한다.
- 화면 패턴과 공통 UI는 재사용하되, 업무 규칙은 feature 모듈이 소유한다.
- Kdit의 동작은 참고하되, 기존 파일 구조를 복사하지 않는다.

## 3. 비목표

- Kdit 프론트엔드의 즉시 전면 마이그레이션
- 모든 과거 화면을 첫 번째 릴리스에 구현
- 모든 테이블에 동일한 CRUD 화면 자동 생성
- 브라우저에 전체 대용량 테이블을 캐시하는 방식
- 마이크로프론트엔드 또는 기능별 별도 프론트엔드 프로젝트
- 모든 페이지를 KeepAlive로 유지하는 방식
- UI 공통화를 목적으로 한 거대한 범용 `BasePage` 또는 `BaseGrid` 만들기

## 4. 확정 방향

### 4.1 저장소와 애플리케이션

```text
Repository: Mes_Platform
Frontend:   frontend/mes-web
Contracts:  contracts/openapi.yaml   (프론트·백엔드 공유 계약, contract-first)
Solution:   MesPlatform.sln          (저장소 루트)
```

프론트엔드는 하나의 프로젝트다. 기능별로 디렉터리와 route chunk를 나누지만 package와 배포 단위는 하나로 유지한다.

### 4.2 기술 선택

| 영역 | 선택 | 이유 |
|---|---|---|
| UI | MUI + MUI X DataGrid Premium | Kdit의 운영 경험과 대용량 그리드 기능을 계승 |
| 라우팅 | React Router `createBrowserRouter` + route `lazy` | App 파일의 정적 import를 줄이고 URL을 업무 주소로 유지 |
| 서버 상태 | TanStack Query | 캐시·취소·재조회·mutation invalidation을 표준화 |
| 전역 UI 상태 | React Context + localStorage | 사이드바·밀도·알림 drawer 정도에 새 의존성이 필요하지 않다. Zustand는 도입하지 않는다. |
| 폼 | React Hook Form + Zod | 입력 검증과 Command 모델을 명시적으로 연결 |
| API 계약 | `openapi-typescript` + `openapi-fetch` | OpenAPI에서 타입을 생성하고 얇은 typed client를 사용 |
| 실시간 | SignalR | projection 무효화 알림·연결 상태 제공 |
| 다국어 | i18next namespace, ko/en/vi 지원 구조 | 모듈별 리소스 분리와 지연 로딩 |
| 브라우저 검증 | Playwright | 실제 조회·Command·실시간 상태 검증 |

버전은 Kdit 참조 구성(React 19, MUI 7, MUI X 8, React Router 7)을 기본으로 하며, Slice A 착수 시 lockfile로 고정한다.

OpenAPI 생성물은 직접 수정하지 않는다. Feature API adapter가 generated contract와 화면 모델 사이의 경계를 소유한다. 백엔드 구현 전에는 `contracts/openapi.yaml`을 직접 작성하고, 백엔드가 준비되면 백엔드 생성 문서와 일치하는지 계약 테스트로 확인한다.

## 5. 디렉터리 구조

```text
frontend/mes-web/
├─ package.json
├─ vite.config.ts
├─ playwright.config.ts
└─ src/
   ├─ app/
   │  ├─ App.tsx
   │  ├─ providers/
   │  ├─ router/            routeRegistry.ts, createAppRouter.tsx
   │  └─ shell/
   │     ├─ AppShell.tsx
   │     ├─ AppHeader.tsx
   │     ├─ AppNavigation.tsx
   │     ├─ WorkspaceTabs.tsx
   │     └─ BootState.tsx
   │
   ├─ platform/
   │  ├─ api/
   │  │  ├─ httpClient.ts
   │  │  ├─ apiError.ts
   │  │  ├─ apiResult.ts
   │  │  └─ generated/
   │  ├─ auth/              login, access token(메모리), 401 처리
   │  ├─ authorization/     capability, plant 범위
   │  ├─ plant/             현재 Plant 컨텍스트
   │  ├─ i18n/
   │  ├─ preferences/
   │  ├─ realtime/
   │  └─ telemetry/
   │
   ├─ shared/
   │  ├─ ui/
   │  │  ├─ PageFrame/
   │  │  ├─ PageHeader/
   │  │  ├─ SearchPanel/
   │  │  ├─ ServerDataGrid/    cursor adapter 포함
   │  │  ├─ DetailDrawer/
   │  │  ├─ CommandBar/
   │  │  ├─ StatusBadge/
   │  │  ├─ OperationFeedback/
   │  │  └─ EmptyState/
   │  ├─ forms/
   │  ├─ hooks/
   │  └─ lib/
   │
   └─ modules/
      ├─ auth/                 LoginPage
      ├─ production/
      │  ├─ work-orders/
      │  └─ process-results/
      ├─ quality/
      ├─ inventory/
      ├─ shipping/
      ├─ monitoring/
      │  └─ process-unit-status/
      ├─ traceability/
      ├─ master-data/
      └─ system/
```

### 5.1 Feature 모듈 규칙

```text
modules/production/work-orders/
├─ route.tsx
├─ api/
│  ├─ workOrderQueries.ts
│  └─ workOrderCommands.ts
├─ model/
│  ├─ workOrder.types.ts
│  ├─ workOrder.schemas.ts
│  └─ workOrder.mappers.ts
└─ ui/
   ├─ WorkOrderPage.tsx
   ├─ WorkOrderSearch.tsx
   ├─ WorkOrderGrid.tsx
   ├─ WorkOrderDetailPanel.tsx
   └─ WorkOrderCommandBar.tsx
```

페이지는 조립자다. API 호출, 업무 상태 전이, 데이터 변환, 그리드 표현을 하나의 파일에 계속 추가하지 않는다.

## 6. 애플리케이션 구성

### 6.1 Provider와 라우터

```text
QueryClientProvider
  └─ AuthProvider
      └─ I18nProvider
          └─ ThemeProvider
              └─ RouterProvider (createBrowserRouter)
                  └─ AppShell / route outlet
```

각 Provider는 하나의 책임만 가진다. 앱 부트스트랩은 사용자·capability·plant 범위·환경 설정을 병렬로 준비하되, 하나의 요청 지연 때문에 Shell 전체를 숨기지 않는다. 부트스트랩 실패는 재시도 가능한 상태로 표시한다.

### 6.2 라우트 registry와 메뉴

클라이언트 route registry가 라우트와 메뉴의 단일 기준이다. 서버는 메뉴 트리를 내려주지 않고, capability와 plant 범위만 내려준다.

```ts
type RouteMetadata = {
  path: string;
  titleKey: string;
  capability: string;       // 예: Production.WorkOrder.Read
  module: string;
  icon?: string;
  preserveState?: boolean;
};
```

메뉴 표시와 route guard는 같은 metadata에서 파생하며, capability가 없는 항목은 메뉴에서 숨기고 직접 접근 시 403 화면을 보여준다. 서버 권한 검증을 대체하지 않는다.

기본은 route `lazy`다.

```text
/production/work-orders     → work-orders route chunk
/monitoring/process-status  → process-status route chunk
/quality/inspections         → inspections route chunk
```

Kdit의 전역 `KeepAlive`는 기본값으로 가져오지 않는다. 검색 조건·cursor·선택 id는 URL과 Query cache로 복원하고, 스캔·작성 중인 작업처럼 손실 비용이 큰 화면만 `preserveState`를 명시한다. 워크스페이스 탭은 URL 목록으로 파생하며 화면 인스턴스를 유지하지 않는다.

### 6.3 인증

기본 방향은 다음과 같다. 백엔드 인증 계약이 완성되기 전에는 refresh 동작을 추측해 구현하지 않는다.

- access token: JS 메모리에만 보관한다. localStorage·sessionStorage에는 토큰과 민감한 인증정보를 저장하지 않는다.
- refresh token: HttpOnly + Secure + SameSite cookie, rotation 적용.
- access token 만료 시 silent refresh를 수행하고, refresh에 실패하면 로그인 화면으로 이동한다(원래 URL 복귀 주소 보존).
- 401은 공통 처리하며 동시에 여러 요청이 401을 받아도 refresh는 한 번만 수행한다.

Slice A는 로그인 화면, 메모리 token, 401 → 로그인 이동까지 구현하고, silent refresh는 인증 계약 확정 후 별도 티켓에서 구현한다. 새로고침 때마다 재로그인하는 구조는 개발 중 임시 상태이며 운영 최종안이 아니다.

## 7. 상태 소유권

| 상태 종류 | 저장 위치 | 예시 |
|---|---|---|
| 서버 상태 | TanStack Query | 작업지시 목록, 검사 이력, ProcessUnitStatus |
| URL 상태 | route/search params | 기간, 라인, 상태, cursor, 선택 id |
| feature local state | feature component/hook | 입력 중인 수량, 임시 검사 결과 |
| 전역 UI 상태 | React Context + localStorage | 네비게이션 접힘, 밀도, 알림 drawer (토큰 제외) |
| 인증·권한 | auth/authorization platform (access token은 메모리) | 사용자, plant, capability |

서버 응답을 전역 store에 복사하지 않는다. Mutation 성공 시 관련 Query key만 invalidate 또는 patch한다.

## 8. API와 데이터 계약

계약의 기준은 `docs/specs/backend/2026-10-07-mes-platform-backend-design.md` §9, §15, §17과 동일하다.

### 8.1 경로와 이름

```text
/api/v1/production/work-orders
/api/v1/production/process-results
/api/v1/monitoring/process-unit-status
/api/v1/traceability/lots/{productionLotId}
```

전송 JSON은 camelCase다.

```text
DB:     dbo.WorkOrder.WorkOrderId
C#:     WorkOrder.WorkOrderId
JSON:   workOrderId
TypeScript: workOrderId
```

프론트엔드는 `Work_Order`나 DB 테이블명을 모델 이름으로 사용하지 않는다.

### 8.2 성공 응답 envelope

단건·목록·Command 결과 모두 같은 형태다.

```json
{
  "data": {},
  "meta": { "requestId": "...", "operationId": "..." }
}
```

목록은 `data` 안에 `items`, `nextCursor`, `hasMore`, `asOf`를 둔다. 조회 전용 요청의 `operationId`는 없을 수 있다. `asOf`는 UTC이며 화면에는 사용자 시간대로 표시한다.

### 8.3 오류 응답

Problem Details에 `code`, `args`, `errors[{field, code, args}]`, `requestId`, `operationId`가 있다. 공통 error mapper가 이를 `ApiError`로 바꾸고, 문구는 `code`와 `args`를 i18n 리소스로 번역한다. 서버 `message`는 화면 문구로 쓰지 않는다. `errors`는 폼 필드 오류로 매핑한다.

### 8.4 Cursor 페이징

- 요청은 `limit`, `cursor`, `sort`, 필터다. 응답은 `nextCursor`, `hasMore`다.
- 임의 페이지 번호 이동과 전체 rowCount는 제공하지 않는다.
- 정렬 조건을 바꾸면 cursor를 초기화하고 처음부터 다시 조회한다.
- 서버가 `CURSOR_SORT_MISMATCH`를 반환하면 cursor를 버리고 첫 페이지를 다시 조회한다.

### 8.5 Command

첫 WorkOrder Command의 이름은 `ChangeWorkOrderStatus`다. 허용 상태 전이는 백엔드 Domain 상태 전이표가 확정되기 전까지 프론트에서 임의로 정하지 않으며, 확정 전에는 상태 변경 UI를 구현하지 않는다(§19 Slice B2).

Command는 다음을 따른다.

1. `Idempotency-Key`를 사용자 동작 1회당 1개 생성하고, 같은 동작의 재시도에는 재사용한다. 새 동작에는 새 키를 만든다.
2. 수정 대상은 상세 조회로 받은 `rowVersion`(Base64 문자열, 불투명 값)을 해석하지 않고 그대로 `expectedVersion`으로 보낸다. Projection의 `projectionVersion`과 혼동하지 않는다.
3. 409(상태·동시성·중복 충돌)는 최신 상세를 다시 조회하고 사용자에게 충돌 이유를 보여준 뒤 재시도 여부를 선택하게 한다.
4. 성공 시 결과를 명확한 문장으로 표시하고, `operationId`를 확인할 수 있게 한다.
5. 영향을 받는 Query만 invalidate 또는 patch한다. 중복 제출은 mutation 상태와 idempotency key로 막는다.

### 8.6 Plant 범위

`plantId`는 숨겨진 공통 헤더로 보내지 않고 API 계약에 명시적으로 포함한다.

- 조회 Query: query parameter 또는 route parameter
- Command: request body 또는 route parameter
- `httpClient`는 `plantId`를 임의로 주입하지 않는다. feature query/command adapter가 현재 Plant 컨텍스트에서 값을 읽어 요청 모델에 담는다.
- 세션은 `allowedPlantIds`를 가진다. 현재 Plant 선택 상태는 프론트(platform/plant)가 관리하고 AppShell에 표시하지만, 최종 권한 검증은 반드시 백엔드가 `allowedPlantIds`와 대조해 수행한다.

## 9. 공통 페이지 패턴

### 9.1 목록·관리형

```text
┌─────────────────────────────────────────────────┐
│ PageHeader: 위치 / 제목 / 주요 명령             │
├─────────────────────────────────────────────────┤
│ SearchPanel: 조건 / 검색 / 초기화                │
├─────────────────────────────────────────────────┤
│ ServerDataGrid: 조회 결과 / 선택 / export        │
└─────────────────────────────────────────────────┘
```

기준정보와 작업지시 목록에 사용한다. 신규 등록·수정은 기본적으로 DetailDrawer 또는 FormDialog에서 처리한다.

### 9.2 마스터-디테일

```text
┌──────────────────────┬──────────────────────────┐
│ MasterGrid            │ DetailPanel              │
│ WorkOrder 목록        │ 선택된 작업지시 상세      │
│ server pagination     │ 선택 시 lazy query        │
└──────────────────────┴──────────────────────────┘
```

상세는 행 선택 후 조회한다. 목록 API가 상세 데이터까지 전부 포함하지 않는다.

### 9.3 작업·스캔형

```text
┌─────────────────────────────────────────────────┐
│ OperationContext: Plant / Line / WorkOrder      │
├──────────────────┬──────────────────────────────┤
│ Scan/Input        │ Candidate / Current items    │
│                  │                              │
├──────────────────┴──────────────────────────────┤
│ FixedActionBar: 취소 / 저장 / 완료               │
└─────────────────────────────────────────────────┘
```

생산실적, 자재불출, 포장, 출하에 사용한다. 일반 목록 화면의 CRUD toolbar를 그대로 사용하지 않는다.

### 9.4 실시간 모니터링

```text
┌─────────────────────────────────────────────────┐
│ RealtimeToolbar: 필터 / 연결상태 / asOf / 갱신   │
├─────────────────────────────────────────────────┤
│ StatusSummaryStrip                               │
├──────────────────────────────────┬──────────────┤
│ RealtimeDataGrid                  │ DetailDrawer │
│ projection rows                   │ selected row │
└──────────────────────────────────┴──────────────┘
```

전체 목록 polling 대신 projection query와 변경 id 이벤트를 사용한다.

### 9.5 품질 검사

```text
┌──────────────┬────────────────────┬──────────────┐
│ 검사 대상     │ 검사 입력           │ 이력·첨부     │
│ Target       │ Inspection Form    │ History      │
└──────────────┴────────────────────┴──────────────┘
```

IQC, MQA, PQC, OQC가 같은 작업 공간 패턴을 공유하되 검사 규칙은 feature가 소유한다.

### 9.6 추적성

```text
검색 대상
   ↓
Lot / WorkOrder / ProcessUnit context
   ↓
시간순 이벤트·결과·재고·검사 연결
   ↓
원본·operation·audit 상세
```

추적성 화면은 단순한 테이블이 아니라 “어떤 기록이 어떤 결과를 만들었는지”를 보여주는 흐름으로 설계한다.

## 10. ServerDataGrid 규칙

`ServerDataGrid`는 업무 규칙을 소유하지 않고 데이터 표시와 상호작용 경계만 제공한다. MUI DataGrid의 page-number 모델에 맞추지 않고, cursor 이동을 맡는 어댑터를 둔다. 이전 페이지는 메모리의 cursor stack으로 이동하며, 새로고침으로 stack을 잃으면 URL의 현재 cursor에서 이어 보고 이전 이동은 첫 페이지로 대체한다.

### 책임

- 서버 cursor pagination, sorting, filtering 연동 (cursor adapter)
- row virtualization
- stable row id
- 선택과 keyboard focus
- loading, empty, error 상태
- column preference (localStorage, §21)
- 화면이 주입한 toolbar와 command slot

### 책임 밖

- WorkOrder 상태 전이
- 품질 판정
- 재고 수량 계산
- 저장 프로시저 이름 결정
- Snackbar 문구 조합
- 여러 업무 Command의 순서 조합

대용량 목록의 기본값은 다음과 같다.

```text
paginationMode: cursor adapter (이전/다음, rowCount·페이지 번호 없음)
sortingMode: server (변경 시 cursor 초기화)
filterMode: server
page size: 기본 50, 상한 200
row model: 현재 화면에 필요한 projection row
export: 대용량은 서버 job
```

## 11. 검색 상태와 필터

검색 필드는 타입이 있는 discriminated union으로 정의한다.

```ts
type SearchField =
  | { type: "text"; key: string; labelKey: string }
  | { type: "select"; key: string; labelKey: string; options: Option[] }
  | { type: "dateRange"; fromKey: string; toKey: string; labelKey: string }
  | { type: "entity"; key: string; labelKey: string; query: string };
```

검색 컴포넌트는 입력값을 만들고, feature query adapter가 API 요청으로 변환한다. API URL과 DB 필드명을 검색 컴포넌트 설정에 직접 넣지 않는다.

URL에 저장할 조건:

- plant, line, workOrder, model 등 업무 범위
- 기간
- 상태
- sort
- 현재 cursor (정렬 변경 시 제거)
- 선택된 상세 id

URL에 저장하지 않을 조건:

- 아직 저장하지 않은 수량 입력
- 임시 검사값
- 모달 열림 여부처럼 복원 가치가 낮은 일시 UI 상태

## 12. Realtime coordinator

실시간 처리는 페이지별 hook이 아니라 `platform/realtime`가 연결을 관리한다. SignalR 이벤트는 무효화 알림이며 데이터를 싣지 않는다.

```text
HubConnection
  ↓
RealtimeCoordinator
  ├─ connection state
  ├─ plant subscription
  ├─ changed id routing
  ├─ batch re-fetch (ids)
  ├─ projectionVersion check
  └─ fallback refresh policy
       ↓
Feature query cache
```

**SignalR 연결 계약(정본: `contracts/realtime-events.md`, 백엔드 설계 §13.3과 동일)**

| 항목 | 값 |
|---|---|
| Hub 경로 | `/hubs/projections` |
| 클라이언트 → 서버 | `SubscribePlant(plantId)`, `UnsubscribePlant(plantId)` |
| 서버 → 클라이언트 이벤트 | `ProjectionChanged` (payload는 `ProjectionChangedEvent`) |
| 인증 | WebSocket 연결에서는 `access_token` query로 access token 전달 |
| 구독 단위 | Plant. 서버가 `allowedPlantIds`와 대조해 허용되지 않은 구독을 거부 |

이벤트 payload:

```ts
type ProjectionChangedEvent = {
  projection: "processUnitStatus";
  plantId: number;
  changedIds: number[];   // ProcessUnitStatusId 목록
  reset?: boolean;        // true이면 changedIds를 사용하지 않고 해당 Query를 invalidate
  asOf: string;
};
```

규칙:

- 이벤트는 행 데이터와 version을 싣지 않는다. 이벤트 자체의 version 비교는 하지 않는다.
- 수신한 `changedIds`는 짧은 시간 창(기본 250ms) 안에서 모아 한 번에 `?ids=` 일괄 재조회한다(상한 100개, 초과 시 분할).
- 재조회된 행은 캐시의 같은 행보다 `projectionVersion`이 클 때만 교체한다. 같거나 낮으면 버린다.
- 캐시에 없는 id는 현재 목록 조건과 맞지 않을 수 있으므로 무시하거나 요약 Query만 무효화한다.
- 모음 창(250ms), 일괄 재조회 상한(100개), fallback 주기(30초)는 코드에 고정하지 않고 설정값으로 관리한다.
- `reset`이 true이거나 변경 범위를 알 수 없으면 feature query를 invalidate한다.
- 연결이 끊긴 동안과 재연결 직후에는 제한된 주기(기본 30초)의 fallback refresh를 수행한다. 이벤트가 안정적으로 다시 들어오면 중단한다.
- 화면이 unmount되면 subscription을 해제한다. 사용자가 보지 않는 탭에서는 갱신을 멈춘다.

## 13. 성능 기준

아래 수치는 초기 설계 목표로 채택했다. 실제 환경과 대표 데이터로 최초 benchmark를 실행한 뒤 근거와 함께 조정할 수 있다. 서버 응답시간과 브라우저 화면 반영시간은 별도 지표로 측정하고 기록한다. 백엔드 기준(백엔드 설계 §18)과 같은 값은 그대로 인용했다.

### 13.1 측정 지표

| 지표 | 목표 | 측정 방법 |
|---|---:|---|
| 첫 목록 응답 p95 (WorkOrder) | 300ms 이하 (서버 응답 기준) | API 테스트, 대표 데이터 |
| 검색 응답 p95 (필터·정렬 변경) | 300ms 이하 | API 테스트, 대표 데이터 |
| 상세 조회 p95 | 300ms 이하 | API 테스트 |
| `process-unit-status` 목록 p95 | 500ms 이하 | API 테스트, 대표 데이터 |
| 이벤트 수신 → 화면 반영 (브라우저) | 1초 이내 (p95) | Playwright 측정 |
| Command 발생 → 화면 표시 (end-to-end) | 3초 이내 (서버 projection 2초 + 브라우저 1초) | Playwright + 서버 시간 비교 |
| 브라우저로 전송하는 row 수 | 목록 1회 최대 200, `ids` 일괄 재조회 최대 100 | 네트워크 검사 |
| 초기 Shell route JS bundle | gzip 300KB 이하 (MUI X DataGrid Premium·차트·모듈 route는 lazy chunk로 분리) | 빌드 산출물 분석, CI 예산 검사 |

표의 서버 응답 지표는 서버 측정값, 브라우저 지표는 브라우저 측정값이다. 둘을 하나의 수치로 합치지 않는다. 초기 Shell route bundle 목표는 최초 Slice A 빌드를 실측한 뒤 확정한다.

### 13.2 데이터 검증 범위

- WorkOrder는 대표 업무 데이터(수천~수만 건 수준의 seed)로 조회 성능을 검증한다. WorkOrder 목록에 100만 건 seed를 강제하지 않는다.
- 100만 건 이상으로 늘어나는 `ProcessResult`, `EquipmentLog` 등은 별도 100만 건 benchmark로 검증한다. 이 benchmark는 백엔드 성능 테스트(백엔드 설계 §20.5)가 소유하며, 대응하는 프론트 목록이 생길 때 해당 슬라이스 티켓에 추가한다.
- 목록 설계 원칙(서버 cursor, 가상화, 전송 row 제한)은 데이터 크기와 상관없이 모든 목록에 적용한다.

### 13.3 조회

- 첫 목록 응답은 서버 index와 projection을 사용한다.
- 검색·정렬·cursor 이동은 서버에서 수행한다.
- 이전 결과를 유지한 채 새 요청의 진행 상태를 표시한다.
- 새 검색 요청이 이전 요청을 취소할 수 있어야 한다.
- detail query는 선택된 항목에 대해서만 실행한다.

### 13.4 렌더링

- route chunk는 lazy loading한다.
- column 정의와 query key는 안정적으로 유지한다.
- row renderer에서 JSON을 반복 파싱하지 않는다.
- 상태 색상 변경으로 전체 표가 불필요하게 rerender되지 않게 한다.
- `React.memo`는 측정된 병목에만 적용한다.

### 13.5 실시간

- SignalR 이벤트가 매번 전체 목록 재조회를 발생시키지 않는다. 변경 id 일괄 재조회만 수행한다.
- 이벤트 빈도, 일괄 재조회 크기, 교체된 row 수를 측정한다.
- 연결 상태와 마지막 `asOf`를 사용자에게 표시한다.

### 13.6 내보내기

- 현재 화면 범위 export와 전체 조건 export를 구분한다.
- 대용량 export는 서버 job으로 실행한다. 첫 슬라이스(A~C)에는 포함하지 않는다.
- 브라우저에서 전체 데이터를 받아 Excel로 조립하지 않는다.

## 14. 시각 시스템

MES 운영자의 빠른 판독을 우선하는 산업용 control-room 방향을 사용한다.

### 토큰 초안

```text
canvas:   #F2F5F7
surface:  #FFFFFF
ink:      #16232E
line:     #D6E0E7
primary:  #0B6E8E
signal:   #E4A936
danger:   #C8483F
success:  #2C7B59
```

규칙:

- 기본 배경과 surface의 대비로 영역을 구분한다.
- primary는 주요 실행과 현재 위치에 사용한다.
- signal, danger, success는 업무 상태에만 사용한다.
- 모든 영역에 둥근 카드와 그림자를 적용하지 않는다.
- 표는 compact, standard, comfortable 밀도를 제공한다.
- 숫자·시간·LOT·QR·작업지시번호는 정렬과 비교가 쉽도록 별도 숫자 스타일을 사용한다.
- 색상만으로 상태를 전달하지 않고 텍스트·아이콘·패턴을 함께 사용한다.
- 1366×768에서 주요 작업이 스크롤 없이 시작되도록 설계한다.
- 키보드 focus와 reduced motion을 지원한다.

주요 시각적 특징은 장식용 카드가 아니라 다음 운영 상태를 항상 보이는 위치에 두는 것이다.

```text
현재 Plant / Line
실시간 연결 상태
데이터 기준 시각 asOf
마지막 operation 상태
```

## 15. 권한과 오류

권한은 메뉴 경로가 아니라 capability code로 표현한다.

```text
Production.WorkOrder.Read
Production.WorkOrder.Create
Production.WorkOrder.ChangeStatus
Quality.Pqc.Complete
Monitoring.ProcessUnitStatus.Read
```

서버는 capability와 허용 plant 범위만 내려주고, 프론트는 이에 따라 메뉴와 action을 필터링한다. 최종 권한 검사는 서버가 수행한다.

오류 표준:

- 조회 오류: 화면 영역 안에 원인과 재시도 제공
- Command 오류: 작업 결과, 사용자 조치, operationId 제공
- 권한 오류: 접근 불가 이유를 명시
- 네트워크 오류: stale 데이터 여부와 마지막 기준 시각 표시
- 유효성 오류: 필드와 업무 규칙 위치에 표시
- 예상하지 못한 오류: route-level Error Boundary와 requestId 제공

## 16. 다국어와 문구

- 처음부터 ko/en/vi를 지원하는 구조로 만든다. 첫 구현에서 모든 문구를 3개 언어로 완성할 필요는 없고, 누락 키는 ko로 대체하되 개발 중 경고한다.
- `common`과 `shell` namespace는 다국어 구조로 만들어 초기 번들에 포함하고, 모듈별 namespace는 route와 함께 lazy loading한다.
- 모듈별 i18next namespace를 사용한다.
- 페이지에서 임의의 fallback 문구를 반복 작성하지 않는다.
- 버튼 문구는 실제 수행 동작을 사용한다.
- 같은 Command는 버튼·성공 메시지·실패 메시지에서 같은 동사를 사용한다.
- 서버 오류 `code`와 `args`, 필드 오류 `errors[].code`를 번역 계층에서 해석한다.
- DB column 이름이나 내부 API 이름을 운영자 문구로 노출하지 않는다.

## 17. 추적성과 관측

Command와 주요 Query는 다음 정보를 개발자 도구와 필요 시 운영 화면에서 연결한다.

```text
requestId
operationId
correlationId
userId
plantId
feature
query/command name
asOf
duration
```

실시간 화면에는 다음을 표시한다.

- 연결 상태
- 마지막 이벤트 시각
- 마지막 projection `asOf`
- stale 또는 reconnect 상태

Traceability 화면은 원본 기록, 결과, 검사, 재고 이동, audit operation을 링크로 연결한다.

## 18. 테스트 전략

### 단위 테스트 (Vitest)

- URL search serializer와 cursor 초기화 규칙
- API response·error mapper (`args`, `errors` 포함)
- capability·plant guard
- query key와 invalidation 정책
- 입력 schema와 업무 validation
- realtime projectionVersion 비교와 id 일괄 재조회 병합

### 통합 테스트

- feature query adapter와 mock API (MSW, `contracts/openapi.yaml` 기준)
- Command 성공 후 cache invalidation, 409 충돌 처리
- 권한에 따른 menu·action 노출
- SearchPanel과 URL 상태 동기화

### Playwright

Slice A~C의 Playwright는 `contracts/openapi.yaml` 기반 mock에서 실행한다. 실제 백엔드 연동 테스트는 백엔드 해당 slice 완료 후 별도 티켓으로 추가한다. 첫 수직 슬라이스에서 다음을 검증한다.

1. 로그인·401 처리·capability에 따른 메뉴
2. WorkOrder 검색
3. cursor 이동과 정렬 변경 시 cursor 초기화
4. 행 선택 후 상세 조회
5. 상태 변경 Command와 409 충돌 처리 (상태 전이표 확정 후, Slice B2)
6. 오류와 재시도
7. 실시간 ProcessUnitStatus 변경 이벤트 수신과 id 재조회
8. SignalR 연결 실패 fallback

### 계약 테스트

`contracts/openapi.yaml`과 백엔드가 생성한 OpenAPI 문서가 일치하는지 검증한다. 백엔드 해당 slice가 준비되는 시점에 추가한다.

## 19. 첫 수직 슬라이스

### Slice A: Frontend foundation

범위:

- Vite React TypeScript 프로젝트, 패키지 매니저는 npm
- 개발 도구: ESLint, Prettier, Vitest, Playwright, MSW
- `.github/workflows` 프론트엔드 CI (type check, lint, test, build, bundle 예산)
- 환경 설정(API·Hub URL, dev proxy). MUI X 라이선스 키는 `.env.local`로만 주입하고 커밋하지 않는다.
- Provider composition, `createBrowserRouter` + lazy route registry
- AppShell, 로그인 화면, 메모리 access token, 401 → 로그인 이동(silent refresh는 제외, 인증 계약 확정 후 별도 티켓)
- capability·plant guard, 현재 Plant 선택·표시 (plantId는 adapter가 요청 모델에 명시 전달)
- typed client와 ApiError mapper, MSW (공유 계약 `contracts/openapi.yaml`·`contracts/realtime-events.md` 초안은 별도 계약 티켓 CON-01이 작성하고 프론트는 소비)
- TanStack Query client
- i18n 구조(ko/en/vi), `common`·`shell` namespace
- 공통 loading/error/empty feedback
- localStorage 기반 UI 설정(밀도·사이드바)

완료 기준:

- 임시 route가 Shell 안에서 lazy loading된다.
- 로그인 후 API 요청에 request id와 인증 정보가 적용된다.
- 401/403/네트워크 오류가 공통 상태로 변환된다.
- AppShell이 전체 API 실패 때에도 재시도 화면을 제공한다.
- 초기 JS bundle 크기가 측정되고 CI에서 기록된다.

### Slice B1: WorkOrder list and detail

범위:

- 목록 조회, 상세 조회 (읽기 전용)
- WorkOrder query contract와 cursor 페이징
- URL search state
- ServerDataGrid cursor adapter
- master-detail layout, detail lazy query
- capability별 menu·route 노출

완료 기준:

- 목록·검색·정렬·cursor 변경이 URL과 API 요청에 반영되고, 정렬 변경 시 cursor가 초기화된다.
- 한 번에 최대 200개 row만 브라우저로 전송된다.
- 행 선택 시 상세만 조회한다.
- requestId를 확인할 수 있다.
- §13.1의 WorkOrder 지표를 대표 데이터로 측정해 서버 응답과 브라우저 표시를 구분해 기록한다.

### Slice B2: ChangeWorkOrderStatus (보류)

백엔드 Domain의 WorkOrder 상태 목록·허용 전이·첫 UI 노출 전이·전이 실패와 동시성 충돌 처리가 확정된 뒤에만 착수한다. 확정 전에는 상태 변경 UI를 만들지 않는다.

범위(착수 시):

- `ChangeWorkOrderStatus` Command adapter, capability(`Production.WorkOrder.ChangeStatus`)별 action
- operation feedback, `Idempotency-Key`, `expectedVersion`, 409 충돌 처리
- 상태 변경 후 관련 Query만 갱신

완료 기준: 확정된 상태 전이표의 각 노출 전이가 성공·실패·409 충돌 시나리오로 검증되고 requestId·operationId를 확인할 수 있다.

### Slice C: ProcessUnitStatus realtime

범위:

- `ProcessUnitStatusCurrent` 공통 query (`process-unit-status`, cursor 목록, `ids` 일괄 재조회)
- realtime coordinator
- 변경 id 재조회와 `projectionVersion` 비교 병합
- 연결 상태, `asOf` 표시, fallback refresh
- 실시간 공정현황 화면 1개: Kdit 1-2 실시간 공정 모니터링
- 4-6, 4-7, 7-3은 제외하고 후속 Issue로 분리한다.

완료 기준:

- 전체 목록을 주기적으로 재조회하지 않고 변경 id만 재조회해 반영한다.
- 오래된 `projectionVersion`의 응답이 최신 상태를 덮어쓰지 않는다.
- 연결 해제·복구 시 사용자에게 상태가 표시되고 fallback refresh가 동작한다.
- projection `asOf`와 브라우저 갱신 시각을 구분할 수 있다.
- 이벤트 수신 후 화면 반영 시간(브라우저)과 서버 projection 반영 시간을 별도로 측정해 기록한다.

### 범위 밖 (Slice A~C)

- 대용량 export job
- 스캔 화면의 상태 보존 정책
- 서버 grid preference 저장
- WorkOrder 등록·수정·삭제
- 1-2, 4-6, 4-7, 7-3 전체 화면 동시 구현 (Slice C는 1-2 하나)
- silent refresh 구현 (인증 계약 확정 후)
- WorkOrder 상태 변경 UI (상태 전이표 확정 후, Slice B2)

## 20. 구현 순서와 승인 게이트

```text
역공학 문서
    ↓
현재 설계 초안
    ↓
사용자 설계 승인
    ↓
Wayfinder: 변경 지점·경계 맵
    ↓
Wayfinder-map: 구현 의존성 맵
    ↓
to-tickets: vertical slice 티켓 세트
    ↓
GitHub Issue 등록
    ↓
Foundation → WorkOrder → Realtime 구현
```

이 문서와 `docs/specs/backend`, `docs/specs/database` 문서가 승인되기 전에는 `frontend/mes-web` 코드 생성, package 설치, Wayfinder, GitHub Issue 등록, commit, push를 시작하지 않는다.

## 21. 결정 현황

### 21.1 확정

| # | 결정 |
|---|---|
| D1 | SignalR 이벤트는 `ProjectionChangedEvent{projection, plantId, changedIds, reset?, asOf}`만 전달한다(§12, 정본 `contracts/realtime-events.md`). `reset=true`이면 `changedIds`를 사용하지 않고 Query를 invalidate한다. 프론트는 변경 id를 일괄 재조회하고 더 새로운 `projectionVersion`일 때만 교체한다. 이벤트 version 비교는 하지 않는다. 유실·복구 시 제한된 fallback refresh를 사용한다. |
| D2 | 응답은 `{data, meta:{requestId, operationId}}`로 통일한다. 목록 필드는 `data` 안에 둔다. |
| D3 | 오류는 Problem Details + `args` + `errors[{field, code, args}]`를 사용한다. |
| D4 | 대용량 목록은 cursor pagination이다. 페이지 번호 이동·rowCount는 없다. 정렬 변경 시 cursor를 초기화한다. DataGrid 위에 cursor adapter를 둔다. |
| D5 | `createBrowserRouter` + route `lazy`. |
| D6 | 클라이언트 route registry가 메뉴·route metadata의 기준이다. 서버는 capability와 plant 범위만 내려준다. |
| D7 | Zustand 없이 React Context + localStorage. access token과 민감정보는 localStorage에 저장하지 않는다. |
| D8 | `openapi-typescript` + `openapi-fetch`. 백엔드 전에는 `contracts/openapi.yaml`을 contract-first로 작성한다. |
| D9 | ko/en/vi 지원 구조. `common`·`shell`은 번들, 모듈 namespace는 lazy. 문구 완성은 단계적으로 한다. |
| D10 | Grid preference는 Slice A~C에서 localStorage만. 서버 저장은 후속 Issue. |
| D11 | 첫 Command 이름은 `ChangeWorkOrderStatus`. 상태 전이표 확정 전에는 WorkOrder 목록·상세만 구현하고 상태 변경 UI는 구현하지 않는다(Slice B1/B2). |
| D12 | 인증 기본 방향: access token 메모리, refresh token HttpOnly+Secure+SameSite cookie(rotation), 만료 시 silent refresh, 실패 시 로그인 이동. 세부 계약은 백엔드 인증 계약 확정 후 구현한다. |
| D13 | Kdit 원본 문서는 보존하고 Mes_Platform의 `docs/specs/backend`, `docs/specs/database`, `docs/plans/backend`를 구현 기준으로 한다. |
| D14 | Slice C는 공통 query, coordinator, 변경 id 재조회, version 처리, 연결 상태·fallback, 화면 1개로 제한한다. |
| D15 | `plantId`는 API 계약에 명시한다(Query: query/route parameter, Command: body/route parameter). `httpClient`가 몰래 주입하지 않고 서버가 `allowedPlantIds`와 최종 대조한다. |
| D16 | `ProcessUnitStatusCurrent.ProjectionVersion`은 projection 전용 bigint, `dbo.ProjectionVersionSeq` 사용, row Upsert와 version 기록은 같은 transaction, 이벤트에 version 미포함. |
| D17 | 성능 수치(§13.1)는 초기 설계 목표이며 최초 benchmark 후 조정할 수 있다. 서버 응답시간과 브라우저 반영시간은 별도 지표다. |
| C7 | WorkOrder에 100만 건 seed를 강제하지 않고, ProcessResult·EquipmentLog는 별도 100만 건 benchmark로 둔다. |

### 21.2 확정된 가정

| # | 항목 |
|---|---|
| A1 | `contracts/openapi.yaml`은 Mes_Platform 저장소 루트의 공유 계약 |
| A2 | npm 사용 |
| A3 | Slice C는 Kdit 1-2 실시간 공정 모니터링 |
| A4 | §13.1 성능 수치는 초기 목표이며 benchmark 후 조정 가능 |
| A5 | 250ms event batching, ids 100개 상한, fallback 30초는 설정값으로 관리 |
| A6 | 백엔드 foundation은 별도 저장소가 아니라 Mes_Platform 루트에서 진행 |

### 21.3 미결 (해당 백엔드 계약 확정 후 결정)

1. 인증 계약(refresh·logout·cookie): refresh·logout endpoint, cookie 속성 값, rotation 재사용 감지 동작, CORS·cookie 배포 구성. provisional login·session(`POST /api/v1/auth/login`, `GET /api/v1/auth/session`)은 CON-01에서 확정되어 있고 Slice A가 사용한다. 확정 전에는 silent refresh를 구현하지 않는다.
2. WorkOrder 백엔드 결정: 상태 목록, 허용 상태 전이, 첫 UI에서 노출할 전이, 전이 실패 및 동시성 충돌 처리. 확정 전에는 상태 변경 UI를 구현하지 않는다.

### 21.4 범위 밖

대용량 export job, 스캔 화면의 상태 보존 정책, 서버 grid preference 저장, WorkOrder 등록·수정·삭제, 1-2·4-6·4-7·7-3 전체 동시 구현. 각각 후속 Issue로 분리한다.

