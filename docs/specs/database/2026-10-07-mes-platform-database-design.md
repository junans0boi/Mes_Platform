# 다음 MES 플랫폼 DB 설계안

> 상태: Mes_Platform 내부 기준 문서. Kdit `docs/specs/2026-10-07-mes-platform-database-design.md`를 복사·정리했으며 Kdit 원본은 수정하지 않는다.
> 2026-10-07 추가: `ProcessUnitStatusCurrent.ProcessUnitStatusId`, `ProjectionVersion`(전용 bigint, sequence 기반).

작성일: 2026-10-07  
기준 프로젝트: Kdit MES  
상태: 설계 검토용

## 1. 목적

현재 Kdit MES의 실제 테이블, 프로시저, 백그라운드 처리, 실시간 조회 구조를 기반으로 다음 사업에서 재사용할 SQL Server 기준 DB를 설계한다.

이 설계의 핵심은 기능을 무조건 일반화하는 것이 아니다. 현재 프로젝트에서 이미 검증된 업무 흐름은 보존하고, 다음 문제를 새 구조에서 반복하지 않는 것이다.

- C# Entity와 SQL 테이블·컬럼 이름이 서로 다름
- 테이블 간 실제 관계는 존재하지만 FK와 문서가 불완전함
- `Model_Process_Result`가 원본 실적, 측정값, 판정, 이미지, JSON을 동시에 보유함
- `Production_Result`가 개별 결과가 아닌 집계 결과인데 이름만으로 구분하기 어려움
- `Inventory_Transaction`이 `ReferenceType` + `ReferenceId`에 과도하게 의존함
- 설비 실적 입력 프로시저가 생산·재고·불량·상태 변경까지 모두 수행함
- 1-2, 4-6, 4-7, 7-3이 같은 TVF 계산을 반복함
- 현재 Projection은 빠르지만 임시 기능처럼 추가되어 원본과 계산 결과의 역할이 불명확함
- Audit Log와 요청 실행 이력이 하나의 업무 처리 단위로 연결되지 않음

## 2. 범위와 전제

### 2.1 대상

- SQL Server
- Windows Server
- ASP.NET Core 백엔드
- React TypeScript 프론트엔드 1개 애플리케이션
- 설비 Agent와 설비 로그 수집
- 생산·재고·품질·출하·실시간 모니터링
- 100만 건 이상 성장하는 실적·설비·수불 데이터

### 2.2 DB 전제

- 신규 사업용 기준 DB를 새로 만든다.
- 기존 운영 DB와 신규 DB의 데이터 호환을 1차 목표로 삼지 않는다.
- 따라서 신규 DB에서는 이름과 관계를 자유롭게 정리할 수 있다.
- 기존 데이터 이관이 필요해지는 경우에만 별도 Import/Compatibility 단계에서 기존 이름을 매핑한다.

### 2.3 이름 규칙

모든 테이블은 `dbo` Schema를 사용한다.

```text
dbo.WorkOrder
dbo.WorkOrderProcess
dbo.ProcessResult
dbo.InventoryTransaction
```

컬럼은 PascalCase로 통일한다.

```text
WorkOrderId
ProductionLotId
CreatedAt
CreatedBy
StatusCode
```

테이블은 단수형을 사용하며, C# Entity와 DB 테이블의 핵심 이름을 일치시킨다.

```text
C#:    WorkOrder.WorkOrderId
DB:    dbo.WorkOrder.WorkOrderId
```

## 3. 현재 프로젝트에서 확인된 근거

### 3.1 `usp_ModelProcessResultRequest`

현재 `usp_ModelProcessResultRequest`는 설비 결과를 하나의 트랜잭션으로 처리하기 위해 만들어졌다. 실제로 다음 기능을 한 번에 수행한다.

1. 작업지시·설비·공정·LOT 확인
2. Housing QR과 제품 모델 검증
3. `Model_Process_Result` 저장
4. `Production_Result` 수량 Upsert
5. `Equipment_Parameter` 파싱 저장
6. 공정 불량 저장
7. 공정 불량 WIP 재고 처리
8. TH-020, TH-070, TH-170 자재 차감
9. TH-400 완제품 입고
10. `Stock_History` 등록
11. 작업지시·LOT 상태 변경
12. 자재 투입 누락 생성

트랜잭션으로 묶은 판단은 타당하지만, 프로시저가 공정 코드·창고·자재 검색·재고 정책까지 알게 되면서 다음 문제가 생겼다.

- 공정 코드별 `IF` 분기가 계속 증가함
- 창고 번호와 자재명 검색이 업무 규칙으로 하드코딩됨
- 개별 설비 결과와 생산 집계가 같은 호출 안에서 암묵적으로 연결됨
- 재고 거래의 원인이 `ReferenceType` 문자열로만 남는 경우가 있음
- 수정·재처리 시 어떤 원본 결과에서 파생됐는지 추적하기 어려움

### 3.2 실시간 TVF와 Projection

현재 실시간 상태 TVF는 집합 쿼리이지만 매 조회마다 다음 계산을 다시 수행한다.

- `Model_Process_Result` 대량 범위 조회
- QR·공정별 최신 행 선별을 위한 `ROW_NUMBER`
- `ResultData`의 `JSON_VALUE` 반복 파싱
- 공정별 Pivot과 최종 상태 계산
- 설비 원본 로그 보완 조회
- 검사 기준 비교
- 스크랩 수불 조인

현재 성능 실험의 기준은 다음과 같다.

```text
원본 TVF 상태 조회: 약 43,986ms
Current Projection 조회: 약 85ms
```

따라서 Projection은 임시 최적화가 아니라 신규 DB의 정식 읽기 모델로 설계한다. 단, Projection은 원본이 아니며 일반 수정·삭제 대상이 아니다.

### 3.3 재고 추적

현재 `Inventory`는 현재 잔량을 보유하고 `Inventory_Transaction`이 변동을 보유한다. 그러나 OQC·진공포장·창고이동에서 OUT/IN을 하나의 작업으로 묶는 식별자가 약해, 한쪽 거래만 남거나 재고가 증가하는 문제가 발생했다.

또한 `Material_Input`은 불출 항목과 직접 연결되지 않고 자재·LOT 기준으로 합산되는 경로가 있어, 동일 자재·LOT가 여러 불출 건에 사용될 때 정확한 반납 가능 수량을 계산하기 어렵다.

### 3.4 DB 기준선과 코드의 불일치

현재 `FK_Keys.sql`에는 FK 설계 의도가 남아 있지만 대부분 주석 처리되어 있고, 현재 DDL의 `Work_Order_id` 방식과 다른 `WorkOrderId` 명칭을 사용한다. 따라서 이 파일을 그대로 기준으로 삼지 않고, 새 DB에서 FK를 실제 DDL의 일부로 관리한다.

## 4. 목표 DB 구조

새 DB는 다음 네 종류의 데이터를 명시적으로 구분한다.

```text
원본 사실(Fact)
현재 상태(Current State)
업무 집계(Summary)
화면 읽기 모델(Projection)
```

### 4.1 시스템·기준정보

```text
dbo.User
dbo.Role
dbo.UserRole
dbo.Menu
dbo.Permission
dbo.RolePermission
dbo.MenuPermission
dbo.CommonCodeGroup
dbo.CommonCode
dbo.LanguageResource
dbo.AuditLog
dbo.LoginHistory
dbo.UserPreference
dbo.SystemConfig

dbo.Company
dbo.Plant
dbo.Department
dbo.Line
dbo.Warehouse
dbo.Location
dbo.Customer
dbo.Supplier
dbo.MaterialGroup
dbo.Material
dbo.ProductGroup
dbo.ProductModel
dbo.Process
dbo.ModelProcess
dbo.ModelProcessItem
dbo.EquipmentGroup
dbo.Equipment
```

`dbo.Plant.PlantId`는 `int NOT NULL` PRIMARY KEY이다. Plant 범위를 갖는 모든 테이블의 `PlantId`는 이 타입과 동일하게 `int NOT NULL`로 두고 `dbo.Plant`에 FK를 건다. API와 SignalR의 `plantId`(number)도 이 값이다.

### 4.2 생산 계획·작업지시

```text
dbo.Forecast
dbo.ProductionPlan
dbo.ProductionOrder
dbo.WorkOrder
dbo.WorkOrderProcess
dbo.ProductionLot
dbo.WorkOrderStatusHistory
dbo.WorkOrderProcessStatusHistory
```

핵심 관계:

```text
ProductionPlan
  └── ProductionOrder
        └── WorkOrder
              ├── WorkOrderProcess
              └── ProductionLot
```

`WorkOrder.RowVersion`은 SQL Server `rowversion NOT NULL`이다. WorkOrder의 낙관적 동시성에만 사용하며 Projection의 `ProjectionVersion`(별도 bigint sequence)과 무관하다.

**WorkOrder 목록 index 대응표(DB-01이 구현한다):** API 허용 sort·필터(`contracts/openapi.yaml`)마다 index가 하나 이상 대응한다. 모든 index는 `PlantId`를 선행 컬럼으로 하고 고유 키 `WorkOrderId`가 같은 방향의 마지막 키다.

| API sort 또는 필터 | index |
|---|---|
| `sort=plannedStartAt` (기본 `-plannedStartAt`), `plannedFrom`·`plannedTo` 범위 | `(PlantId, PlannedStartAt DESC, WorkOrderId DESC)` |
| `sort=workOrderNumber`, `workOrderNumberPrefix` 접두 일치 | `UNIQUE (PlantId, WorkOrderNumber)` (clustered key `WorkOrderId`가 끝에 암묵 포함) |
| `sort=status` | `(PlantId, Status, WorkOrderId)` |
| `status` 필터 + 기본 정렬 | `(PlantId, Status, PlannedStartAt DESC, WorkOrderId DESC)` |
| `sort=priority` | `(PlantId, Priority, WorkOrderId)` |
| `lineId` 필터 | `(PlantId, LineId, PlannedStartAt DESC, WorkOrderId DESC)` |
| `productModelId` 필터 | `(PlantId, ProductModelId, PlannedStartAt DESC, WorkOrderId DESC)` |

접두 일치는 `LIKE @prefix + '%'`만 허용하며 부분 일치(`%q%`)는 만들지 않는다. 대응표에 없는 조합(예: `status` 필터 + `priority` 정렬)은 `PlantId` 범위 안에서 필터링하며, WorkOrder는 100만 건 benchmark 대상이 아니므로 허용한다. NULL은 가장 작은 값으로 취급한다(`PlannedStartAt`, `Priority`).

`WorkOrder`에는 전체 공정 결과를 넣지 않는다. 작업지시의 계획·상태·수량만 보유한다.

`WorkOrderProcess`에는 작업지시 안의 공정별 계획·상태·집계값을 보유한다.

### 4.3 설비 원본과 공정 실적

```text
dbo.EquipmentLogRaw
dbo.EquipmentLogRawProcessing

dbo.ProcessResult
dbo.ProcessResultMeasurement
dbo.ProcessResultDefect
dbo.ProcessResultAttachment
dbo.ProductionResultSummary
```

`ProcessResult`는 설비 또는 수동 입력으로 발생한 개별 공정 결과다.

```text
ProcessResult
├── ProcessResultId
├── EquipmentLogRawId
├── WorkOrderId
├── WorkOrderProcessId
├── ProductionLotId
├── ModelProcessId
├── EquipmentId
├── HousingQr
├── ProcessDateTime
├── EquipmentProcessDateTime
├── OverallResult
├── FrozenResult
├── ResultData
├── IdempotencyKey
├── CreatedAt
└── CreatedBy
```

현재 `Model_Process_Result`에 있는 고빈도 측정값은 `ProcessResult`에 일부 직접 보유할 수 있다. 공정별로 달라지는 측정값은 `ProcessResultMeasurement`에 저장한다.

```text
ProcessResultMeasurement
├── ProcessResultMeasurementId
├── ProcessResultId
├── ModelProcessItemId
├── ValueText
├── ValueNumeric
├── IsWithinSpec
└── CreatedAt
```

`ResultData`는 원본 보존과 재처리를 위해 유지한다. 일반 조회에서 JSON을 다시 파싱하지 않는다.

`ProductionResultSummary`는 현재 `Production_Result`에 해당하지만, 개별 실적이 아니라 작업지시·공정·LOT별 누적 결과라는 의미를 명확히 한다.

```text
ProductionResultSummary
├── ProductionResultSummaryId
├── WorkOrderId
├── WorkOrderProcessId
├── ProductionLotId
├── InputQty
├── OutputQty
├── GoodQty
├── DefectQty
├── ActualStartAt
├── ActualEndAt
└── LastResultAt
```

### 4.4 자재 불출·투입

```text
dbo.MaterialRelease
dbo.MaterialReleaseItem
dbo.MaterialInput
dbo.MaterialInputMissing
dbo.MaterialReturn
dbo.MaterialReturnItem
```

`MaterialInput`은 다음을 직접 참조한다.

```text
MaterialInput
├── WorkOrderId
├── WorkOrderProcessId
├── ProductionLotId
├── ProcessResultId
├── MaterialReleaseItemId
├── MaterialId
├── MaterialLotNumber
└── InputQty
```

이 관계를 통해 불출·투입·반납의 수량을 자재·LOT 단위가 아니라 불출 항목 단위로 계산할 수 있다.

### 4.5 재고

```text
dbo.InventoryBalance
dbo.InventoryOperation
dbo.InventoryTransaction
dbo.InventoryReservation
dbo.InventoryMonthClosing
```

`InventoryBalance`는 빠른 현재 잔량 조회용이다.

`InventoryTransaction`은 수불 이력이며 삭제하지 않는다.

`InventoryOperation`은 하나의 업무 처리로 발생한 여러 수불을 묶는다.

```text
InventoryOperation
├── InventoryOperationId
├── OperationTypeCode
├── SourceWarehouseId
├── TargetWarehouseId
├── ReferenceTypeCode
├── ReferenceId
├── StatusCode
├── CreatedAt
└── CreatedBy
```

```text
InventoryTransaction
├── InventoryTransactionId
├── InventoryOperationId
├── InventoryBalanceId
├── TransactionTypeCode
├── Quantity
├── QuantityBefore
├── QuantityAfter
├── MaterialReleaseItemId
├── MaterialInputId
├── ProcessResultId
├── ProductionResultSummaryId
├── SourceTransactionId
├── TransactionAt
└── TransactionBy
```

예를 들어 OQC 불량 이동은 하나의 `InventoryOperation` 아래에 제조창고 OUT과 불량창고 IN을 함께 기록한다.

### 4.6 품질·출하

```text
dbo.Inspection
dbo.InspectionItem
dbo.InspectionResult
dbo.InspectionDefect
dbo.DefectGroup
dbo.DefectCode
dbo.PqcInspection
dbo.OqcInspection
dbo.OqcInspectionItem
dbo.Ncr
dbo.CustomerComplaint

dbo.BoxPack
dbo.BoxPackItem
dbo.ShippingOrder
dbo.ShippingOrderItem
dbo.Shipping
dbo.ShippingItem
dbo.DeliveryNote
dbo.ReturnOrder
dbo.ReturnOrderItem
```

검사와 출하는 `ProductionLotId`, `ProcessResultId`, `InventoryOperationId` 중 실제 업무에 해당하는 관계를 직접 보유한다. 화면용 TVF 결과를 검사·출하의 원본 키로 사용하지 않는다.

### 4.7 설비 상태·통계

```text
dbo.EquipmentStatusEvent
dbo.EquipmentDailyAvailability
dbo.EquipmentFailure
```

현재 `usp_CollectEquipmentAvailability`의 방향을 유지한다. 원본 상태 이벤트가 보존 기간 때문에 삭제되더라도 일별 가동률과 고장 이력은 남아야 한다.

### 4.8 공정 현재 상태 Projection

```text
dbo.ProcessUnitStatusCurrent
dbo.ProcessStatusRefreshQueue
dbo.ProjectionChangeOutbox
```

`ProcessUnitStatusCurrent`의 기준 행은 다음이다.

```text
ProductionLotId + HousingQr
```

이 테이블은 1-2만을 위한 테이블이 아니다. 1-2, 4-6, 4-7, 7-3이 공유하는 공통 읽기 모델이다.

```text
ProcessUnitStatusCurrent
├── ProcessUnitStatusId
├── PlantId
├── ProductionLotId
├── HousingQr
├── ProductModelId
├── LastProcessResultId
├── LastProcessCode
├── LastProcessAt
├── FinalResult
├── IsInProgress
├── IsScrapped
├── ProcessSkip
├── ScrapCount
├── FrozenResultSummary
├── MeasurementSummary
├── ProjectionVersion
└── LastUpdatedAt
```

`ProcessUnitStatusId`는 API와 SignalR 이벤트가 사용하는 행 식별자(bigint, identity)이며 `(ProductionLotId, HousingQr)` UNIQUE와 별개로 둔다.

`PlantId`는 확정이다.

- `PlantId int NOT NULL`, `dbo.Plant.PlantId`와 동일한 타입, `dbo.Plant`에 FK
- 모든 조회가 Plant 범위 안에서만 실행되므로(API는 `plantId`가 필수) 조회용 index는 `PlantId`를 선행 컬럼으로 한다
- 이벤트의 `plantId`는 이 컬럼 값이다
- `ProductionLotId`, `ProductModelId`, `LastProcessResultId`는 원본 테이블이 생기기 전까지 FK 없는 bigint 컬럼으로 둔다. FK는 원본 테이블을 만드는 티켓에서 추가한다.

`ProcessUnitStatusCurrent` 컬럼의 NULL 허용과 기본값(API 계약 `contracts/openapi.yaml`의 `ProcessUnitStatusRow`와 일치한다):

| 컬럼 | 타입 | NULL | 기본값·비고 |
|---|---|---|---|
| `ProcessUnitStatusId` | bigint identity PK | NOT NULL | 1부터 증가 |
| `PlantId` | int | NOT NULL | `dbo.Plant` FK |
| `ProductionLotId` | bigint | NOT NULL | 원본 테이블 생기기 전까지 FK 없음 |
| `HousingQr` | 문자열 | NOT NULL | `(ProductionLotId, HousingQr)` UNIQUE |
| `ProductModelId` | bigint | NULL | 모델이 정해지지 않은 단위 |
| `LastProcessResultId` | bigint | NULL | 아직 공정 실적이 없으면 NULL |
| `LastProcessCode` | 문자열 | NULL | 아직 공정 실적이 없으면 NULL |
| `LastProcessAt` | datetime2(3), UTC | NULL | 아직 공정 실적이 없으면 NULL |
| `FinalResult` | 문자열 | NULL | NULL = 최종 결과 미확정 |
| `IsInProgress` | bit | NOT NULL | 기본 0 |
| `IsScrapped` | bit | NOT NULL | 기본 0 |
| `ProcessSkip` | bit | NOT NULL | 기본 0 |
| `ScrapCount` | int | NOT NULL | 기본 0, 0 이상 |
| `ProjectionVersion` | bigint | NOT NULL | `dbo.ProjectionVersionSeq` 값 |
| `LastUpdatedAt` | datetime2(3), UTC | NOT NULL | |

`FrozenResultSummary`, `MeasurementSummary`는 목록 API 응답에 포함하지 않는다(상세는 후속).

`ProjectionVersion`은 Projection 전용 bigint이다. SQL Server `rowversion`을 쓰지 않는다. 전용 sequence(`dbo.ProjectionVersionSeq`)에서 값을 받아 Upsert 때마다 해당 행에 기록한다. Projection row Upsert와 `ProjectionVersion` 기록은 같은 transaction에서 처리한다. 같은 행의 값은 단조 증가하며, 클라이언트는 이 값으로 응답의 최신 여부를 비교한다. 이벤트에는 version을 싣지 않는다.

**API 전송 형식:** `ProjectionVersion`은 DB에서 `bigint`를 유지하고 API에는 JSON 정수(number)로 보낸다. 브라우저 `number`가 정확한 안전 정수 범위는 9007199254740991(2^53-1)이므로 sequence에 같은 상한을 둔다.

```sql
CREATE SEQUENCE dbo.ProjectionVersionSeq AS bigint
  START WITH 1 INCREMENT BY 1
  MINVALUE 1 MAXVALUE 9007199254740991 NO CYCLE;
```

상한에 도달하면 sequence가 오류를 내므로 정밀도가 깨진 값이 클라이언트에 전달되지 않는다. 하루 1억 건씩 올려도 수십만 년이 걸리는 값이라 현실적으로 도달하지 않지만, 조용한 오류 대신 명시적 실패가 되도록 DDL에 둔다.

Projection은 화면 조회 전용이다. 수정·삭제는 원본 테이블에서 수행하고, 변경된 LOT·QR만 Queue에 등록한다.

### 4.9 Projection 변경 Outbox

```text
dbo.ProjectionChangeOutbox
├── ProjectionChangeOutboxId   bigint identity PK
├── PlantId                    int NOT NULL, FK dbo.Plant
├── Projection                 varchar(50) NOT NULL    -- 예: processUnitStatus
├── IsReset                    bit NOT NULL
├── ChangedIdsJson             nvarchar(max) NULL      -- IsReset=1이면 NULL, 아니면 ProcessUnitStatusId JSON 배열
├── AsOf                       datetime2(3) NOT NULL   -- UTC
├── Status                     varchar(20) NOT NULL    -- Pending / Published / Failed
├── AttemptCount               int NOT NULL
├── NextAttemptAt              datetime2(3) NOT NULL
├── LeaseOwner                 nvarchar(100) NULL
├── LeaseExpiresAt             datetime2(3) NULL
├── OperationId                uniqueidentifier NULL   -- Worker 작업의 OperationId (추적용)
├── EnqueuedAt                 datetime2(3) NOT NULL
├── PublishedAt                datetime2(3) NULL
└── LastError                  nvarchar(1000) NULL
```

- 한 행은 Worker의 한 Projection transaction이 만든 변경을 나타낸다.
- 행은 `ProcessUnitStatusCurrent` Upsert, `ProjectionVersion` 기록과 같은 transaction에서 Insert한다.
- Server의 Dispatcher가 `Pending` 행을 claim(`LeaseOwner`, `LeaseExpiresAt`)해 발행하고 `PublishedAt`을 기록한다. 전달은 at-least-once다(backend design §13.4).
- `ChangedIdsJson`은 Dispatcher가 발행할 때만 파싱하며 일반 조회 경로에서는 읽지 않는다.
- `Status`는 발행 완료 전까지 `Pending`이고 claim은 `LeaseOwner`·`LeaseExpiresAt`이 나타낸다. `Pending`/`Published`/`Failed` 외의 값은 없다.
- 기본 index는 Dispatcher claim용 `(Status, NextAttemptAt, ProjectionChangeOutboxId)`이다. lease 기간, backoff, 최대 시도 횟수, 보관 기간은 backend design §13.4.1의 설정값이며 DDL에 하드코딩하지 않는다.

## 5. 페이지별 읽기·쓰기 원칙

### 1-2 실시간 공정 모니터링

```text
읽기: ProcessUnitStatusCurrent
상세: ProcessResult 및 ProcessResultMeasurement
쓰기: 원칙적으로 없음
```

### 4-6 일일 작업

```text
목록: WorkOrder + WorkOrderProcess + ProcessUnitStatusCurrent
상세: 원본 작업지시·LOT·공정
수정: WorkOrder, WorkOrderProcess
```

### 4-7 공정별 실적 등록

```text
목록: ProcessUnitStatusCurrent
저장: ProcessResult, ProductionResultSummary, MaterialInput, InventoryTransaction
```

### 7-3 OQC

```text
대상 조회: ProcessUnitStatusCurrent
검사 저장: OqcInspection, OqcInspectionItem
재고 이동: InventoryOperation, InventoryTransaction
```

어떤 페이지도 Projection 행을 직접 수정하거나 삭제하지 않는다.

## 6. TVF와 Projection의 역할

### TVF 유지 용도

- 신규 Projection 최초 적재
- 특정 LOT·QR 재계산
- 데이터 보정
- Projection과 원본 비교
- 장애 복구
- 개발·운영 검증

### 일반 화면에서 TVF를 사용하지 않는 이유

- 매번 원본 실적 전체 또는 대량 범위를 읽음
- 최신 공정 계산을 반복함
- JSON 파싱을 반복함
- 검사 기준과 스크랩을 반복 조인함
- 같은 계산을 네 개 화면이 공유하면서도 요청마다 다시 실행함

### 갱신 흐름

```text
ProcessResult INSERT/UPDATE/DELETE
        ↓
ProcessStatusRefreshQueue 등록
        ↓
Worker가 영향받은 LOT·QR 계산
        ↓
ProcessUnitStatusCurrent Upsert
```

일반적인 신규 실적은 QR 단위로 갱신한다. 재작업, 스크랩, 기준정보 변경처럼 영향 범위를 확정하기 어려운 작업은 LOT 단위 재계산을 허용한다.

## 7. 프로시저 재설계 원칙

### 7.1 `usp_ModelProcessResultRequest`

현재 하나의 프로시저는 다음 세 역할로 분리한다.

```text
ProcessResultIngest
  - 설비 실적 검증·저장
  - 측정값·불량 저장

ProductionResultUpdater
  - ProductionResultSummary 갱신
  - WorkOrderProcess 수량 갱신

ProcessMaterialAndInventoryHandler
  - 공정별 자재 투입
  - InventoryOperation 생성
  - InventoryTransaction 기록
```

최종 저장은 하나의 업무 트랜잭션으로 묶되, 공정 코드별 정책은 테이블 기준정보 또는 Application 정책으로 이동한다.

### 7.2 BOM 재고 프로시저

`usp_CheckBOMInventory`는 조회용으로 유지한다.

`usp_ProduceBOM_DeductInventory`는 다음을 보장하도록 재설계한다.

```text
BOM 전개
→ 필요량 계산
→ 재고 할당
→ InventoryOperation 생성
→ InventoryTransaction 기록
→ InventoryBalance 갱신
```

재고를 차감하고 거래 이력을 남기지 않는 경로는 허용하지 않는다.

### 7.3 번호 생성

현재 여러 번호 생성 프로시저는 `NumberSequence` 테이블 기반으로 통합한다.

```text
dbo.NumberSequence
├── SequenceTypeCode
├── SequenceDate
├── Prefix
├── CurrentValue
├── PaddingLength
└── RowVersion
```

### 7.4 조회 프로시저

프로시저는 다음 세 종류로 구분한다.

```text
Command Procedure       데이터 변경
Query Procedure         일반 조회
Projection Procedure   읽기 모델 생성·갱신
```

일반 조회 프로시저가 원본 대량 계산을 매번 수행하지 않도록 한다.

## 8. 인덱스·성능 기준

### 원본 실적

```text
ProcessResult(ProductionLotId, HousingQr, ProcessDateTime)
ProcessResult(WorkOrderId, ProcessDateTime)
ProcessResult(EquipmentId, ProcessDateTime)
ProcessResult(ProcessDateTime)
```

### 재고

```text
InventoryBalance(WarehouseId, MaterialId, LotNumber, Cavity)
InventoryTransaction(InventoryBalanceId, TransactionAt)
InventoryTransaction(InventoryOperationId)
```

### Projection

```text
ProcessUnitStatusCurrent(ProductionLotId, HousingQr) UNIQUE
ProcessUnitStatusCurrent(ProcessUnitStatusId) PK                       -- ids 일괄 재조회, WHERE PlantId = @PlantId 로 Plant 검증
ProcessUnitStatusCurrent(PlantId, LastUpdatedAt DESC, ProcessUnitStatusId DESC)
                                                                        -- sort=lastUpdatedAt (기본), Plant 범위 목록
ProcessUnitStatusCurrent(PlantId, LastProcessAt DESC, ProcessUnitStatusId DESC)
                                                                        -- sort=lastProcessAt
ProcessUnitStatusCurrent(PlantId, FinalResult, LastUpdatedAt DESC, ProcessUnitStatusId DESC)
                                                                        -- finalResult 필터 + 기본 정렬
ProcessUnitStatusCurrent(PlantId, FinalResult, ProcessUnitStatusId)
                                                                        -- sort=finalResult (tie-breaker는 주 정렬과 같은 방향, 역방향 스캔으로 내림차순)
ProcessStatusRefreshQueue(Status, EnqueuedAt)
ProcessStatusRefreshQueue(PlantId, Status, EnqueuedAt)
ProjectionChangeOutbox(Status, NextAttemptAt, ProjectionChangeOutboxId)   -- Dispatcher claim
ProjectionChangeOutbox(PlantId, ProjectionChangeOutboxId)
```

**API 허용 sort와 index 대응표(ProcessUnitStatusCurrent):** `lastUpdatedAt` → `(PlantId, LastUpdatedAt DESC, ProcessUnitStatusId DESC)`, `lastProcessAt` → `(PlantId, LastProcessAt DESC, ProcessUnitStatusId DESC)`, `finalResult` → `(PlantId, FinalResult, ProcessUnitStatusId)`. 필터 `finalResult` + 기본 정렬 → `(PlantId, FinalResult, LastUpdatedAt DESC, ProcessUnitStatusId DESC)`. 필터 `productionLotId`는 `(ProductionLotId, HousingQr)` UNIQUE로 찾은 뒤 `PlantId`를 검사한다(LOT은 한 Plant에 속한다). 오름차순은 같은 index의 역방향 스캔이다. NULL은 가장 작은 값으로 취급한다(SQL Server 기본).

모든 Projection 조회는 Plant 범위 안에서만 실행하므로 `PlantId` 없는 `(FinalResult, LastUpdatedAt)` index는 두지 않는다. cursor 정렬 키는 항상 고유 키 `ProcessUnitStatusId`를 마지막 tie-breaker로 포함한다.

100만 건 이상 테이블은 모든 컬럼을 반환하지 않고 화면별 DTO로 필요한 컬럼만 조회한다. JSON 파싱은 일반 조회 경로에서 수행하지 않는다.

## 9. 추적성 기준

현재 프로젝트의 `AuditLog`와 `LogHistory`는 유지하되, 거대한 범용 계보 시스템을 만들지 않는다.

핵심 업무 테이블에는 직접 관계를 둔다.

```text
ProcessResult.EquipmentLogRawId
ProcessResult.WorkOrderId
ProcessResult.ProductionLotId
MaterialInput.MaterialReleaseItemId
InventoryTransaction.InventoryOperationId
InventoryTransaction.ProcessResultId
OqcInspection.ProductionLotId
```

공통 실행 추적에는 최소한 다음을 사용한다.

```text
OperationId
RequestId
CommandName
CreatedBy
CreatedAt
```

이 정보로 한 번의 작업이 생성한 주요 데이터를 묶어 조회할 수 있게 한다.

## 10. 구축 순서

### Phase 1. 현재 DB 분석

프로시저별로 다음 표를 만든다.

```text
프로시저
생성 이유
호출 Controller/Service
읽는 테이블
쓰는 테이블
후속 영향 테이블
현재 개선 이력
현재 문제
새 DB 대체 구조
```

우선순위:

1. `usp_ModelProcessResultRequest`
2. `Inventory`·`Inventory_Transaction` 처리
3. 실시간 TVF·Projection
4. BOM 재고 프로시저
5. 번호 생성 프로시저
6. 반납 가능 수량 조회
7. RTY·불량·보고서 조회

### Phase 2. 목표 테이블 설계

각 테이블에 대해 다음을 확정한다.

- 목적
- 생성·수정 주체
- 부모·자식 관계
- PK/FK
- Unique Key
- 상태 전이
- 삭제 정책
- 인덱스
- 데이터 증가량
- Projection 여부

### Phase 3. 핵심 생산·재고 DDL

다음 테이블부터 구현한다.

```text
WorkOrder
WorkOrderProcess
ProductionLot
EquipmentLogRaw
ProcessResult
ProcessResultMeasurement
ProcessResultDefect
ProductionResultSummary
MaterialRelease
MaterialReleaseItem
MaterialInput
InventoryBalance
InventoryOperation
InventoryTransaction
```

### Phase 4. Projection 기준선

TVF를 기준 계산기로 사용하여 `ProcessUnitStatusCurrent`를 최초 적재한다. 이후 신규 실적·수불 변경 시 영향받은 LOT·QR만 갱신한다.

검증 기준:

```text
TVF 결과와 Projection 결과 양방향 EXCEPT = 0
Projection 누락 Queue = 0
재처리 후 결과 동일
트랜잭션 rollback 시 Queue도 rollback
```

### Phase 5. 페이지 전환

1-2, 4-6, 4-7, 7-3을 순서대로 Projection 조회로 전환한다. 수정·삭제는 원본 Command로 유지한다.

### Phase 6. 성능 검증

현재 데이터 규모 또는 그 이상을 기준으로 다음을 측정한다.

```text
실시간 공정 목록
작업지시별 LOT 상태
공정 실적 등록 직후 반영 시간
OQC 대상 조회
재고 수불 조회
Projection 재계산 시간
동시 설비 입력 처리량
```

일반 화면 조회 목표는 1~2초 이내, Projection 기반 현재 상태 조회는 1초 이내를 기본 목표로 한다. 장기 이력·엑셀은 별도 비동기 처리한다.

## 11. 설계 결론

새 DB는 현재 DB의 테이블을 단순히 PascalCase로 이름만 바꾸는 프로젝트가 아니다.

다음 네 가지를 명확히 나누는 프로젝트다.

```text
ProcessResult              개별 원본 실적
ProductionResultSummary    생산 집계
InventoryTransaction       재고 변동 이력
ProcessUnitStatusCurrent   빠른 현재 상태 조회
```

TVF의 검증된 판정 로직은 최초에는 보존한다. 그러나 일반 사용자 화면에서는 Projection을 조회하고, 저장·수정·삭제는 원본 테이블에서 처리한다.

이 구조를 기준으로 하면 현재 프로젝트에서 확인된 다음 문제가 동시에 개선된다.

- TVF 반복 계산으로 인한 느린 조회
- JSON 반복 파싱
- 수정·삭제 시 원본과 화면 결과의 혼동
- 재고 OUT/IN 추적 부족
- 실적과 집계 테이블의 의미 혼동
- 프로시저 안의 공정별 하드코딩
- 테이블 관계와 실제 생성 원인 추적 부족
