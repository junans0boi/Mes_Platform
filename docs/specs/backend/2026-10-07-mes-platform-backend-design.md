# 다음 MES 플랫폼 백엔드 설계안

작성일: 2026-10-07  
기준 프로젝트: Kdit MES (읽기 전용 참고)  
상태: 설계 검토용 — Mes_Platform 내부 기준 문서
원본: Kdit `docs/superpowers/specs/2026-10-07-mes-platform-backend-design.md`를 복사·정리했다. 이후 구현 기준은 이 문서이며, Kdit 원본은 수정하지 않는다.
2026-10-07 프론트엔드 설계 합의 반영(개정 2 포함: plantId 명시 전달, 인증 기본 방향, ProjectionVersion 확정, 미결 계약 §24): §9.3 응답 envelope, §9.4 Cursor, §13.3 실시간 이벤트, §17.1 오류 구조, §15.3 인증

## 1. 목적

현재 Kdit MES에서 확인된 백엔드 구조의 문제를 반복하지 않고, 다음 사업에서 재사용할 수 있는 C# 기반 MES 백엔드 기준을 정의한다.

목표는 프로젝트 수를 많이 만드는 것이 아니다. 각 모듈이 작고 명확한 인터페이스를 제공하면서도, 생산·재고·품질·추적성·실시간 조회의 복잡한 구현을 내부에 숨기는 깊은 모듈을 만드는 것이다.

이 설계는 다음 DB 설계를 기준으로 한다.

- docs/specs/database/2026-10-07-mes-platform-database-design.md
- SQL Server
- Windows Server
- ASP.NET Core
- React TypeScript 단일 프론트엔드
- 100만 건 이상 성장하는 생산·설비·재고 데이터
- ProcessUnitStatusCurrent Projection을 사용하는 실시간 조회

## 2. 설계 목표와 비목표

### 2.1 목표

- C# 도메인 이름과 SQL Server 테이블·컬럼 이름을 일치시킨다.
- Controller에 업무 규칙과 SQL을 넣지 않는다.
- 화면별로 제각각인 조회 방식을 Use Case 단위의 명시적 Query로 통일한다.
- 생산 결과·재고 이동·검사 결과를 하나의 Operation으로 추적한다.
- 대용량 조회에서 전체 Entity 로딩과 반복 JSON 파싱을 제거한다.
- API와 백그라운드 처리를 분리해 운영 서버의 작업 경쟁을 줄인다.
- 신규 MES 사업에 기능을 추가할 때 기존 공통 기능을 재사용한다.
- 테스트가 DB 내부 구현이나 HTTP 세부사항에 과도하게 종속되지 않도록 한다.

### 2.2 비목표

- 현재 Kdit 백엔드를 이번 작업에서 전면 리팩터링하지 않는다.
- 마이크로서비스로 분리하지 않는다.
- 모든 테이블에 범용 CRUD API를 제공하지 않는다.
- Entity Framework의 Change Tracking을 전체 데이터 접근 표준으로 사용하지 않는다.
- 메시지 브로커나 별도 이벤트 저장소를 초기 구조에 추가하지 않는다.
- 화면 하나마다 별도 프로젝트를 만들지 않는다.

## 3. 현재 백엔드에서 확인된 문제

### 3.1 WebApplication_Server_Library의 책임 과다

현재 WebApplication_Server_Library에는 다음이 모두 들어 있다.

- Controller
- Entity와 DTO
- DbContext
- Stored Procedure 모델
- View 모델
- Service
- Filter
- Middleware
- SignalR Hub
- 설정
- 백그라운드 처리에 필요한 공통 코드

이 프로젝트는 이름은 Library지만 실제로는 애플리케이션의 대부분을 포함한다. 따라서 파일이 어디에 있어야 하는지보다 기존 파일을 어디에서 재사용할 수 있는지가 우선되는 구조가 되었다.

새 플랫폼에는 범용 Library 프로젝트를 만들지 않는다. 공통 코드는 실제 소비자와 책임이 명확한 계층에 둔다.

### 3.2 의존성 방향 역전

현재 WebApplication_Server_Domain이 WebApplication_Server_Library를 참조한다. Domain이 데이터베이스와 웹 애플리케이션 구현을 알게 되는 방향이다.

새 플랫폼에서는 다음 방향만 허용한다.

~~~
Domain
  ↑
Application
  ↑
Infrastructure
  ↑
Server
~~~

Domain은 ASP.NET Core, Dapper, SQL Server, Redis를 참조하지 않는다.

### 3.3 범용 Controller의 성능·추적성 문제

현재 BaseEntityController, BaseStoredProcedureController, BaseViewController는 CRUD와 프로시저 실행을 빠르게 추가할 수 있게 해 주었다. 그러나 호출자가 실제 SQL, 조인 범위, Include 여부, 응답 크기를 명확히 알기 어렵다.

특히 다음 문제가 발생할 수 있다.

- GetAll 호출로 큰 테이블을 한 번에 로드할 수 있다.
- 동적 검색 조건이 화면별 인덱스 전략과 맞지 않을 수 있다.
- include=true가 연쇄 Include와 대량 응답으로 이어질 수 있다.
- Controller 이름만으로 실제 업무 변경 범위를 파악하기 어렵다.
- 동일한 테이블에 여러 Controller가 서로 다른 규칙으로 접근할 수 있다.

새 플랫폼에서는 Controller를 HTTP Adapter로만 사용하고, 각 업무 기능에 명시적인 Command와 Query를 둔다.

### 3.4 API와 Worker의 결합

현재 API 프로세스 안에 설비 로그 파싱, 알림, 재고 경고, Projection 갱신 등의 Hosted Service가 같이 실행된다. 이 방식은 단일 서버에서는 간단하지만, 개발 서버가 운영 DB에 연결되거나 API를 여러 대 실행할 때 작업 중복과 교착이 발생할 수 있다.

새 플랫폼에서는 API와 Worker를 별도 실행 프로그램으로 배포한다.

## 4. 대안 비교

### 4.1 현재 방식의 확장

~~~
Server
Domain
Library
~~~

장점은 기존 팀이 즉시 이해하기 쉽다는 것이다. 그러나 Library가 계속 커지고, Domain이 구현 프로젝트를 참조하게 되며, 기능 간 책임이 다시 섞일 가능성이 높다.

다음 사업의 기준 구조로는 채택하지 않는다.

### 4.2 전통적인 Clean Architecture + Generic Repository

~~~
Web
Application
Domain
Infrastructure
~~~

계층 방향은 명확하지만, 모든 테이블을 Generic Repository로 감싸면 결국 다음과 같은 얕은 모듈이 생길 수 있다.

~~~
Controller
  → Service
    → Repository
      → DbSet
~~~

각 계층이 실제 업무 복잡성을 숨기지 못하고 전달만 하는 경우가 많다. 대용량 Query마다 어떤 SQL이 실행되는지도 불분명해질 수 있다.

기본 방향으로는 채택하지 않되, 순수 도메인 규칙과 Adapter 분리 원칙은 사용한다.

### 4.3 기능 중심 Modular Monolith

하나의 백엔드 솔루션 안에서 생산·재고·품질·추적성 기능을 기능 단위로 구성한다. HTTP API와 Worker는 별도 실행 프로그램이지만 Application과 Infrastructure를 공유한다.

~~~
Server ─────┐
            ├─ Application ── Domain
Worker ─────┘
       └──── Infrastructure
~~~

이 방식을 채택한다.

선택 이유는 다음과 같다.

- 현재 MES 규모에는 마이크로서비스보다 운영이 단순하다.
- 기능별 책임과 데이터 접근을 분리할 수 있다.
- API와 Worker가 동일한 업무 Handler를 재사용할 수 있다.
- SQL Server 트랜잭션과 Projection 갱신을 한 시스템 안에서 추적하기 쉽다.
- 이후 특정 기능이 독립 서비스가 되어야 할 때 Adapter와 계약을 기준으로 분리할 수 있다.

## 5. 목표 솔루션 구조

~~~
MesPlatform.sln
├─ src/
│  ├─ MesPlatform.Server/
│  ├─ MesPlatform.Worker/
│  ├─ MesPlatform.Domain/
│  ├─ MesPlatform.Application/
│  ├─ MesPlatform.Infrastructure/
│  └─ MesPlatform.Contracts/
│
├─ tests/
│  ├─ MesPlatform.Domain.Tests/
│  ├─ MesPlatform.Application.Tests/
│  ├─ MesPlatform.Infrastructure.Tests/
│  └─ MesPlatform.Api.Tests/
│
├─ database/
│  └─ MesPlatform.Database/
│
└─ docs/
~~~

### 5.1 실행 프로젝트

#### MesPlatform.Server

ASP.NET Core HTTP API와 SignalR Hub를 실행한다.

책임:

- 인증 미들웨어 등록
- HTTP 라우팅
- Request/Response 변환
- OpenAPI 문서
- Application과 Infrastructure 조립
- 실시간 변경 알림의 연결 지점 제공

#### MesPlatform.Worker

Windows Service 또는 별도 프로세스로 실행한다.

책임:

- EquipmentLogRaw 처리
- ProcessResult 생성
- ProcessStatusRefreshQueue 처리
- 설비 상태 집계
- 재고·품질 관련 예약 배치
- 알림과 정기 집계

API가 Worker의 작업을 대신 실행하지 않는다. 개발 환경에서만 명시적인 설정으로 Worker를 같은 호스트에서 실행할 수 있지만, 기본값은 비활성화한다.

### 5.2 라이브러리 프로젝트

#### MesPlatform.Domain

순수 업무 모델과 규칙을 소유한다.

~~~
Domain/
├─ Production/
│  ├─ WorkOrders/
│  ├─ ProductionLots/
│  └─ ProcessResults/
├─ Inventory/
├─ Quality/
├─ Traceability/
├─ Equipment/
└─ Common/
~~~

#### MesPlatform.Application

Use Case, Command, Query, Handler와 외부 Adapter의 인터페이스를 소유한다.

~~~
Application/
├─ Abstractions/
│  ├─ Persistence/
│  ├─ Identity/
│  ├─ Time/
│  ├─ FileStorage/
│  └─ Notifications/
├─ Common/
│  ├─ Behaviors/
│  ├─ Errors/
│  ├─ Pagination/
│  ├─ OperationContext/
│  └─ Results/
└─ Features/
   ├─ Production/
   ├─ Inventory/
   ├─ Quality/
   ├─ Traceability/
   ├─ Equipment/
   ├─ MasterData/
   └─ System/
~~~

#### MesPlatform.Infrastructure

Application이 정의한 인터페이스의 SQL Server·Redis·파일·메일·알림 Adapter를 구현한다.

~~~
Infrastructure/
├─ Sql/
│  ├─ SqlConnectionFactory.cs
│  ├─ SqlSession.cs
│  ├─ SqlTransactionRunner.cs
│  ├─ DapperTypeHandlers/
│  └─ SqlErrorMapper.cs
├─ Production/
├─ Inventory/
├─ Quality/
├─ Traceability/
├─ Equipment/
├─ Identity/
├─ Notifications/
└─ Background/
~~~

#### MesPlatform.Contracts

HTTP API의 외부 계약만 보유한다.

~~~
Contracts/
├─ Common/
├─ Authentication/
├─ Production/
├─ Inventory/
├─ Quality/
├─ Traceability/
└─ System/
~~~

프론트엔드는 C# 프로젝트를 직접 참조하지 않는다. OpenAPI 문서에서 TypeScript Client와 타입을 생성한다.

## 6. 프로젝트 참조 규칙

~~~
MesPlatform.Domain
  └─ 외부 프로젝트 참조 없음

MesPlatform.Application
  └─ Domain 참조

MesPlatform.Infrastructure
  ├─ Application 참조
  └─ Domain 참조

MesPlatform.Contracts
  └─ 내부 프로젝트 참조 없음

MesPlatform.Server
  ├─ Application 참조
  ├─ Infrastructure 참조
  └─ Contracts 참조

MesPlatform.Worker
  ├─ Application 참조
  └─ Infrastructure 참조
~~~

다음 참조는 금지한다.

- Domain → Application
- Domain → Infrastructure
- Domain → Server
- Application → Server
- Application → Infrastructure
- Controller → Infrastructure의 구체 SQL 클래스
- Worker → Server Controller
- 프론트엔드 → C# 프로젝트 직접 참조

Infrastructure를 참조하는 것은 애플리케이션 조립 지점인 Server와 Worker뿐이다. Feature Handler는 Infrastructure의 구체 클래스가 아니라 Application에 정의된 인터페이스를 사용한다.

## 7. 기능 모듈 구성

기능은 계층별로 무작정 파일을 모으지 않고, 각 계층 안에서 기능별로 나눈다.

### 7.1 Application Feature 예시

~~~
Application/Features/Production/WorkOrders/
├─ Commands/
│  ├─ CreateWorkOrder/
│  │  ├─ CreateWorkOrderCommand.cs
│  │  ├─ CreateWorkOrderHandler.cs
│  │  └─ CreateWorkOrderValidator.cs
│  ├─ ChangeWorkOrderStatus/
│  └─ CancelWorkOrder/
└─ Queries/
   ├─ GetWorkOrderPage/
   ├─ GetWorkOrderDetail/
   └─ GetWorkOrderProcessSummary/
~~~

각 Handler는 하나의 Use Case를 깊게 구현한다. Controller가 Handler의 내부 단계를 알아야 하는 구조는 만들지 않는다.

### 7.2 Infrastructure Feature 예시

~~~
Infrastructure/Production/WorkOrders/
├─ SqlWorkOrderReader.cs
├─ SqlWorkOrderWriter.cs
├─ WorkOrderSql.cs
├─ WorkOrderRows.cs
└─ WorkOrderParameterMapper.cs
~~~

SqlWorkOrderReader의 인터페이스는 Application에 있고 구현은 Infrastructure에 둔다. SQL 문장이나 프로시저명은 Controller와 Handler에 노출하지 않는다.

### 7.3 Server Feature 예시

~~~
Server/Controllers/Production/
└─ WorkOrdersController.cs
~~~

Controller는 다음만 한다.

1. 인증된 사용자와 HTTP 요청을 받는다.
2. Contracts Request를 Application Command/Query로 변환한다.
3. Handler를 호출한다.
4. Application 결과를 Contracts Response로 변환한다.
5. HTTP 상태 코드와 응답을 반환한다.

Controller에 업무 상태 전이, 재고 계산, SQL 실행, JSON 파싱을 넣지 않는다.

## 8. Command와 Query 설계

### 8.1 Command

Command는 데이터를 변경한다.

~~~
CreateWorkOrderCommand
ChangeWorkOrderStatusCommand
RecordProcessResultCommand
RecordProcessResultsBatchCommand
IssueMaterialCommand
TransferInventoryCommand
RegisterPqcResultCommand
CompleteOqcCommand
~~~

Command에는 다음 공통 정보가 포함된다.

~~~
RequestId
OperationId
ActorUserId
PlantId
IdempotencyKey
Reason
~~~

화면에서 직접 호출하는 Command와 설비 Worker가 호출하는 Command는 동일한 업무 규칙을 사용한다. HTTP가 아닌 Worker가 Controller를 거쳐야 하는 구조는 만들지 않는다.

### 8.2 Query

Query는 데이터를 변경하지 않는다.

~~~
GetWorkOrderPageQuery
GetProcessUnitStatusQuery
GetProductionResultSummaryQuery
GetInventoryAvailabilityQuery
GetLotTraceabilityQuery
GetOqcCandidateQuery
~~~

Query는 화면이 요구하는 결과 모델을 직접 반환한다. Entity 전체를 반환하고 프론트엔드에서 조합하게 하지 않는다.

### 8.3 Handler 인터페이스

공통 인터페이스는 작게 유지한다.

~~~
ICommandHandler<TCommand, TResult>
IQueryHandler<TQuery, TResult>
~~~

범용 Base Handler에 업무 규칙을 몰아넣지 않는다. 공통 Pipeline은 인증, 검증, 트랜잭션, 중복 방지, 관측성처럼 모든 Command에 공통인 동작에만 사용한다.

## 9. API 설계

### 9.1 명시적 리소스와 Use Case

새 API는 버전 경로를 사용한다.

~~~
/api/v1/production/work-orders
/api/v1/production/process-results
/api/v1/inventory/operations
/api/v1/quality/pqc-results
/api/v1/traceability/lots/{productionLotId}
~~~

범용 API는 제공하지 않는다.

~~~
사용하지 않음:
/api/entity/{tableName}
/api/procedure/{procedureName}
/api/view/{viewName}
~~~

### 9.2 이름 규칙

DB와 C#은 PascalCase로 일치시킨다.

~~~
DB:     dbo.WorkOrder.WorkOrderId
C#:     WorkOrder.WorkOrderId
JSON:   workOrderId
~~~

JSON의 camelCase는 외부 전송 규칙일 뿐, 내부 업무 모델과 DB 이름을 바꾸는 이유가 아니다.

### 9.3 응답 규칙

모든 성공 응답(단건·목록·Command 결과)은 하나의 envelope를 사용한다.

~~~json
{
  "data": {},
  "meta": {
    "requestId": "...",
    "operationId": "..."
  }
}
~~~

대용량 목록은 `items`, `nextCursor`, `hasMore`, `asOf`를 `data` 안에 둔다.

~~~json
{
  "data": {
    "items": [],
    "nextCursor": "...",
    "hasMore": true,
    "asOf": "2026-10-07T10:00:00Z"
  },
  "meta": {
    "requestId": "...",
    "operationId": "..."
  }
}
~~~

`asOf`는 Projection과 집계 결과의 기준 시각이다(UTC). 실시간 화면이 데이터를 조회한 시점과 Projection이 마지막으로 계산된 시점을 구분할 수 있어야 한다. 조회 전용 요청의 `operationId`는 null일 수 있다.

### 9.4 Cursor Pagination

대용량 목록은 Keyset Cursor를 사용한다. 임의 페이지 번호 이동과 전체 rowCount는 제공하지 않는다.

- 요청: `limit`(서버 상한 있음), `cursor`, `sort`, 필터 조건
- `cursor`는 서버가 만든 불투명 문자열이며 정렬 키와 마지막 행의 키 값을 포함한다.
- 정렬 조건이 바뀌면 이전 cursor는 거부(400, `CURSOR_SORT_MISMATCH`)하고, 클라이언트는 cursor를 버리고 처음부터 조회한다.
- 정렬 가능한 컬럼은 서버가 허용한 목록으로 제한하며, 항상 고유 키를 마지막 tie-breaker로 사용한다.
- 총 건수가 필요한 화면은 별도 요약 Query를 정의한다. 목록 Query가 count를 계산하지 않는다.

## 10. Application 처리 Pipeline

### 10.1 Command 흐름

~~~
HTTP 또는 Worker
    ↓
OperationContext 생성
    ↓
인증·권한 확인
    ↓
입력 검증
    ↓
IdempotencyKey 확인
    ↓
SQL Transaction 시작
    ↓
Command Handler
    ↓
Domain 규칙 확인
    ↓
쓰기 Adapter
    ↓
AuditLog 및 Projection Queue 기록
    ↓
Commit
    ↓
응답 또는 변경 알림
~~~

AuditLog와 Projection Queue는 원본 변경과 같은 Transaction 안에서 처리한다. 원본은 저장됐지만 감사기록 또는 갱신 대상 등록이 누락되는 상태를 허용하지 않는다.

### 10.2 Query 흐름

~~~
HTTP
  ↓
권한 확인
  ↓
Query 검증
  ↓
전용 Read Adapter
  ↓
Dapper Query 또는 읽기 프로시저
  ↓
페이지 결과 반환
~~~

Query는 기본적으로 Entity를 만들지 않는다. 화면에 필요한 Row DTO를 직접 읽는다.

## 11. SQL Server 데이터 접근

### 11.1 Dapper 중심 접근

새 플랫폼의 핵심 데이터 접근은 Microsoft.Data.SqlClient와 Dapper를 사용한다.

이유는 다음과 같다.

- SQL Server 쿼리와 실행 계획을 직접 통제할 수 있다.
- 대용량 목록에서 불필요한 Change Tracking이 없다.
- Stored Procedure, TVP, QueryMultiple, 배치 입력을 명시적으로 사용할 수 있다.
- Projection과 Summary에 맞는 전용 Row 모델을 만들 수 있다.

EF Core를 공통 데이터 접근 표준으로 사용하지 않는다. 단순 CRUD를 자동 생성하기 위해 EF Entity를 화면에 노출하지 않는다.

### 11.2 Adapter 규칙

Infrastructure Adapter는 다음 책임만 가진다.

- Connection 열기
- Transaction에 참여하기
- SQL Parameter 매핑
- Stored Procedure 또는 전용 Query 실행
- 결과 Row를 Application 결과로 변환
- SQL 오류를 안정적인 업무 오류로 변환

Adapter에 다음 책임을 넣지 않는다.

- HTTP 상태 코드 결정
- 사용자 메시지 생성
- 메뉴 권한 판정
- 프론트엔드용 JSON 생성
- 다른 Use Case 호출을 통한 업무 흐름 조합

### 11.3 Command SQL 규칙

다중 테이블 변경이 필요한 Command는 하나의 권위 있는 SQL Transaction으로 처리한다.

예시는 다음과 같다.

~~~
usp_WorkOrderCreate
usp_WorkOrderChangeStatus
usp_ProcessResultRecord
usp_ProcessResultRecordBatch
usp_InventoryOperationCreate
usp_InspectionComplete
~~~

프로시저는 하나의 업무 Command를 처리하되, 현재 usp_ModelProcessResultRequest처럼 생산·재고·품질·상태·번호생성을 끝없이 모두 포함하지 않는다.

복잡한 Command는 Application에서 다음처럼 역할을 나눈다.

~~~
RecordProcessResultHandler
  ├─ ProcessResultWriter
  ├─ ProductionSummaryWriter
  ├─ InventoryOperationWriter
  ├─ ProjectionQueueWriter
  └─ AuditWriter
~~~

단, 이 Adapter들이 서로 다른 독립 Transaction을 만들면 안 된다. 상위 Command의 하나의 SQL Transaction에 참여해야 한다.

### 11.4 대량 입력

설비 로그나 실적을 한 행씩 SaveChangesAsync로 저장하지 않는다.

사용 방식:

- 소량 단건: 명시적 Command Procedure
- 중간 규모 묶음: Table-Valued Parameter
- 대량 원본 로그: SqlBulkCopy 또는 staging table
- staging 처리: Worker가 Claim 후 set-based procedure 실행

## 12. 생산 실적 처리 설계

설비 로그에서 최종 실적까지의 흐름은 다음과 같다.

~~~
EquipmentLogRaw
    ↓
EquipmentLogRawProcessing에서 Claim
    ↓
ProcessResult 입력 검증
    ↓
ProcessResult 저장
    ├─ ProcessResultMeasurement
    ├─ ProcessResultDefect
    ├─ ProcessResultAttachment
    └─ 원본 Idempotency 확인
    ↓
ProductionResultSummary 갱신
    ↓
필요한 InventoryOperation 및 InventoryTransaction 생성
    ↓
ProcessStatusRefreshQueue 등록
    ↓
AuditLog 기록
~~~

### 12.1 JSON 처리 원칙

ResultData는 원본 보존과 재처리를 위해 남긴다. 그러나 일반 조회나 Projection 갱신 때마다 JSON을 반복 파싱하지 않는다.

입력 시점에 다음을 분리해 저장한다.

- 핵심 판정값
- 화면 검색에 사용하는 측정값
- 공정·모델별 측정 항목
- 불량 코드
- 원본 JSON

새로운 측정 항목이 추가되더라도 기존 핵심 목록 조회가 전체 JSON을 다시 읽지 않도록 한다.

### 12.2 단건과 배치

설비가 단건 결과를 보내는 경우와 묶음 결과를 보내는 경우를 별도 Command로 구분한다.

~~~
RecordProcessResultCommand
RecordProcessResultsBatchCommand
~~~

두 Command는 같은 Domain 규칙과 저장 순서를 사용하지만, DB 입력 방식은 단건과 TVP로 최적화한다.

## 13. Projection과 실시간 처리

### 13.1 읽기 모델

1-2, 4-6, 4-7, 7-3의 공통 실시간 상태는 다음 테이블을 읽는다.

~~~
dbo.ProcessUnitStatusCurrent
~~~

각 행은 `PlantId int NOT NULL`(FK `dbo.Plant`)을 가지며, 모든 조회와 구독은 Plant 범위 안에서 실행된다. 이벤트의 `plantId`는 이 컬럼 값이다(DB 설계 §4.8).

이 테이블은 원본 사실이 아니다. ProcessResult, ProductionResultSummary, 품질 결과, 재고 수불 등 원본을 계산해 만든 현재 읽기 모델이다.

### 13.2 갱신 흐름

첫 수직 슬라이스에서는 계산 단계를 `IProcessUnitStatusCalculator` seam 뒤에 두고 검증용 deterministic calculator로 흐름만 검증한다. 실제 `ProcessResult` 기반 계산은 후속이다.

~~~
원본 Command Commit
    ↓
ProcessStatusRefreshQueue 등록
    ↓
ProjectionRefreshWorker가 행 Claim
    ↓
영향받은 ProductionLotId + HousingQr 범위 계산
    ↓
TVF 또는 전용 set-based 계산 실행
    ↓
ProcessUnitStatusCurrent Upsert + ProjectionVersion 기록 + ProjectionChangeOutbox 기록 + Queue 완료 처리
(모두 같은 transaction, §13.4) → commit
    ↓
Server의 Dispatcher가 Outbox claim → SignalR Hub 발행
~~~

TVF는 사용자 요청마다 실행하지 않는다. 다음 경우에만 사용한다.

- Projection 최초 생성
- LOT 또는 QR 재계산
- 정합성 검증
- 운영자 재처리
- 장애 복구

### 13.3 실시간 의미와 이벤트 계약

SignalR 이벤트는 데이터를 전달하는 권위 있는 저장소가 아니다. 클라이언트에 다시 읽어야 할 대상이 변경되었다는 무효화 알림만 보낸다. 이벤트에는 행 데이터와 version을 싣지 않는다.

**SignalR 연결 계약(정본: `contracts/realtime-events.md`)**

| 항목 | 값 |
|---|---|
| Hub 경로 | `/hubs/projections` |
| 클라이언트 → 서버 | `SubscribePlant(plantId)`, `UnsubscribePlant(plantId)` |
| 서버 → 클라이언트 이벤트 | `ProjectionChanged` (payload는 `ProjectionChangedEvent`) |
| 인증 | WebSocket 연결에서는 `access_token` query로 access token 전달 |
| 구독 단위 | Plant. 서버가 `allowedPlantIds`와 대조해 허용되지 않은 구독을 거부 |

최종 계약은 다음 타입이며 프론트엔드 설계 §12와 동일하다. 정본은 `contracts/realtime-events.md`다.

~~~ts
type ProjectionChangedEvent = {
  projection: "processUnitStatus";
  plantId: number;
  changedIds: number[];
  reset?: boolean;
  asOf: string;
};
~~~

~~~json
{
  "projection": "processUnitStatus",
  "plantId": 1,
  "changedIds": [101, 102],
  "asOf": "2026-10-07T10:00:00Z"
}
~~~

- `changedIds`는 `ProcessUnitStatusCurrent`의 행 식별자(`ProcessUnitStatusId`) 목록이다.
- 변경 행이 너무 많거나 범위를 특정할 수 없으면 `reset: true`를 보낸다. 이때 `changedIds`는 빈 배열이며 클라이언트는 `changedIds`를 사용하지 않고 해당 Query를 invalidate한다.
- 구독 단위는 Plant이다. 클라이언트는 허용된 Plant만 구독할 수 있다.
- 이벤트 순서와 유실은 보장하지 않는다. 클라이언트는 ID 일괄 재조회 결과의 `projectionVersion`으로 최신 여부를 판단한다.
- 연결 복구 시와 이벤트 유실이 의심될 때는 클라이언트가 제한된 fallback refresh를 수행한다.

조회 API는 다음을 제공한다.

~~~
GET /api/v1/monitoring/process-unit-status?cursor=&limit=&sort=&plantId=...
GET /api/v1/monitoring/process-unit-status?ids=101,102,103&plantId=...   (일괄 재조회, 상한 있음)
~~~

모든 행은 `projectionVersion`(bigint, `dbo.ProjectionVersionSeq`에서 발급)을 포함한다. Projection row Upsert와 version 기록은 같은 transaction에서 처리한다. 같은 행에서 version이 증가하는 방향으로만 갱신된다.

데이터의 권위는 다음 순서로 둔다.

~~~
원본 Fact
  → ProcessUnitStatusCurrent Projection
    → API 응답
~~~

알림이 유실되어도 fallback refresh 또는 사용자의 재조회로 상태를 다시 읽을 수 있어야 한다.

### 13.4 변경 알림 전달: Transactional Outbox

Worker와 Server는 별도 프로세스이며 SignalR Hub는 Server에 있다. 권장 결정(BE-12에서 확정)은 다음과 같다.

~~~
Worker transaction
  ├─ ProcessUnitStatusCurrent Upsert
  ├─ ProjectionVersion 기록
  └─ dbo.ProjectionChangeOutbox Insert        ← 같은 transaction, 실패하면 모두 rollback
        ↓ commit
Server ProjectionOutboxDispatcher (hosted service)
  ├─ Outbox 행 claim (lease)
  ├─ IProjectionChangeNotifier → SignalR Hub 발행
  └─ 성공 시 PublishedAt 기록, 실패 시 attempt 증가·backoff
~~~

- Worker는 Server Hub를 직접 호출하지 않는다. Worker는 Outbox writer만 사용한다.
- 전달은 **at-least-once**다. Dispatcher가 발행 후 `PublishedAt` 기록 전에 중단되면 같은 이벤트가 다시 발행될 수 있다. 클라이언트는 id 일괄 재조회와 `projectionVersion` 비교로 중복을 안전하게 병합한다.
- Server가 중단되어도 Outbox 행은 DB에 남으므로 이벤트가 유실되지 않는다. Server 복구 후 Dispatcher가 이어서 발행한다.
- 여러 Dispatcher(다중 Server 인스턴스)는 claim·lease로 같은 행을 동시에 발행하지 않는다. lease가 만료된 행은 다시 claim된다.
- 실패는 attempt count와 다음 시도 시각(backoff)으로 retry하고, 최대 횟수를 넘으면 `Failed`로 남기며 `LastError`를 기록한다.
- 이벤트 간 순서는 보장하지 않는다.
- SignalR backplane(다중 Server 간 Hub 전달)은 다중 Server로 확장할 때의 후속 범위다. 단일 Server에서는 Dispatcher가 발행한 Hub 연결에 이벤트가 전달된다.
- lease 기간, backoff, 최대 시도 횟수, 보관 기간은 아래 §13.4.1에서 확정한 설정값이다.

#### 13.4.1 전달 정책 (BE-12 확정)

설정 이름은 `Projection:Outbox:*`이며 값은 운영에서 조정할 수 있다. 아래는 기본값이다.

| 설정 | 기본값 | 설명 |
|---|---:|---|
| `DispatcherEnabled` | Production 외 환경에서 false, Production true | 개발 환경에서 운영 DB에 연결해도 Dispatcher가 운영 이벤트를 가로채 `Published`로 표시하지 않게 한다. 차단된 DB 대상이면 시작을 거부한다(BE-04의 안전 실행 검사 재사용) |
| `ClaimBatchSize` | 100 | 한 번에 claim하는 행 수 |
| `LeaseSeconds` | 30 | claim 유효 시간. 배치가 작아 갱신(renew)은 두지 않는다 |
| `PollIntervalMilliseconds` | 500 | 대기 행이 없을 때 polling 간격. 배치가 가득 차면 즉시 다시 claim한다 |
| `MaxAttempts` | 10 | 이 횟수를 넘으면 `Failed` |
| `BackoffBaseSeconds` / `BackoffMaxSeconds` | 2 / 60 | 다음 시도 = `min(base × 2^(attempt-1), max)`에 ±20% jitter |
| `PublishedRetentionDays` | 7 | 발행 완료 행은 이 기간 후 삭제(Dispatcher가 1시간마다 `DELETE TOP (1000)` 반복) |
| `FailedRetentionDays` | 30 | `Failed` 행은 운영자가 확인할 수 있도록 더 오래 보관한 뒤 삭제 |
| `MaxChangedIdsPerEvent` | 200 | Worker가 한 행에 담는 `changedIds` 상한. 넘으면 `IsReset=1` 행으로 대체한다. 클라이언트는 이 id를 100개씩 나누어 재조회한다 |

**Claim:** 단일 문장으로 `Status = 'Pending' AND NextAttemptAt <= now AND (LeaseExpiresAt IS NULL OR LeaseExpiresAt < now)`인 행을 `ProjectionChangeOutboxId` 순으로 `ClaimBatchSize`개 골라 `LeaseOwner`와 `LeaseExpiresAt`을 기록한다(`UPDLOCK, READPAST`, `OUTPUT`). `Status`는 발행 완료 전까지 `Pending`이고 lease가 claim 상태를 나타낸다. `LeaseOwner`는 `서버이름:프로세스ID:GUID`다.

**완료 표시:** 발행 성공 후 `WHERE ProjectionChangeOutboxId = @id AND LeaseOwner = @owner`일 때만 `Status='Published'`, `PublishedAt`을 기록한다. 영향 행이 0이면(lease를 잃음) 무시한다.

**발행:** 한 행이 한 이벤트다. 같은 Plant의 여러 행을 합치지 않는다(합치기는 FE-11 측정 후 필요하면 재검토). 이벤트 순서는 행 id 순서를 시도하지만 보장하지 않는다.

**시나리오별 동작**

| 시나리오 | 기대 동작 |
|---|---|
| Worker transaction 롤백 | Projection 행, `ProjectionVersion`, Outbox 행이 모두 롤백되어 이벤트가 없다. Queue 항목은 재시도 가능 상태가 된다 |
| Server 중단 | Outbox 행이 `Pending`으로 남는다. Server가 돌아오면 이어서 claim해 발행한다. 유실이 없다 |
| Dispatcher 재시작 | 처리 중이던 행은 lease가 만료된 뒤 다시 claim된다 |
| 중복 발행 | 발행은 됐지만 `Published` 기록 전에 중단되면 lease 만료 후 같은 이벤트가 다시 발행된다. 허용한다. 클라이언트는 id 재조회와 `projectionVersion` 비교로 병합한다 |
| 발행 실패(예외) | `AttemptCount` 증가, backoff로 `NextAttemptAt` 설정, lease 해제, `LastError` 기록(SQL·스택 문자열 없이 요약, 최대 1000자) |
| 최대 시도 초과 | `Status='Failed'`로 두고 error 로그와 지표로 알린다. 원인을 고친 뒤 운영자가 `Status='Pending'`, `AttemptCount=0`으로 되돌려 재처리한다 |
| lease 만료 | 다른 Dispatcher(다중 인스턴스)가 재claim한다. 유효한 lease가 있는 행은 다른 Dispatcher가 발행하지 않는다 |
| 연결된 클라이언트가 없음 | 발행은 성공으로 보고 `Published`로 표시한다. 클라이언트는 재연결 때 전체 재조회와 fallback refresh로 따라잡는다 |

**관측성:** 대기 행 수, 가장 오래된 대기 행의 나이, `Failed` 행 수, 발행 지연(`PublishedAt - EnqueuedAt`)을 지표로 낸다. `Failed`가 1건 이상이거나 가장 오래된 대기 행이 60초를 넘으면 경고 대상이다.

**배포 제약:** SignalR backplane이 없는 동안 Hub 연결은 이벤트를 발행한 Server 인스턴스에만 있다. 따라서 backplane을 도입하기 전까지 Server는 한 인스턴스(또는 Dispatcher가 활성인 인스턴스 하나)로 운영한다. 다중 Server 확장 시 backplane을 도입한다(후속 범위).

## 14. Worker 설계

Worker는 각 작업을 독립 Job으로 구성한다.

~~~
EquipmentLogIngestionJob
ProcessResultParsingJob
ProjectionRefreshJob
EquipmentAvailabilityJob
NotificationJob
~~~

각 Job은 다음 규칙을 지킨다.

- Claim과 Lease를 사용한다.
- 처리 시작 시도 횟수를 기록한다.
- 일시적 오류는 지수 Backoff 후 재시도한다.
- 영구 오류는 FAILED 상태와 오류 코드를 기록한다.
- 같은 입력을 다시 처리해도 중복 결과가 생기지 않는다.
- 처리 대상과 처리 결과를 OperationId로 연결한다.
- 무제한 동시 처리를 하지 않는다.

Worker 설정에는 DB 이름 차단 목록만 두지 않고, 실행 환경과 역할을 명시한다.

~~~
ProcessRole=Api
ProcessRole=Worker
BackgroundProcessingEnabled=true
AllowedPlantIds=...
~~~

개발 환경에서 운영 DB에 연결하더라도 Worker가 자동으로 시작되지 않도록 기본값을 안전하게 둔다.

## 15. 권한과 인증

### 15.1 권한 코드

메뉴 경로와 권한을 직접 결합하지 않는다. 안정적인 Permission Code를 사용한다.

~~~
Production.WorkOrder.Read
Production.WorkOrder.Create
Production.WorkOrder.ChangeStatus
Production.ProcessResult.Read
Production.ProcessResult.Correct
Inventory.Operation.Create
Quality.Pqc.Register
Traceability.Lot.Read
~~~

Controller 또는 Handler의 인터페이스에는 필요한 권한이 명확하게 표시되어야 한다.

~~~
RequirePermission("Production.WorkOrder.ChangeStatus")
~~~

메뉴 URL이 바뀌어도 업무 권한 코드가 바뀌지 않도록 한다.

### 15.2 Plant 범위

현재 전제는 여러 고객사를 완전히 격리하는 멀티테넌트 SaaS가 아니다. 대신 PlantId를 요청 범위와 데이터 변경 범위에 포함해 공장 단위 권한을 지원한다.

`plantId`는 숨겨진 공통 헤더가 아니라 API 계약에 명시한다.

- 조회 Query: query parameter 또는 route parameter
- Command: request body 또는 route parameter
- 서버는 인증된 사용자의 `allowedPlantIds`와 대조해 최종 검증한다. 클라이언트가 보낸 Plant 선택은 신뢰하지 않는다.
- 허용되지 않은 Plant는 403으로 거절한다.

모든 생산·재고·품질 Command는 Plant 범위를 검증한다. Plant 범위를 생략한 관리자가 아닌 이상, 다른 Plant의 데이터를 직접 수정할 수 없어야 한다.

### 15.3 인증

인증은 **첫 슬라이스의 provisional 범위**와 **BE-05가 결정하는 범위**로 나눈다. 두 범위는 서로 겹치지 않는다.

#### 첫 슬라이스 provisional 계약 (CON-01, 구현은 BE-03)

- `POST /api/v1/auth/login`: 자격 증명을 받아 JWT access token을 반환한다(refresh token·cookie 없음).
- `GET /api/v1/auth/session`: 현재 사용자, `allowedPlantIds`, capability(Permission Code) 목록을 반환한다. capability와 Plant 범위는 로그인 응답이 아니라 이 조회로 제공한다.
- 클라이언트는 access token을 `Authorization: Bearer`로 보내고 메모리에만 보관한다(localStorage 금지).
- 401은 토큰 없음·만료·무효를, 403은 Permission 또는 Plant 범위 부족을 뜻한다.
- 사용자 저장소는 `IUserAuthenticator` seam 뒤에 둔다. 첫 슬라이스에는 Development 환경에서만 활성화되는 설정 기반 개발용 구현을 둔다. 운영 환경에서 이 구현이 활성화되면 시작을 거부한다. 실제 사용자·권한 저장소는 후속이다.
- 이 계약은 BE-05의 결정과 무관하게 구현·사용할 수 있다. BE-05는 이 계약을 깨지 않는 추가(additive)만 할 수 있으며, 기존 필드의 변경이 필요하면 CON-02를 통해 FE·BE 합의 후에 한다.

#### BE-05가 결정하는 범위 (§24.1)

- refresh·logout endpoint와 요청·응답
- refresh token: HttpOnly + Secure + SameSite cookie, rotation, 재사용 감지(방향은 확정, 속성 값과 동작은 BE-05가 결정)
- cookie 이름·Path·Domain·SameSite 값·만료
- CORS와 cookie를 함께 쓰는 배포 구성(동일 origin 여부)
- 구현은 BE-11, 프론트 silent refresh는 FE-13

## 16. Operation과 추적성

### 16.1 OperationContext

모든 요청과 Worker 작업은 다음 정보를 가진다.

~~~
OperationContext
├─ RequestId
├─ OperationId
├─ CorrelationId
├─ ActorUserId
├─ PlantId
├─ Endpoint
├─ CommandName
├─ Reason
└─ ClientIp
~~~

### 16.2 추적 연결

~~~
HTTP/Worker Request
  → OperationId
    → ProcessResult 또는 InventoryOperation
      → ProductionResultSummary / Inspection
        → ProcessStatusRefreshQueue
          → ProcessUnitStatusCurrent
~~~

수동 수정·취소·폐기·재처리에는 Reason을 요구한다. 단순한 수정 완료 로그가 아니라 어떤 업무 판단으로 변경되었는지 남겨야 한다.

### 16.3 AuditLog

AuditLog는 HTTP Action 이름만 저장하지 않는다.

최소 정보:

- OperationId
- RequestId
- ActorUserId
- CommandName
- EntityType
- EntityId
- ActionCode
- Reason
- BeforeSnapshot 또는 변경 전 핵심 값
- AfterSnapshot 또는 변경 후 핵심 값
- CreatedAt

민감정보와 전체 설비 원본 JSON은 AuditLog에 넣지 않는다.

## 17. 동시성·오류·중복 처리

### 17.1 오류 응답

HTTP 오류는 RFC Problem Details 기반의 공통 구조를 사용한다. `args`는 다국어 메시지 치환 값이고, `errors`는 입력 필드별 오류다. 서버의 `message`는 개발자용 영어 문장이며 화면 문구는 클라이언트가 `code`와 `args`로 번역한다.

~~~json
{
  "type": "https://mes/errors/work-order-status-conflict",
  "title": "Work order status conflict",
  "status": 409,
  "code": "WORK_ORDER_STATUS_CONFLICT",
  "message": "The work order cannot be completed in its current state.",
  "args": { "currentStatus": "Closed" },
  "errors": [
    { "field": "quantity", "code": "QuantityMustBePositive", "args": {} }
  ],
  "traceId": "...",
  "requestId": "...",
  "operationId": "..."
}
~~~

`errors`는 검증 오류(400, 422)에서만 채우며 그 외에는 빈 배열이거나 생략한다. `code`는 안정적인 식별자이고 한 번 공개한 값은 의미를 바꾸지 않는다.

오류 구분:

~~~
400  요청 형식 오류
401  인증 실패
403  권한 부족
404  대상 없음
409  상태·동시성·중복 충돌
422  업무 규칙 위반
500  예상하지 못한 시스템 오류
~~~

SQL Server 오류 번호는 Infrastructure에서 안정적인 MES 오류 코드로 변환한다. Controller가 SQL 오류 문자열을 그대로 반환하지 않는다.

### 17.2 동시성

- 일반적인 수정 대상은 rowversion 또는 ExpectedVersion으로 낙관적 동시성을 적용한다.
- WorkOrder의 낙관적 동시성은 SQL Server `rowversion NOT NULL` 컬럼(`WorkOrder.RowVersion`)을 사용한다. API의 `rowVersion`은 8바이트 값을 Base64 문자열로 직렬화한 불투명 값이고, Command의 `expectedVersion`도 같은 Base64 문자열이다. 갱신은 `WHERE WorkOrderId = @Id AND RowVersion = @Expected`로 수행하고, 영향 행이 0이면 409로 응답한다(오류 `code`와 `args`는 BE-06이 확정). 클라이언트는 이 값을 해석하거나 비교하지 않고 그대로 되돌려 보낸다.
- Projection의 `ProjectionVersion`은 별도의 bigint sequence 값이며 WorkOrder `rowVersion`과 형식·용도가 다르다. 두 값을 혼용하지 않는다.
- 재고 수량은 SQL Transaction과 행 잠금으로 보호한다.
- 동일한 설비 결과는 IdempotencyKey로 한 번만 반영한다.
- 수동 보정은 기존 결과를 덮어쓰기보다 보정 Operation을 기록한다.
- 이력성 Fact와 InventoryTransaction은 물리 삭제하지 않는다.

### 17.3 취소와 역상쇄

재고나 생산 결과를 취소할 때 기존 Transaction을 삭제하거나 임의로 수량을 되돌리지 않는다.

~~~
원본 Operation
  → 취소 Operation
    → 역상쇄 InventoryTransaction
~~~

원본과 취소를 SourceTransactionId 또는 OperationId로 연결해야 중복 취소를 막을 수 있다.

## 18. 성능 기준

### 18.1 조회

- 전체 테이블 ToList 금지
- SELECT * 금지
- 목록은 필요한 컬럼만 조회
- 기본 페이지 방식은 Keyset Pagination
- OFFSET은 소규모·관리자 조회에만 제한적으로 사용
- API 최대 페이지 크기 적용
- 대용량 Export는 별도 Job으로 실행
- 100만 건을 HTTP 응답 하나로 반환하지 않음

### 18.2 쓰기

- 한 행마다 SaveChangesAsync 호출 금지
- 설비 결과는 TVP 또는 staging table 사용
- 다중 테이블 변경은 하나의 SQL Transaction으로 처리
- 계산에 필요한 기준정보는 요청마다 반복 조회하지 않음
- Connection Pool을 사용하고 요청마다 Connection을 새로 생성하지 않음
- 모든 DB 명령에 CancellationToken과 CommandTimeout을 전달

### 18.3 Projection

Projection 조회는 원본 대량 계산보다 빠른 것을 전제로 한다.

초기 성능 목표:

~~~
ProcessUnitStatusCurrent 목록 조회: p95 500ms 이하
일반 업무 페이지 조회: p95 300ms 이하
단일 업무 Command: p95 1초 이하
정상 부하의 Projection 반영: 2초 이내
~~~

성능 목표는 운영과 유사한 데이터 분포와 동시 사용자 조건에서 검증한다. 단순 개발 데이터에서 통과한 시간은 기준으로 인정하지 않는다.

## 19. 관측성

모든 요청과 Worker 실행은 다음 값을 구조화 로그와 Trace에 남긴다.

~~~
TraceId
RequestId
OperationId
ActorUserId
PlantId
UseCase
EntityType
EntityId
ElapsedMilliseconds
Result
~~~

측정할 Metric:

- API 요청 수와 p50/p95/p99 응답시간
- SQL 실행시간과 Timeout 수
- Projection Queue 대기 건수
- Projection 처리 지연시간
- Worker 재시도와 실패 건수
- 설비 원본 처리 지연
- Idempotency 중복 요청 수
- 재고 Operation 실패 건수

ResultData, 토큰, 비밀번호, 개인 정보는 로그에 기록하지 않는다.

## 20. 테스트 전략

### 20.1 Domain Tests

- 작업지시 상태 전이
- LOT 상태 전이
- 공정 결과 판정
- 불량 수량 계산
- 재고 역상쇄 규칙
- 검사 판정 규칙

### 20.2 Application Tests

- Handler의 정상 흐름
- 권한 부족
- 중복 요청
- 동시성 충돌
- Domain 오류 변환
- OperationContext 전파
- Projection Queue 등록 여부

### 20.3 Infrastructure Tests

실제 SQL Server 테스트 DB에서 검증한다.

- FK와 Unique Index
- Stored Procedure 입력·출력
- Transaction Rollback
- InventoryOperation의 OUT/IN 연결
- TVP 배치 입력
- Projection Queue Claim과 Retry
- RowVersion 충돌

### 20.4 API Tests

- HTTP 계약
- 인증과 Permission Code
- Problem Details
- Cursor Pagination
- SignalR 연결과 변경 알림

### 20.5 Performance Tests

운영과 유사한 데이터로 다음을 검증한다.

- ProcessResult 100만 건 이상
- 다수 ProductionLot 동시 조회
- ProcessUnitStatusCurrent 페이지 조회
- 실적 배치 입력
- Projection LOT 단위 재계산
- 재고 이동 동시 요청

개발 DB나 실제 운영 DB를 테스트에 자동으로 사용하지 않는다. 테스트 Connection String은 별도 이름과 차단 검사를 둔다.

## 21. Windows Server 배포

~~~
Windows Server
├─ IIS 또는 ASP.NET Core Hosting
│  └─ MesPlatform.Server
└─ Windows Service
   └─ MesPlatform.Worker
~~~

환경별 설정은 다음처럼 분리한다.

~~~
appsettings.json
appsettings.Development.json
appsettings.Staging.json
appsettings.Production.json
~~~

Connection String과 JWT Secret은 소스에 저장하지 않는다. Worker가 API와 동일한 DB를 사용할 때도 역할별 설정과 실행 권한을 분리한다.

배포 전 확인:

- DB 대상 이름
- Plant 범위
- Worker 활성화 여부
- Projection 처리 여부
- 로그 저장 위치
- SignalR 연결 주소
- SQL CommandTimeout
- 운영 DB 차단 규칙

## 22. 구축 순서

### Phase 1. 솔루션과 공통 기반

- 솔루션과 프로젝트 생성
- 프로젝트 참조 방향 고정
- 공통 Result와 Problem Details
- OperationContext
- 인증·권한 코드
- Dapper Connection/Transaction 기반
- 구조화 로그와 Trace

### Phase 2. 생산 수직 기능

- WorkOrder 생성·조회·상태변경
- ProductionLot 연결
- WorkOrderProcess 조회
- Command/Query 테스트
- API 계약 생성

### Phase 3. 설비 실적

- EquipmentLogRaw 입력
- Worker Claim
- ProcessResult 단건·배치 등록
- Measurement·Defect 저장
- ProductionResultSummary 갱신
- Idempotency

### Phase 4. Projection

> 첫 수직 슬라이스 범위(BE-08): 계산기 seam(`IProcessUnitStatusCalculator`), 검증용 deterministic calculator, Queue→Upsert→Version→이벤트 흐름까지. `ProcessResult` 기반 실제 계산과 TVF 재계산은 원본 테이블이 생긴 뒤 후속 티켓으로 둔다.

- ProcessStatusRefreshQueue 연동
- ProcessUnitStatusCurrent 조회
- Projection Worker
- TVF 재계산
- SignalR 무효화 알림
- 1-2·4-6·4-7·7-3 공통 Query 전환

### Phase 5. 재고·품질·추적성

- InventoryOperation
- MaterialRelease와 MaterialInput 연결
- 검사 결과
- OQC와 포장 후보
- LOT 추적 화면
- 역상쇄·취소 처리

### Phase 6. 벤치마크와 배포 템플릿

- 100만 건 성능 데이터 준비
- Query 실행 계획 검증
- Worker 장애·재시도 검증
- Windows Service 배포
- 신규 사업용 설정 템플릿
- 운영 점검 문서

## 23. 최종 결정

다음 MES 백엔드는 다음 원칙을 기준으로 구현한다.

1. 하나의 솔루션 안에 Server, Worker, Domain, Application, Infrastructure, Contracts를 둔다.
2. 실제 실행 프로그램은 Server와 Worker로 분리한다.
3. 범용 Library, 범용 CRUD Controller, 범용 Stored Procedure Endpoint를 만들지 않는다.
4. Application은 Use Case 중심의 Command/Query Handler를 제공한다.
5. Infrastructure는 Dapper와 SQL Server Adapter를 제공한다.
6. C#과 SQL Server의 업무 이름은 WorkOrder, WorkOrderId처럼 일치시킨다.
7. 생산·재고·품질 변경은 OperationId와 AuditLog로 연결한다.
8. 1-2·4-6·4-7·7-3은 ProcessUnitStatusCurrent Projection을 읽는다.
9. TVF는 Projection 생성·검증·복구 용도로만 사용한다.
10. API와 Worker는 동일한 Application 업무 규칙을 공유하되 실행 프로세스는 분리한다.

이 문서는 새 레포의 백엔드 설계 기준이며, 실제 코드 생성 전에 프로젝트별 구현 계획과 세부 계약을 별도로 작성한다.

## 24. 미결 계약 결정 항목

구현 전에 이 문서에 확정 내용을 기록한다. 확정 전에는 프론트엔드가 해당 동작을 추측해 구현하지 않는다.

### 24.1 인증 계약 (refresh·logout·cookie)

provisional login·session(§15.3)은 이미 확정되어 있으므로 이 항목에 포함하지 않는다.

- refresh·logout endpoint와 요청·응답 형식
- refresh cookie의 이름, Path, Domain, SameSite 값, 만료
- rotation과 재사용 감지 시 동작(세션 전체 폐기 여부)
- CORS와 cookie를 함께 쓰는 배포 구성(동일 origin 여부)
- login 응답에 refresh cookie를 설정하는 변경(additive)의 표현

### 24.2 WorkOrder 상태 전이

- WorkOrder 상태 목록
- 허용 상태 전이표
- 첫 번째 UI에서 노출할 전이
- 전이 실패(422)와 동시성 충돌(409)의 오류 `code`와 `args`
- `ChangeWorkOrderStatus` Command의 요청 형식(`expectedVersion`, `reason` 필요 여부)

위 두 항목(§24.1, §24.2)이 확정되기 전에는 프론트엔드가 silent refresh와 WorkOrder 상태 변경 UI를 구현하지 않는다. §24.3(BE-12)은 DB-02와 BE-08 착수 전에 확정한다.

### 24.3 Projection 변경 알림 전달 (BE-12)

확정(BE-12, 2026-10-07): §13.4의 Transactional Outbox와 §13.4.1의 전달 정책(설정값, claim, 시나리오별 동작, 관측성, 배포 제약)을 따른다. 결정 기록은 `docs/decisions/2026-10-07-be-12-projection-change-notification-transport.md`다.
