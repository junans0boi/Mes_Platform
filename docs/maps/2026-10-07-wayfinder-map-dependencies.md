# Wayfinder-map: implementation dependency map

작성일: 2026-10-07 (개정 2)
선행 문서: `docs/maps/2026-10-07-wayfinder-repository-map.md`

어떤 seam을 어떤 순서로 도입하고, seam 사이의 계약과 검증 지점이 무엇인지 정한다. 티켓 ID는 `docs/tickets/2026-10-07-first-slices/`의 파일 이름과 같다. 의존성은 티켓 파일의 `depends_on`에서 생성했고 순환이 없음을 확인했다.

## 1. 원칙

1. **계약이 먼저다.** `contracts/openapi.yaml`과 `contracts/realtime-events.md`(CON-01)가 API·이벤트의 단일 원본이다. 백엔드·프론트·DB는 이를 소비하며, 계약과 다른 API를 독립적으로 만들지 않는다. 계약 변경은 CON 티켓 PR이 구현보다 먼저다.
2. **영역 소유권.** DDL은 DB 티켓, 서버 구현은 BE 티켓, 화면은 FE 티켓이 소유한다.
3. **성능 측정은 한 곳.** 서버 p95는 BE-09, 브라우저 지표와 종합은 FE-11. BE-07·BE-08은 계약·index 사용·통합 테스트만 검증한다.
4. **WorkOrder 상태값·전이는 BE-06 확정 전까지 계약·DB·API·UI에 하드코딩하지 않는다.**

## 2. Seam과 계약

| Seam | 소유 | 소비자 | 계약 | 검증 지점 |
|---|---|---|---|---|
| S1 프론트 toolchain | FE-01 | 전체 FE | npm scripts | CI 통과 |
| S2 공유 API 계약 | CON-01 | FE-02, FE-06, FE-08, BE-02, BE-03, BE-07, BE-08, DB-01, FE-14 | `contracts/openapi.yaml` (envelope, Problem Details, cursor, login·session, WorkOrder 읽기, process-unit-status) | YAML·OpenAPI 유효성, FE·BE 리뷰 |
| S3 실시간 이벤트 계약 | CON-01 | FE-09, BE-08 | `contracts/realtime-events.md`: `ProjectionChangedEvent{projection, plantId, changedIds, reset?, asOf}`, `reset=true`이면 `changedIds` 미사용·Query invalidate, version 미포함 | 프론트·백엔드·계약 문서 필드 대조, FE-09 단위 테스트, BE-08 Hub 테스트 |
| S4 typed client·ApiError | FE-02 | 모든 feature adapter | 계약에서 생성한 타입, `ApiError` | 단위 테스트 |
| S5 AppShell·route registry | FE-03 | 모든 모듈 | `RouteMetadata` | lazy chunk 분리 |
| S6 인증·capability·Plant | FE-04 (FE), BE-03 (BE) | 모든 모듈 | session(capabilities, allowedPlantIds), 명시적 `plantId` | 401·403 E2E, API 테스트 |
| S7 ServerDataGrid·URL state | FE-05 | FE-06, FE-08 | cursor adapter, typed serializer | 단위 + E2E |
| S8 WorkOrder 읽기 | FE-06·07 / DB-01 + BE-07 | 화면 | CON-01 WorkOrder 경로 | mock E2E, FE-14, 통합 테스트 |
| S9 ProcessUnitStatus 읽기·Projection | FE-08 / DB-02 + BE-04 + BE-08 (+ BE-12) | FE-09 | CON-01 process-unit-status, `projectionVersion` | mock E2E, 통합 테스트 |
| S10 Realtime coordinator | FE-09, FE-10 | FE-08 화면 | S3 | version 병합 단위 테스트, 이벤트·fallback E2E |
| S11 Projection·이벤트 서버 | BE-08 (+ BE-04 Worker host, DB-02, BE-12 결정) | S9, S10 | Worker → Outbox → Server Dispatcher → SignalR Hub. Worker는 Projection Upsert·`ProjectionVersion`·Outbox를 같은 transaction에 기록(`IProcessUnitStatusCalculator` → `IProjectionOutboxWriter`), Server의 `ProjectionOutboxDispatcher`가 claim(lease)해 `IProjectionChangeNotifier`(SignalR)로 발행. at-least-once. 이 Epic은 검증용 calculator까지이며 `ProcessResult` 기반 실제 계산은 후속 | 통합 테스트(Queue 직접 삽입 → Worker `RunOnceAsync` → Dispatcher `RunOnceAsync`, rollback·중복·lease·retry) |
| S12 데이터베이스 | DB-01, DB-02 | BE-07, BE-08, BE-09 | `database/MesPlatform.Database` DDL. `dbo.Plant.PlantId int`, Projection·Queue·Outbox의 `PlantId int NOT NULL` + FK, Plant 선행 index, `dbo.ProjectionChangeOutbox` | 로컬 DB 적용·재적용 테스트 |
| S14 변경 알림 전달 결정 | BE-12 | DB-02, BE-08 | Transactional Outbox, at-least-once, lease·retry·보관 정책 | 결정 문서와 DB-02·BE-08 대조 |
| S13 (Deferred) 상태 변경·인증 refresh | CON-02 → BE-10 / BE-11 → FE-12 / FE-13 | | BE-05·BE-06 결정 문서 | 결정 문서와 계약 대조 |

## 3. 의존 순서

```text
[결정]  BE-05 ─┐        BE-06 ─┐        BE-12 ─→ DB-02 (필수), BE-08 (필수)
              │              │
[계약]  CON-01 ─────────────────────────────────────────────────┐
            ├─ FE-01 → FE-02 ─┬─ FE-04 ─┬─ FE-06 → FE-07 ───┐  │
            │         FE-03 ──┴─ FE-05 ─┴─ FE-08 → FE-09 → FE-10│
            ├─ BE-01 → DB-01 ─────────────┐                  │  │
            │    └→ BE-02 → BE-03 ─┐      │                  │  │
            │              └→ BE-04┤      │                  │  │
            │                      ├─ BE-07 (DB-01, BE-03)   │  │
DB-01 + BE-12 → DB-02 ───────────────┴─ BE-08 (DB-02, BE-04, BE-03, BE-12)
BE-07, BE-08, DB-01, DB-02 → BE-09 → FE-11 (FE-07, FE-10 도 선행)
CON-01, BE-02, BE-07, BE-08 → FE-14

Deferred: BE-05 + BE-06 → CON-02 → BE-10 (+BE-03, BE-04, BE-07) → FE-12 (+FE-07)
                          BE-05 → CON-02 → BE-11 (+BE-03) → FE-13 (+FE-04)
```

위 그림은 요약이고, 정확한 선행은 아래 표(티켓 파일에서 생성)를 따른다.

| 티켓 | Gate | 선행 | 단계 |
|---|---|---|---:|
| BE-01 | foundation | - | 0 |
| BE-05 | decision | - | 0 |
| BE-06 | decision | - | 0 |
| BE-12 | decision | - | 0 |
| CON-01 | foundation | - | 0 |
| FE-01 | foundation | - | 0 |
| BE-02 | foundation | BE-01, CON-01 | 1 |
| CON-02 | deferred | BE-05, BE-06 | 1 |
| DB-01 | integration | BE-01, CON-01 | 1 |
| FE-02 | foundation | FE-01, CON-01 | 1 |
| FE-03 | foundation | FE-01 | 1 |
| BE-03 | integration | BE-02, CON-01 | 2 |
| BE-04 | foundation | BE-02 | 2 |
| DB-02 | integration | DB-01, BE-12 | 2 |
| FE-04 | foundation | FE-02, FE-03 | 2 |
| FE-05 | foundation | FE-02, FE-03 | 2 |
| BE-07 | integration | CON-01, DB-01, BE-02, BE-03 | 3 |
| BE-08 | integration | CON-01, DB-02, BE-04, BE-03, BE-12 | 3 |
| BE-11 | deferred | BE-05, BE-03, CON-02 | 3 |
| FE-06 | foundation | FE-04, FE-05, CON-01 | 3 |
| FE-08 | foundation | FE-04, FE-05, CON-01 | 3 |
| BE-09 | performance | BE-07, BE-08, DB-01, DB-02 | 4 |
| BE-10 | deferred | BE-06, BE-03, BE-04, BE-07, CON-02 | 4 |
| FE-07 | foundation | FE-06 | 4 |
| FE-09 | foundation | FE-08 | 4 |
| FE-13 | deferred | FE-04, BE-11, CON-02 | 4 |
| FE-14 | integration | CON-01, BE-02, BE-07, BE-08 | 4 |
| FE-10 | foundation | FE-09 | 5 |
| FE-12 | deferred | FE-07, BE-10, CON-02 | 5 |
| FE-11 | performance | FE-07, FE-10, BE-09 | 6 |

병렬 가능한 묶음(같은 단계끼리 동시 진행 가능):

- 단계 0: BE-01, BE-05, BE-06, BE-12, CON-01, FE-01
- 단계 1: BE-02, CON-02, DB-01, FE-02, FE-03
- 단계 2: BE-03, BE-04, DB-02, FE-04, FE-05
- 단계 3: BE-07, BE-08, BE-11, FE-06, FE-08
- 단계 4: BE-09, BE-10, FE-07, FE-09, FE-13, FE-14
- 단계 5: FE-10, FE-12
- 단계 6: FE-11

## 4. 순환 의존 점검

- 생성된 의존 그래프를 위상 정렬했고 순환이 없다. 최대 단계는 6이다.
- 계약 → (프론트, 백엔드, DB) 방향만 있고 반대 방향은 없다. 백엔드가 계약을 바꾸고 싶으면 CON 티켓 변경을 먼저 거친다.
- BE-07·BE-08은 FE 티켓에 선행하지 않는다. 프론트는 계약 기반 mock으로 먼저 완료한다.
- BE-08은 BE-04(Worker host) 위에서 구현한다. BE-04가 먼저 끝나야 한다.
- BE-12(결정) → DB-02(Outbox 스키마) → BE-08(Writer·Dispatcher) 순서다. BE-12는 단계 0이며 비게이팅이지만 DB-02·BE-08의 필수 선행이다.
- FE-12·FE-13은 구현 티켓(BE-10·BE-11)과 계약(CON-02) 뒤에 있다. 결정 티켓만으로는 시작하지 않는다.

## 5. Gate별 검증 지점

| Gate | 티켓 | 완료를 증명하는 것 |
|---|---|---|
| Foundation / mock | CON-01, FE-01~10, BE-01·02·04 | 계약 유효, typecheck·lint·test·build 통과, Shell lazy chunk, 401/403/네트워크 오류 공통 상태, cursor·정렬 reset·URL 복원 E2E, id 일괄 재조회·version 병합 단위 테스트, 이벤트·fallback E2E, 서버 빌드·아키텍처 테스트 |
| Read-only integration | DB-01·02, BE-03·07·08, FE-14 (BE-12 결정 필수) | DDL 적용, API가 계약과 일치, 올바른 index 사용, Hub 이벤트가 계약과 일치, Outbox 전달 테스트(같은 transaction rollback, 중복·lease·retry) 통과, 계약 테스트 통과 |
| Performance | BE-09, FE-11 | 서버 p95와 브라우저 반영시간을 분리 기록, 목표 대비 결과·조정 제안 |
| Deferred | CON-02, BE-10·11, FE-12·13 | 결정 문서 링크, 계약 일치, 전이표 기반 테스트 |

## 6. 범위 밖

대용량 export job, 스캔 화면 상태 보존, 서버 grid preference, WorkOrder 등록·수정·삭제, 1-2 이외 화면, 100만 건 ProcessResult·EquipmentLog benchmark.
