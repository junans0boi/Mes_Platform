# 티켓 세트: MES Platform 기반 및 첫 수직 슬라이스

작성일: 2026-10-07
상태: 개정 2 — GitHub Issue 등록 완료(2026-10-07). Epic과 30개 티켓을 등록했다.
근거: `docs/specs/frontend/2026-10-07-mes-platform-frontend-design.md` (개정 2), `docs/specs/backend/…`, `docs/specs/database/…`, `docs/maps/2026-10-07-wayfinder-repository-map.md`, `docs/maps/2026-10-07-wayfinder-map-dependencies.md`

## Epic

GitHub: [#1](https://github.com/junans0boi/Mes_Platform/issues/1)

**MES Platform 기반 및 첫 수직 슬라이스 (Frontend + Backend + Database)**

프론트·백엔드·DB가 같은 수직 슬라이스 결과를 만들기 때문에 하나의 상위 Epic으로 둔다. 영역은 라벨 `FE`, `BE`, `DB`, `contract`로, 완료 조건은 Gate 라벨(`gate:foundation`, `gate:integration`, `gate:performance`, `deferred`)로 구분한다.

결과: 로그인한 운영자가 capability와 Plant 범위 안에서 WorkOrder 목록·상세를 cursor로 조회하고, Kdit 1-2 대체 화면에서 변경 무효화 이벤트로 갱신되는 공정 현황을 본다. 공유 계약(`contracts/`)이 프론트·백엔드·DB의 단일 원본이며, 계약보다 먼저 독립적으로 구현된 API는 허용하지 않는다.

### 완료 Gate

**1. Foundation / mock Gate** (`gate:foundation`)
- [ ] CON-01 공유 계약 초안
- [ ] FE-01 ~ FE-10
- [ ] BE-01, BE-02, BE-04

**2. Read-only integration Gate** (`gate:integration`)
- [ ] DB-01, DB-02
- [ ] BE-03, BE-07, BE-08
- [ ] FE-14 계약 테스트
- 실제 완료에는 BE-12 결정과 Outbox 전달 테스트(같은 transaction rollback, 중복 발행, lease 만료, retry)가 필요하다. Gate 항목 자체는 바꾸지 않았다.

**3. Performance Gate** (`gate:performance`)
- [ ] BE-09 (서버 p95, 대표 데이터)
- [ ] FE-11 (브라우저 지표, 서버 지표와 분리 보고)

**Deferred** (`deferred`, 이번 Epic의 필수 완료 조건이 아님, 후속으로 이어짐)
- CON-02, BE-10, FE-12 (ChangeWorkOrderStatus)
- CON-02, BE-11, FE-13 (silent refresh)
- 대용량 export job, 스캔 상태 보존, WorkOrder 등록·수정·삭제 (티켓 없음)

**Decision 티켓** (`decision`, 비게이팅): BE-05(인증 계약), BE-06(WorkOrder 상태 전이표), BE-12(Projection 변경 알림 전달). BE-05·BE-06은 Deferred 항목의 선행 조건이다. **BE-12는 Gate에 포함되지 않지만 DB-02와 BE-08의 필수 선행 조건**이므로 먼저 진행한다.

## 티켓 목록

### 공유 계약 (contract)

| ID | 제목 | 라벨 | 선행 | 상태 |
|---|---|---|---|---|
| [CON-01](CON-01.md) ([#2](https://github.com/junans0boi/Mes_Platform/issues/2)) | 공유 API 계약 초안: openapi.yaml과 실시간 이벤트 계약 | feature, contract, gate:foundation | - | 착수 가능 |
| [CON-02](CON-02.md) ([#6](https://github.com/junans0boi/Mes_Platform/issues/6)) | 공유 계약 추가: ChangeWorkOrderStatus와 인증 refresh | feature, contract, deferred | BE-05, BE-06 | 차단 (Deferred) |

### Frontend (FE)

| ID | 제목 | 라벨 | 선행 | 상태 |
|---|---|---|---|---|
| [FE-01](FE-01.md) ([#8](https://github.com/junans0boi/Mes_Platform/issues/8)) | frontend/mes-web 프로젝트와 빌드 도구(toolchain) 구성 | feature, FE, gate:foundation, slice-a | - | 착수 가능 |
| [FE-02](FE-02.md) ([#9](https://github.com/junans0boi/Mes_Platform/issues/9)) | 공유 계약 기반 타입 API client(typed client), ApiError mapper, MSW | feature, FE, gate:foundation, slice-a | FE-01, CON-01 | 착수 가능 |
| [FE-03](FE-03.md) ([#10](https://github.com/junans0boi/Mes_Platform/issues/10)) | Provider, route registry, AppShell, i18n, UI context 구성 | feature, FE, gate:foundation, slice-a | FE-01 | 착수 가능 |
| [FE-04](FE-04.md) ([#11](https://github.com/junans0boi/Mes_Platform/issues/11)) | 인증: 로그인, 메모리 token, 401 처리, capability·Plant guard | feature, FE, auth, gate:foundation, slice-a | FE-02, FE-03 | 착수 가능 |
| [FE-05](FE-05.md) ([#12](https://github.com/junans0boi/Mes_Platform/issues/12)) | 공통 데이터 패턴: ServerDataGrid cursor adapter, SearchPanel, URL 상태 | feature, FE, gate:foundation, slice-a | FE-02, FE-03 | 착수 가능 |
| [FE-06](FE-06.md) ([#13](https://github.com/junans0boi/Mes_Platform/issues/13)) | WorkOrder 목록 (읽기 전용) | feature, FE, production, gate:foundation, slice-b1 | FE-04, FE-05, CON-01 | 착수 가능 |
| [FE-07](FE-07.md) ([#14](https://github.com/junans0boi/Mes_Platform/issues/14)) | WorkOrder 상세 (master-detail) | feature, FE, production, gate:foundation, slice-b1 | FE-06 | 착수 가능 |
| [FE-08](FE-08.md) ([#15](https://github.com/junans0boi/Mes_Platform/issues/15)) | ProcessUnitStatus 조회와 1-2 실시간 공정 화면 (데이터 조회만) | feature, FE, monitoring, gate:foundation, slice-c | FE-04, FE-05, CON-01 | 착수 가능 |
| [FE-09](FE-09.md) ([#16](https://github.com/junans0boi/Mes_Platform/issues/16)) | 실시간 coordinator: SignalR, 변경 id 재조회, version 병합 | feature, FE, realtime, gate:foundation, slice-c | FE-08 | 착수 가능 |
| [FE-10](FE-10.md) ([#17](https://github.com/junans0boi/Mes_Platform/issues/17)) | 실시간 연결 상태, fallback refresh, asOf 표시 | feature, FE, realtime, gate:foundation, slice-c | FE-09 | 착수 가능 |
| [FE-11](FE-11.md) ([#27](https://github.com/junans0boi/Mes_Platform/issues/27)) | 초기 성능 benchmark와 목표 수치 검토 | feature, FE, performance, gate:performance | FE-07, FE-10, BE-09 | 착수 가능 |
| [FE-12](FE-12.md) ([#30](https://github.com/junans0boi/Mes_Platform/issues/30)) | ChangeWorkOrderStatus UI | feature, FE, production, deferred | FE-07, BE-10, CON-02 | 차단 (Deferred) |
| [FE-13](FE-13.md) ([#31](https://github.com/junans0boi/Mes_Platform/issues/31)) | 인증 silent refresh | feature, FE, auth, deferred | FE-04, BE-11, CON-02 | 차단 (Deferred) |
| [FE-14](FE-14.md) ([#25](https://github.com/junans0boi/Mes_Platform/issues/25)) | 계약 테스트: openapi.yaml과 백엔드 OpenAPI 비교 | feature, contract, FE, BE, gate:integration | CON-01, BE-02, BE-07, BE-08 | 착수 가능 |

### Backend (BE)

| ID | 제목 | 라벨 | 선행 | 상태 |
|---|---|---|---|---|
| [BE-01](BE-01.md) ([#7](https://github.com/junans0boi/Mes_Platform/issues/7)) | 백엔드 기반 1/4: solution, Domain, Application 기본 타입 | feature, BE, foundation, gate:foundation | - | 착수 가능 |
| [BE-02](BE-02.md) ([#18](https://github.com/junans0boi/Mes_Platform/issues/18)) | 백엔드 기반 2/4: Infrastructure seam, Server host, envelope, Problem Details | feature, BE, foundation, contract, gate:foundation | BE-01, CON-01 | 착수 가능 |
| [BE-03](BE-03.md) ([#22](https://github.com/junans0boi/Mes_Platform/issues/22)) | 백엔드 기반 3/4: JWT, Permission Code, Plant 범위 | feature, BE, auth, gate:integration | BE-02, CON-01 | 착수 가능 |
| [BE-04](BE-04.md) ([#19](https://github.com/junans0boi/Mes_Platform/issues/19)) | 백엔드 기반 4/4: operation log, audit, Worker, 아키텍처 테스트, CI | feature, BE, foundation, gate:foundation | BE-02 | 착수 가능 |
| [BE-05](BE-05.md) ([#3](https://github.com/junans0boi/Mes_Platform/issues/3)) | 결정: 인증 계약 (refresh·logout·cookie) | architecture, BE, auth, decision | - | 착수 가능 |
| [BE-06](BE-06.md) ([#4](https://github.com/junans0boi/Mes_Platform/issues/4)) | 결정: WorkOrder 상태와 상태 전이표 | architecture, BE, production, decision | - | 착수 가능 |
| [BE-07](BE-07.md) ([#23](https://github.com/junans0boi/Mes_Platform/issues/23)) | WorkOrder 조회 API (목록, 상세) | feature, BE, production, gate:integration | CON-01, DB-01, BE-02, BE-03 | 착수 가능 |
| [BE-08](BE-08.md) ([#24](https://github.com/junans0boi/Mes_Platform/issues/24)) | ProcessUnitStatusCurrent 조회 API, ProjectionVersion, SignalR 이벤트 | feature, BE, monitoring, realtime, gate:integration | CON-01, DB-02, BE-04, BE-03, BE-12 | 착수 가능 |
| [BE-09](BE-09.md) ([#26](https://github.com/junans0boi/Mes_Platform/issues/26)) | 대표 데이터 seed와 서버 성능 측정 도구(performance harness) | feature, BE, DB, performance, gate:performance | BE-07, BE-08, DB-01, DB-02 | 착수 가능 |
| [BE-10](BE-10.md) ([#28](https://github.com/junans0boi/Mes_Platform/issues/28)) | WorkOrder ChangeWorkOrderStatus API | feature, BE, deferred | BE-06, BE-03, BE-04, BE-07, CON-02 | 차단 (Deferred) |
| [BE-11](BE-11.md) ([#29](https://github.com/junans0boi/Mes_Platform/issues/29)) | 인증 refresh 구현 | feature, BE, auth, deferred | BE-05, BE-03, CON-02 | 차단 (Deferred) |
| [BE-12](BE-12.md) ([#5](https://github.com/junans0boi/Mes_Platform/issues/5)) | 결정: Projection 변경 알림 전달 방식(transport) | architecture, BE, realtime, decision | - | 착수 가능 |

### Database (DB)

| ID | 제목 | 라벨 | 선행 | 상태 |
|---|---|---|---|---|
| [DB-01](DB-01.md) ([#20](https://github.com/junans0boi/Mes_Platform/issues/20)) | Database 프로젝트, DDL 구조, 공통 schema, WorkOrder 테이블과 index | feature, DB, gate:integration | BE-01, CON-01 | 착수 가능 |
| [DB-02](DB-02.md) ([#21](https://github.com/junans0boi/Mes_Platform/issues/21)) | ProcessUnitStatusCurrent, ProjectionVersionSeq, ProcessStatusRefreshQueue, ProjectionChangeOutbox와 index | feature, DB, gate:integration | DB-01, BE-12 | 착수 가능 |

## 의존성 표

`docs/maps/2026-10-07-wayfinder-map-dependencies.md` §2에 순서도와 병렬 가능성이 있다. 이번 수정에서 바뀐 의존성은 다음이다.

| 티켓 | 이전 선행 | 현재 선행 | 이유 |
|---|---|---|---|
| FE-02 | FE-01 | FE-01, CON-01 | 계약 작성은 CON-01로 분리, FE-02는 소비자 |
| FE-06, FE-08 | FE-04, FE-05 | + CON-01 | 경로를 직접 추가하지 않고 계약 소비 |
| BE-02 | BE-01 | BE-01, CON-01 | envelope·오류·cursor를 계약대로 구현 |
| BE-03 | BE-02 | BE-02, CON-01 | login·session 계약 소비 |
| BE-07 | BE-02 | CON-01, DB-01, BE-02, BE-03 | 계약·스키마 소유권 분리, 권한·Plant 검증 필요 |
| BE-08 | BE-02 | CON-01, DB-02, BE-04, BE-03, BE-12 | Worker host 위에서 Projection Worker 구현, Plant 구독 검증, Outbox 전달 결정 |
| BE-09 | BE-07, BE-08 | + DB-01, DB-02 | seed 대상 스키마 |
| FE-12 | FE-07, BE-06, BE-07 | FE-07, BE-10, CON-02 | 구현 티켓 완료 후 UI |
| FE-13 | FE-04, BE-05, BE-03 | FE-04, BE-11, CON-02 | 구현 티켓 완료 후 UI |
| FE-14 | FE-02, BE-02, BE-07, BE-08 | CON-01, BE-02, BE-07, BE-08 | 계약 원본이 CON-01 |
| DB-01 (신규) | - | BE-01, CON-01 | WorkOrder 컬럼이 계약 필드를 만족 |
| DB-02 (신규) | - | DB-01, BE-12 | Outbox 스키마가 BE-12 결정에 의존 |
| BE-12 (신규) | - | 없음 | Decision, DB-02·BE-08의 필수 선행 |
| BE-10, BE-11, CON-02 (신규) | - | 위 표 참고 | Deferred |

## 범위 주의 (Issue 등록 전 확정 사항)

- **PlantId:** `ProcessUnitStatusCurrent.PlantId`와 `ProcessStatusRefreshQueue.PlantId`는 `int NOT NULL`, `dbo.Plant.PlantId`와 같은 타입, `dbo.Plant` FK. 조회 index는 `PlantId` 선행(DB-02).
- **Projection 계산 범위:** BE-08은 `IProcessUnitStatusCalculator` seam, 검증용 deterministic calculator, Queue → 계산 → Upsert → `ProjectionVersion` → Outbox(같은 transaction) → Server Dispatcher → SignalR 흐름까지다. 전달은 at-least-once이며 backplane은 후속이다. `ProcessResult` 기반 실제 계산은 후속이며 이 Epic에 티켓이 없다. BE-09의 Projection seed는 계산기를 거치지 않는다.
- **인증 경계:** provisional login(`POST /api/v1/auth/login`)·session(`GET /api/v1/auth/session`)은 CON-01 계약이며 BE-03이 구현한다(Development 전용 `IUserAuthenticator`). BE-05는 refresh·logout·cookie·rotation·재사용 감지·CORS만 결정한다.
- **rowVersion:** WorkOrder는 SQL `rowversion NOT NULL`, API `rowVersion`·`expectedVersion`은 Base64 문자열(불투명), 불일치 시 409. `ProjectionVersion`(bigint sequence)과 별개다.

## 이벤트 계약 (모든 문서 동일)

```ts
type ProjectionChangedEvent = {
  projection: "processUnitStatus";
  plantId: number;
  changedIds: number[];
  reset?: boolean;
  asOf: string;
};
```

`reset=true`이면 `changedIds`를 사용하지 않고 해당 Query를 invalidate한다. version은 이벤트에 없다.

## 성능 측정 위치

BE-07, BE-08은 계약 일치, 올바른 Query·index 사용, 통합 테스트만 검증한다. 대표 데이터 seed와 서버 p95는 BE-09, 브라우저 지표와 종합 보고는 FE-11이 담당한다.

## 등록 시 참고

- 티켓 파일은 `.github/ISSUE_TEMPLATE/feature.md`(결정 티켓은 `architecture.md`)의 항목을 모두 포함한다.
- Issue 번호는 등록 후 각 파일의 `depends_on`, `epic`에 반영한다.
- 상태 '착수 가능'은 선행 티켓이 끝나면 시작할 수 있다는 뜻이다. '차단'은 미확정 결정이나 Deferred 때문에 이번 Epic에서 시작하지 않는다는 뜻이다.

## 등록된 Issue

| 티켓 | Issue | 선행 Issue |
|---|---|---|
|(Epic)| [#1](https://github.com/junans0boi/Mes_Platform/issues/1) | - |
| BE-01 | [#7](https://github.com/junans0boi/Mes_Platform/issues/7) | - |
| BE-02 | [#18](https://github.com/junans0boi/Mes_Platform/issues/18) | #7, #2 |
| BE-03 | [#22](https://github.com/junans0boi/Mes_Platform/issues/22) | #18, #2 |
| BE-04 | [#19](https://github.com/junans0boi/Mes_Platform/issues/19) | #18 |
| BE-05 | [#3](https://github.com/junans0boi/Mes_Platform/issues/3) | - |
| BE-06 | [#4](https://github.com/junans0boi/Mes_Platform/issues/4) | - |
| BE-07 | [#23](https://github.com/junans0boi/Mes_Platform/issues/23) | #2, #20, #18, #22 |
| BE-08 | [#24](https://github.com/junans0boi/Mes_Platform/issues/24) | #2, #21, #19, #22, #5 |
| BE-09 | [#26](https://github.com/junans0boi/Mes_Platform/issues/26) | #23, #24, #20, #21 |
| BE-10 | [#28](https://github.com/junans0boi/Mes_Platform/issues/28) | #4, #22, #19, #23, #6 |
| BE-11 | [#29](https://github.com/junans0boi/Mes_Platform/issues/29) | #3, #22, #6 |
| BE-12 | [#5](https://github.com/junans0boi/Mes_Platform/issues/5) | - |
| CON-01 | [#2](https://github.com/junans0boi/Mes_Platform/issues/2) | - |
| CON-02 | [#6](https://github.com/junans0boi/Mes_Platform/issues/6) | #3, #4 |
| DB-01 | [#20](https://github.com/junans0boi/Mes_Platform/issues/20) | #7, #2 |
| DB-02 | [#21](https://github.com/junans0boi/Mes_Platform/issues/21) | #20, #5 |
| FE-01 | [#8](https://github.com/junans0boi/Mes_Platform/issues/8) | - |
| FE-02 | [#9](https://github.com/junans0boi/Mes_Platform/issues/9) | #8, #2 |
| FE-03 | [#10](https://github.com/junans0boi/Mes_Platform/issues/10) | #8 |
| FE-04 | [#11](https://github.com/junans0boi/Mes_Platform/issues/11) | #9, #10 |
| FE-05 | [#12](https://github.com/junans0boi/Mes_Platform/issues/12) | #9, #10 |
| FE-06 | [#13](https://github.com/junans0boi/Mes_Platform/issues/13) | #11, #12, #2 |
| FE-07 | [#14](https://github.com/junans0boi/Mes_Platform/issues/14) | #13 |
| FE-08 | [#15](https://github.com/junans0boi/Mes_Platform/issues/15) | #11, #12, #2 |
| FE-09 | [#16](https://github.com/junans0boi/Mes_Platform/issues/16) | #15 |
| FE-10 | [#17](https://github.com/junans0boi/Mes_Platform/issues/17) | #16 |
| FE-11 | [#27](https://github.com/junans0boi/Mes_Platform/issues/27) | #14, #17, #26 |
| FE-12 | [#30](https://github.com/junans0boi/Mes_Platform/issues/30) | #14, #28, #6 |
| FE-13 | [#31](https://github.com/junans0boi/Mes_Platform/issues/31) | #11, #29, #6 |
| FE-14 | [#25](https://github.com/junans0boi/Mes_Platform/issues/25) | #2, #18, #23, #24 |

등록 순서: Epic → CON/Decision → Foundation → Database/Integration → Performance → Deferred. 티켓 제목은 Issue에서 `[ID] 한국어 제목` 형식이며, Epic(#1) 제목은 `[Epic] MES Platform 기반 및 첫 수직 슬라이스 (Frontend + Backend + Database)`이다. frontmatter의 `depends_on`은 티켓 ID, `depends_on_issues`는 Issue 번호다.
