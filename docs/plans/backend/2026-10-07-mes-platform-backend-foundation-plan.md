# MES Platform Backend Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Add to the Mes_Platform repository root with a buildable .NET 10 backend foundation, explicit project dependencies, safe API/Worker hosts, SQL Server/Dapper seams, operation tracing, and test gates.

**Architecture:** Use a feature-oriented modular monolith. MesPlatform.Server is the HTTP/SignalR executable, MesPlatform.Worker is the separate background executable, and Domain/Application/Infrastructure/Contracts are class libraries with one-way dependencies. The foundation intentionally stops before DB-backed WorkOrder and ProcessResult features; those are follow-up vertical-slice plans.

**Tech Stack:** .NET SDK 10.0.400, C# with net10.0, ASP.NET Core, Microsoft.Data.SqlClient, Dapper, JWT Bearer authentication, Serilog, OpenTelemetry, xUnit, and Microsoft.AspNetCore.Mvc.Testing.

**Spec:** ../../specs/backend/2026-10-07-mes-platform-backend-design.md

## Global Constraints

- Implementation root is the Mes_Platform repository root (/Volumes/WorkSpace/Project/Mes_Platform); MesPlatform.sln lives at the root and the frontend lives separately under frontend/mes-web. Do not place product code in the Kdit checkout.
- Existing root files (.gitignore, README.md, scripts/, .github/, docs/) are extended, not replaced. Keep `node scripts/agent-check.mjs` passing.
- Target framework is net10.0 and the repository SDK is pinned to 10.0.400.
- The only executable projects are MesPlatform.Server and MesPlatform.Worker.
- The allowed project dependency direction is Domain ← Application ← Infrastructure ← Server/Worker; Contracts has no project references.
- The new repository has no catch-all Library project, generic CRUD Controller, or generic Stored Procedure endpoint.
- C# and SQL Server business names use PascalCase such as WorkOrder and WorkOrderId; JSON uses camelCase only at the transport boundary.
- Core SQL access uses Microsoft.Data.SqlClient and Dapper; EF Core Change Tracking is not the data-access standard.
- API routes start with /api/v1 and use explicit Command/Query endpoints.
- 1-2, 4-6, 4-7, and 7-3 will later read ProcessUnitStatusCurrent; this foundation must expose the seam without implementing the Projection feature.
- TVF execution is reserved for Projection creation, reconciliation, backfill, and recovery; no foundation endpoint may execute a heavy TVF per request.
- Commands carry RequestId, OperationId, ActorUserId, PlantId, IdempotencyKey when applicable, and Reason for manual changes.
- Worker execution is disabled by default in development and must refuse explicitly blocked database targets.
- Tests must never silently connect to the current Kdit development or production database.
- Do not modify the Kdit checkout.
- Do not commit, push, create branches, or alter the Kdit repository history unless the user explicitly requests it.

## Review Focus

- Missing or invalid SQL configuration must make readiness fail without making liveness fail; pin this in Task 4 and Task 5 health tests.
- A request without authentication or without the required Permission Code must receive 401 or 403 rather than a successful business response; pin this in Task 6 tests.
- Invalid cursor limits and malformed cursors must be rejected before a database adapter is called; pin this in Task 3 tests.
- A Worker connected to a blocked database or started with processing disabled must perform no job work; pin this in Task 8 tests.
- A failed request must preserve RequestId and OperationId and return stable Problem Details without exposing SQL or stack-trace text; pin this in Task 5 and Task 7 tests.

---

## Scope and follow-up plans

This plan covers only the repository and backend foundation. It must produce a compiling, testable repository before any production feature is added.

The following plans are intentionally separate:

1. WorkOrder and ProductionLot vertical slice.
2. EquipmentLogRaw and ProcessResult ingestion, including batch TVP input.
3. ProcessUnitStatusCurrent Projection and refresh Worker.
4. InventoryOperation, material issue, return, transfer, and cancellation.
5. Quality, OQC, packaging, shipping, and traceability.
6. Million-row benchmark, Windows deployment, and operational hardening.

The DB design document remains the source of truth for table names and relationships. This plan creates the backend seams and repository structure; it does not invent a second database schema.

## Repository file map

The following files are created in the Mes_Platform repository root. Existing README.md, .gitignore, scripts/ and .github/ are extended, not replaced.

~~~
/Volumes/WorkSpace/Project/Mes_Platform/
├─ MesPlatform.sln
├─ global.json
├─ Directory.Build.props
├─ Directory.Packages.props
├─ .editorconfig
├─ .gitignore
├─ README.md
├─ src/
│  ├─ MesPlatform.Domain/
│  ├─ MesPlatform.Application/
│  ├─ MesPlatform.Infrastructure/
│  ├─ MesPlatform.Contracts/
│  ├─ MesPlatform.Server/
│  └─ MesPlatform.Worker/
├─ tests/
│  ├─ MesPlatform.Domain.Tests/
│  ├─ MesPlatform.Application.Tests/
│  ├─ MesPlatform.Infrastructure.Tests/
│  ├─ MesPlatform.Api.Tests/
│  ├─ MesPlatform.Worker.Tests/
│  └─ MesPlatform.Architecture.Tests/
├─ scripts/
│  └─ verify.ps1
└─ .github/
   └─ workflows/build.yml
~~~

## Task 1: Create the solution and enforce project boundaries

**Files:**

- Create: /Volumes/WorkSpace/Project/Mes_Platform/MesPlatform.sln
- Create: /Volumes/WorkSpace/Project/Mes_Platform/global.json
- Create: /Volumes/WorkSpace/Project/Mes_Platform/Directory.Build.props
- Create: /Volumes/WorkSpace/Project/Mes_Platform/Directory.Packages.props
- Create: /Volumes/WorkSpace/Project/Mes_Platform/.editorconfig
- Modify: /Volumes/WorkSpace/Project/Mes_Platform/.gitignore
- Modify: /Volumes/WorkSpace/Project/Mes_Platform/README.md
- Create: src/MesPlatform.Domain/MesPlatform.Domain.csproj
- Create: src/MesPlatform.Application/MesPlatform.Application.csproj
- Create: src/MesPlatform.Infrastructure/MesPlatform.Infrastructure.csproj
- Create: src/MesPlatform.Contracts/MesPlatform.Contracts.csproj
- Create: src/MesPlatform.Server/MesPlatform.Server.csproj
- Create: src/MesPlatform.Worker/MesPlatform.Worker.csproj
- Create: tests/MesPlatform.Domain.Tests/MesPlatform.Domain.Tests.csproj
- Create: tests/MesPlatform.Application.Tests/MesPlatform.Application.Tests.csproj
- Create: tests/MesPlatform.Infrastructure.Tests/MesPlatform.Infrastructure.Tests.csproj
- Create: tests/MesPlatform.Api.Tests/MesPlatform.Api.Tests.csproj
- Create: tests/MesPlatform.Worker.Tests/MesPlatform.Worker.Tests.csproj
- Create: tests/MesPlatform.Architecture.Tests/MesPlatform.Architecture.Tests.csproj

**Interfaces:**

- Produces a solution named MesPlatform.sln.
- Produces target framework net10.0 for every project.
- Produces these project references only:
  - Application → Domain
  - Infrastructure → Application and Domain
  - Server → Application, Infrastructure, and Contracts
  - Worker → Application and Infrastructure
  - Contracts → no project references
- Produces these test project references:
  - Domain.Tests → Domain
  - Application.Tests → Application and Domain
  - Infrastructure.Tests → Infrastructure, Application, and Domain
  - Api.Tests → Server, Contracts, Application, and Infrastructure
  - Worker.Tests → Worker, Application, and Infrastructure
  - Architecture.Tests → no product project references
- Produces central package version management; individual csproj files must not contain package versions.

- [ ] **Step 1: Create the repository directory and project files**

Generate the six source projects and six test projects. Remove template Class1 files immediately so no placeholder product files remain.

- [ ] **Step 2: Pin the SDK and compiler defaults**

Write global.json with SDK version 10.0.400 and latestFeature roll-forward. Write Directory.Build.props with net10.0, nullable enabled, implicit usings enabled, deterministic builds, and warnings treated as errors for product projects.

- [ ] **Step 3: Add the central package manifest**

Write Directory.Packages.props so Dapper, Microsoft.Data.SqlClient, JWT Bearer, Serilog, OpenTelemetry, xUnit, and MVC testing packages have one repository-owned version location. Do not add EF Core packages.

- [ ] **Step 4: Add project references and solution folders**

Add only the dependency edges listed in the Interfaces block. Place source projects under src and test projects under tests in the solution.

- [ ] **Step 5: Add repository policy files**

Write .editorconfig, .gitignore, and README.md. README.md must state that Server and Worker are separate processes, Worker is disabled by default in development, and the database connection must never point at a production DB during local tests.

- [ ] **Step 6: Verify the empty solution builds**

Run:

~~~
dotnet restore MesPlatform.sln
dotnet build MesPlatform.sln --configuration Release
~~~

Expected: restore and build succeed with exit code 0 and no package version warnings.

## Task 2: Implement Domain primitives and the first state-transition test

**Files:**

- Create: src/MesPlatform.Domain/Common/DomainError.cs
- Create: src/MesPlatform.Domain/Common/DomainException.cs
- Create: src/MesPlatform.Domain/Production/WorkOrders/WorkOrderStatus.cs
- Create: src/MesPlatform.Domain/Production/WorkOrders/WorkOrderStatusTransitions.cs
- Create: tests/MesPlatform.Domain.Tests/Production/WorkOrders/WorkOrderStatusTransitionsTests.cs

**Interfaces:**

- Produces `public sealed record DomainError(string Code, string MessageKey)`.
- Produces `public sealed class DomainException : Exception` with an Error property of type DomainError.
- Produces `public enum WorkOrderStatus { Planned, Ready, InProgress, Completed, Cancelled }`.
- Produces `public static bool CanTransition(WorkOrderStatus from, WorkOrderStatus to, out DomainError? error)`.
- PROVISIONAL: the transition rule below exists only to exercise the Domain test seam. It is NOT the approved WorkOrder state-transition table. The approved table is decision item 24.2 in the backend design; once decided, replace this rule and its tests. No API, OpenAPI contract, or frontend UI may depend on this provisional rule.
- The provisional rule is:
  - Planned → Ready
  - Ready → InProgress
  - InProgress → Completed
  - Planned → Cancelled
  - Ready → Cancelled
  - InProgress → Cancelled only when a later cancellation policy explicitly allows it; for this foundation test, return false with WORK_ORDER_STATUS_INVALID.
  - Same-state transitions return false with WORK_ORDER_STATUS_UNCHANGED.
  - All other transitions return false with WORK_ORDER_STATUS_INVALID.

- [ ] **Step 1: Write the failing transition tests**

Add tests named Planned_can_move_to_ready, Completed_cannot_move_back_to_in_progress, Same_status_is_rejected, and Unknown_transition_returns_stable_error_code. Assert both the boolean result and exact error code.

- [ ] **Step 2: Run the Domain tests and verify failure**

Run:

~~~
dotnet test tests/MesPlatform.Domain.Tests/MesPlatform.Domain.Tests.csproj --filter FullyQualifiedName~WorkOrderStatusTransitionsTests
~~~

Expected: FAIL because the status types and transition method do not exist.

- [ ] **Step 3: Implement the Domain primitives**

Implement DomainError, DomainException, WorkOrderStatus, and WorkOrderStatusTransitions without references to ASP.NET Core, Dapper, or SQL Server.

- [ ] **Step 4: Run the Domain tests and verify success**

Run the same command. Expected: all four tests PASS.

## Task 3: Implement Application results, pagination, handlers, and operation context

**Files:**

- Create: src/MesPlatform.Application/Common/Errors/ApplicationError.cs
- Create: src/MesPlatform.Application/Common/Results/Result.cs
- Create: src/MesPlatform.Application/Common/Results/ResultOfT.cs
- Create: src/MesPlatform.Application/Common/Pagination/CursorPageRequest.cs
- Create: src/MesPlatform.Application/Common/Pagination/CursorPage.cs
- Create: src/MesPlatform.Application/Common/OperationContext/OperationContext.cs
- Create: src/MesPlatform.Application/Common/OperationContext/IOperationContextAccessor.cs
- Create: src/MesPlatform.Application/Abstractions/Commands/ICommandHandler.cs
- Create: src/MesPlatform.Application/Abstractions/Queries/IQueryHandler.cs
- Create: src/MesPlatform.Application/Abstractions/Identity/ICurrentUser.cs
- Create: src/MesPlatform.Application/Abstractions/Identity/IPermissionChecker.cs
- Create: src/MesPlatform.Application/Abstractions/Persistence/ITransactionRunner.cs
- Create: src/MesPlatform.Application/Abstractions/Auditing/AuditEntry.cs
- Create: src/MesPlatform.Application/Abstractions/Auditing/IAuditWriter.cs
- Create: tests/MesPlatform.Application.Tests/Common/Pagination/CursorPageRequestTests.cs
- Create: tests/MesPlatform.Application.Tests/Common/Results/ResultTests.cs
- Create: tests/MesPlatform.Application.Tests/Common/OperationContext/OperationContextTests.cs

**Interfaces:**

- ApplicationError exposes Code, MessageKey, and read-only string parameters.
- Result exposes IsSuccess, Error, and factory methods Success() and Failure(ApplicationError error).
- Result<T> exposes IsSuccess, Value, Error, and factory methods Success(T value) and Failure(ApplicationError error).
- CursorPageRequest.Create(string? cursor, int? limit) returns Result<CursorPageRequest>.
- CursorPageRequest.Limit accepts 1 through 200 and defaults to 50.
- Invalid limits return PAGING_LIMIT_INVALID; malformed non-empty cursors return PAGING_CURSOR_INVALID.
- CursorPage<T> exposes IReadOnlyList<T> Items, string? NextCursor, bool HasMore, and DateTimeOffset AsOf.
- OperationContext exposes Guid RequestId, Guid OperationId, Guid CorrelationId, string? ActorUserId, long? PlantId, string? Endpoint, string? CommandName, string? Reason, and string? ClientIp.
- ITransactionRunner.ExecuteAsync<T>(Func<CancellationToken, Task<T>> operation, CancellationToken cancellationToken) is the Application transaction seam.
- IAuditWriter.WriteAsync(AuditEntry entry, CancellationToken cancellationToken) is the audit seam; its SQL implementation is deferred until the DB-backed vertical slice.
- AuditEntry.Create(Guid operationId, Guid requestId, string? actorUserId, string commandName, string entityType, long? entityId, string actionCode, string? reason, bool isSystemGenerated, DateTimeOffset createdAt) returns Result<AuditEntry>; a non-system entry with an empty reason returns AUDIT_REASON_REQUIRED.

- [ ] **Step 1: Write pagination and result tests**

Test the default limit of 50, accepted limit 200, rejected limit 0 and 201, malformed cursor rejection, successful result values, and failure result error preservation.

- [ ] **Step 2: Run the Application tests and verify failure**

Run:

~~~
dotnet test tests/MesPlatform.Application.Tests/MesPlatform.Application.Tests.csproj
~~~

Expected: FAIL because the result and pagination types do not exist.

- [ ] **Step 3: Implement Application common types**

Implement the result types, cursor request validation, CursorPage, OperationContext, and the small handler and adapter interfaces. Do not reference Infrastructure or Server.

- [ ] **Step 4: Add operation-context tests**

Assert that a created context preserves RequestId, OperationId, ActorUserId, PlantId, CommandName, Reason, and ClientIp without normalization that would lose values.

- [ ] **Step 5: Run the Application tests and verify success**

Run the same command. Expected: all tests PASS.

## Task 4: Implement the SQL Server and Dapper Infrastructure seam

**Files:**

- Create: src/MesPlatform.Infrastructure/Sql/DatabaseOptions.cs
- Create: src/MesPlatform.Infrastructure/Sql/SqlConnectionFactory.cs
- Create: src/MesPlatform.Infrastructure/Sql/SqlSession.cs
- Create: src/MesPlatform.Infrastructure/Sql/SqlTransactionRunner.cs
- Create: src/MesPlatform.Infrastructure/Sql/SqlErrorMapper.cs
- Create: src/MesPlatform.Infrastructure/Health/SqlServerHealthCheck.cs
- Create: src/MesPlatform.Infrastructure/DependencyInjection.cs
- Create: tests/MesPlatform.Infrastructure.Tests/Sql/SqlConnectionFactoryTests.cs
- Create: tests/MesPlatform.Infrastructure.Tests/Sql/SqlTransactionRunnerTests.cs
- Create: tests/MesPlatform.Infrastructure.Tests/Health/SqlServerHealthCheckTests.cs

**Interfaces:**

- Configuration section is Database.
- DatabaseOptions exposes ConnectionString, DefaultCommandTimeoutSeconds defaulting to 30, LongCommandTimeoutSeconds defaulting to 120, and ApplicationName defaulting to MesPlatform.
- SqlConnectionFactory.CreateOpenConnectionAsync(CancellationToken) returns an open SqlConnection.
- SqlSession is scoped and owns the connection and optional current transaction for one Application Command.
- SqlTransactionRunner implements Application.ITransactionRunner and commits on success, rolls back on exception or cancellation, and never creates nested independent transactions.
- SqlErrorMapper maps known SQL error numbers to ApplicationError codes and maps unknown SQL errors to DATABASE_OPERATION_FAILED without returning SQL text to clients.
- AddInfrastructure(IServiceCollection, IConfiguration) binds DatabaseOptions and registers Dapper, the connection factory, session, transaction runner, and health check.

- [ ] **Step 1: Write unit tests for options and transaction behavior**

Test that an empty connection string is rejected during service validation, command timeout defaults are 30 and 120, and the transaction runner calls rollback when the operation throws. Use a fake session boundary; do not connect to a real database in these unit tests.

- [ ] **Step 2: Run Infrastructure unit tests and verify failure**

Run:

~~~
dotnet test tests/MesPlatform.Infrastructure.Tests/MesPlatform.Infrastructure.Tests.csproj --filter FullyQualifiedName~Sql
~~~

Expected: FAIL because the SQL options and transaction types do not exist.

- [ ] **Step 3: Implement the connection factory and scoped session**

Use Microsoft.Data.SqlClient. Set ApplicationName from DatabaseOptions and apply the default command timeout through Dapper CommandDefinition creation helpers. Do not log the connection string.

- [ ] **Step 4: Implement the transaction runner**

Implement ExecuteAsync<T> so one scoped SqlSession owns the transaction. Commit only after the delegate completes successfully; rollback on any exception and rethrow a mapped application exception at the outer boundary.

- [ ] **Step 5: Implement SQL error mapping and health check**

Health check must open and close a connection with the configured timeout. It must return Unhealthy for an invalid connection string and must not include credentials in its description.

- [ ] **Step 6: Run unit tests and the explicit SQL integration test**

Run unit tests:

~~~
dotnet test tests/MesPlatform.Infrastructure.Tests/MesPlatform.Infrastructure.Tests.csproj
~~~

Run SQL integration tests only with an explicitly supplied test database:

~~~
$env:MES_TEST_CONNECTION_STRING="<dedicated test database>"
dotnet test tests/MesPlatform.Infrastructure.Tests/MesPlatform.Infrastructure.Tests.csproj --filter Category=SqlIntegration
~~~

Expected: unit tests pass. The integration test is marked Trait Category=SqlIntegration, must fail fast with a clear message when MES_TEST_CONNECTION_STRING is absent, and must never fall back to appsettings or the current Kdit database.

## Task 5: Build the Server host, API contracts, health endpoints, and Problem Details

**Files:**

- Create: src/MesPlatform.Contracts/Common/ApiMeta.cs
- Create: src/MesPlatform.Contracts/Common/ApiEnvelope.cs
- Create: src/MesPlatform.Contracts/Common/PageResponse.cs
- Create: src/MesPlatform.Server/Program.cs
- Create: src/MesPlatform.Server/Configuration/ServerServiceRegistration.cs
- Create: src/MesPlatform.Server/Middleware/RequestOperationContextMiddleware.cs
- Create: src/MesPlatform.Server/Errors/MesExceptionHandler.cs
- Create: src/MesPlatform.Server/Controllers/System/SystemController.cs
- Create: src/MesPlatform.Server/appsettings.json
- Create: src/MesPlatform.Server/appsettings.Development.example.json
- Create: tests/MesPlatform.Api.Tests/Host/HealthEndpointTests.cs
- Create: tests/MesPlatform.Api.Tests/Errors/MesExceptionHandlerTests.cs
- Create: tests/MesPlatform.Api.Tests/Host/ApiFactory.cs

**Interfaces:**

- ApiMeta exposes Guid RequestId, Guid? OperationId, and DateTimeOffset ServerTime.
- ApiEnvelope<T> exposes T Data and ApiMeta Meta.
- PageResponse<T> exposes IReadOnlyList<T> Items, string? NextCursor, bool HasMore, and DateTimeOffset AsOf. PageResponse<T> is the Data payload inside ApiEnvelope<T>; list responses are never returned without the envelope (backend design §9.3).
- GET /health/live is anonymous and checks only process liveness.
- GET /health/ready is anonymous and checks configured dependencies including SQL Server.
- GET /api/v1/system/info requires authentication and returns application name and version without secrets.
- RequestOperationContextMiddleware reads or creates X-Request-Id, creates X-Operation-Id for a request, stores OperationContext in the accessor, and returns both headers.
- MesExceptionHandler maps ApplicationError and DomainException to Problem Details with code, args, errors[{field, code, args}], requestId, and operationId (see backend design §17.1).
- The exception response must not contain SQL connection strings, SQL command text, or stack traces.

- [ ] **Step 1: Write host tests for liveness and readiness**

Test that live health returns 200 without a database connection and ready health returns a dependency failure when the SQL health check is unavailable. Use dependency injection replacement in ApiFactory so the test has no implicit DB access.

- [ ] **Step 2: Write exception-handler tests**

Test a known ApplicationError maps to the expected status and code, an unknown exception maps to 500 and UNEXPECTED_ERROR, and request/operation headers are included.

- [ ] **Step 3: Run API tests and verify failure**

Run:

~~~
dotnet test tests/MesPlatform.Api.Tests/MesPlatform.Api.Tests.csproj
~~~

Expected: FAIL because the host, contracts, middleware, and exception handler do not exist.

- [ ] **Step 4: Implement contracts and the Server composition root**

Configure controllers, JSON camelCase, Problem Details, health checks, OpenAPI metadata, Serilog, and Infrastructure registration in Program.cs. Do not add a generic base Controller.

- [ ] **Step 5: Implement operation middleware and error mapping**

Use the Application OperationContext accessor. Preserve a valid incoming X-Request-Id; generate a new GUID for an invalid or missing value. Always add response headers even when an exception is handled.

- [ ] **Step 6: Add system endpoints**

Implement only the live, ready, and authenticated system info endpoints. Do not add a database table CRUD endpoint as a smoke test.

- [ ] **Step 7: Run API tests and verify success**

Run the same API test command. Expected: all tests PASS.

## Task 6: Add JWT authentication and Permission Code authorization

**Files:**

- Create: src/MesPlatform.Application/Abstractions/Identity/CurrentUserSnapshot.cs
- Create: src/MesPlatform.Server/Authentication/JwtOptions.cs
- Create: src/MesPlatform.Server/Authorization/PermissionAttribute.cs
- Create: src/MesPlatform.Server/Authorization/PermissionPolicyProvider.cs
- Create: src/MesPlatform.Server/Authorization/PermissionAuthorizationHandler.cs
- Create: src/MesPlatform.Server/Authorization/CurrentUserAccessor.cs
- Modify: src/MesPlatform.Server/Configuration/ServerServiceRegistration.cs
- Modify: src/MesPlatform.Server/Controllers/System/SystemController.cs
- Create: tests/MesPlatform.Application.Tests/Identity/PermissionCodeTests.cs
- Create: tests/MesPlatform.Api.Tests/Authorization/PermissionAuthorizationTests.cs

**Interfaces:**

- PermissionAttribute accepts one stable code, for example Production.WorkOrder.Read, and produces policy name Permission:<code>.
- PermissionPolicyProvider parses only the Permission: prefix and rejects empty codes.
- PermissionAuthorizationHandler checks the authenticated user for a matching permission claim or permission snapshot.
- CurrentUserAccessor.GetRequired() returns CurrentUserSnapshot or throws AUTHENTICATION_REQUIRED.
- JWT configuration is under Authentication:Jwt; secrets are supplied through environment-specific configuration, never committed.
- Menu paths are not used by the authorization handler.

- [ ] **Step 1: Write authorization tests**

Test no token → 401, authenticated user without the required Permission Code → 403, and authenticated user with Production.WorkOrder.Read → allowed. Add a test proving a menu path claim does not satisfy a Permission Code requirement.

- [ ] **Step 2: Run authorization tests and verify failure**

Run:

~~~
dotnet test tests/MesPlatform.Api.Tests/MesPlatform.Api.Tests.csproj --filter FullyQualifiedName~Permission
~~~

Expected: FAIL because the dynamic policy and handler do not exist.

- [ ] **Step 3: Implement the JWT and Permission Code seam**

Configure JWT bearer authentication, the dynamic policy provider, the authorization handler, and CurrentUserAccessor. Keep system liveness and readiness endpoints anonymous.

- [ ] **Step 4: Protect system info and verify status codes**

Apply the Permission attribute to system info using System.Info.Read. Run the authorization tests and the complete API test suite. Expected: all tests PASS.

## Task 7: Add operation logging and the audit seam

**Files:**

- Create: src/MesPlatform.Infrastructure/Observability/OperationLogEnricher.cs
- Create: src/MesPlatform.Infrastructure/Observability/ObservabilityRegistration.cs
- Create: src/MesPlatform.Server/Middleware/ResponseOperationHeadersMiddleware.cs
- Modify: src/MesPlatform.Server/Program.cs
- Create: tests/MesPlatform.Api.Tests/Observability/OperationHeaderTests.cs
- Create: tests/MesPlatform.Application.Tests/Auditing/AuditEntryTests.cs

**Interfaces:**

- Serilog properties are TraceId, RequestId, OperationId, ActorUserId, PlantId, Endpoint, and UseCase.
- AuditEntry includes OperationId, RequestId, ActorUserId, CommandName, EntityType, EntityId, ActionCode, Reason, and created time.
- Foundation only defines and validates the audit seam. A SQL AuditLog writer is implemented with the first DB-backed Command so it can participate in the same transaction.
- Sensitive tokens, passwords, connection strings, and full ResultData are excluded from logs.

- [ ] **Step 1: Write operation-header and audit-entry tests**

Assert that a request returns X-Request-Id and X-Operation-Id, and that AuditEntry rejects a manual mutation without Reason while allowing a system-generated operation with a null Reason.

- [ ] **Step 2: Run observability tests and verify failure**

Run:

~~~
dotnet test tests/MesPlatform.Api.Tests/MesPlatform.Api.Tests.csproj --filter FullyQualifiedName~Operation
dotnet test tests/MesPlatform.Application.Tests/MesPlatform.Application.Tests.csproj --filter FullyQualifiedName~Audit
~~~

Expected: FAIL because the enricher, response middleware, and audit validation do not exist.

- [ ] **Step 3: Implement structured operation enrichment**

Read OperationContext from the accessor and push the stable properties into the logging scope. Redact sensitive values before serialization.

- [ ] **Step 4: Implement response headers and AuditEntry validation**

Ensure headers are present on successful and error responses. Keep the actual database writer out of this foundation task.

- [ ] **Step 5: Run the tests and verify success**

Run the two filtered commands and the full API/Application test projects. Expected: all tests PASS.

## Task 8: Create the safe Worker host

**Files:**

- Create: src/MesPlatform.Worker/Program.cs
- Create: src/MesPlatform.Worker/Configuration/WorkerOptions.cs
- Create: src/MesPlatform.Worker/Configuration/WorkerServiceRegistration.cs
- Create: src/MesPlatform.Worker/Safety/WorkerStartDecision.cs
- Create: src/MesPlatform.Worker/Safety/DatabaseSafetyGuard.cs
- Create: src/MesPlatform.Worker/Jobs/WorkerHeartbeatService.cs
- Create: tests/MesPlatform.Worker.Tests/Worker/DatabaseSafetyGuardTests.cs
- Create: tests/MesPlatform.Worker.Tests/Worker/WorkerHeartbeatServiceTests.cs

**Interfaces:**

- Worker options are under Worker.
- WorkerOptions.Enabled defaults to false for Development.
- WorkerOptions.ProcessRole must equal Worker before jobs can start.
- WorkerOptions.BlockedDatabaseNames is case-insensitive.
- DatabaseSafetyGuard.ValidateAsync(string databaseName, CancellationToken) returns WorkerStartDecision.
- A blocked database or disabled Worker returns Allowed=false with a stable reason code and starts no job.
- WorkerHeartbeatService is a no-op when disabled and emits structured heartbeat logs only when enabled.
- Worker references Application and Infrastructure, never Server.

- [ ] **Step 1: Write safety tests**

Test disabled Worker, wrong ProcessRole, blocked database with different casing, and allowed database. Assert the exact reason codes WORKER_DISABLED, WORKER_ROLE_INVALID, DATABASE_BLOCKED, and WORKER_ALLOWED.

- [ ] **Step 2: Run Worker tests and verify failure**

Run:

~~~
dotnet test tests/MesPlatform.Worker.Tests/MesPlatform.Worker.Tests.csproj --filter FullyQualifiedName~Worker
~~~

Expected: FAIL because the Worker options and safety guard do not exist.

- [ ] **Step 3: Implement Worker options and guard**

Bind configuration, validate the role, normalize database names case-insensitively, and stop startup before job registration when the guard rejects the target.

- [ ] **Step 4: Implement the Worker host and heartbeat**

Register only the heartbeat service in the foundation. Do not add EquipmentLogRaw, Projection, or inventory jobs before their dedicated plans.

- [ ] **Step 5: Run Worker tests and verify success**

Run the filtered Worker tests and execute the Worker with Worker:Enabled=false. Expected: process exits or idles without opening a database connection or starting a job.

## Task 9: Add architecture tests, verification script, and build workflow

**Files:**

- Create: tests/MesPlatform.Architecture.Tests/ProjectReferenceRulesTests.cs
- Create: scripts/verify.ps1
- Create: .github/workflows/build.yml
- Modify: README.md

**Interfaces:**

- Architecture test reads the six source csproj files and asserts the exact project-reference matrix from Task 1.
- scripts/verify.ps1 accepts an optional -Configuration parameter defaulting to Release and runs restore, build, format verification, and all tests.
- CI runs on Windows, uses SDK 10.0.400, and executes the same verification commands without a production connection string.
- README documents local setup, test database safety, API run command, Worker run command, and the six follow-up implementation plans.

- [ ] **Step 1: Write the project-reference architecture test**

Add assertions for allowed references and assertions that Domain, Contracts, and Application do not reference forbidden projects. The test must fail if a future developer adds Infrastructure to Application.

- [ ] **Step 2: Run the architecture test and verify failure**

Run:

~~~
dotnet test tests/MesPlatform.Architecture.Tests/MesPlatform.Architecture.Tests.csproj
~~~

Expected: FAIL until the csproj paths and project-reference matrix are implemented exactly.

- [ ] **Step 3: Implement the architecture test and verification script**

Use XML project parsing for the reference matrix so the test does not require loading product assemblies. Make scripts/verify.ps1 stop on the first failed command.

- [ ] **Step 4: Add the Windows CI workflow**

Use windows-latest, install SDK 10.0.400, restore without secrets, run format verification, build Release, and run all tests. Do not configure a connection string in CI.

- [ ] **Step 5: Run the complete foundation verification**

Run:

~~~
powershell -ExecutionPolicy Bypass -File scripts/verify.ps1
~~~

Expected: restore, format verification, Release build, architecture tests, unit tests, and API tests all pass. SQL integration tests are reported as not run unless MES_TEST_CONNECTION_STRING is explicitly supplied.

## Completion criteria

The foundation plan is complete when all of the following are true:

- MesPlatform.sln builds with .NET SDK 10.0.400 and net10.0.
- Project references match the declared dependency direction.
- Domain state-transition tests pass without infrastructure dependencies.
- Application result, cursor, and operation-context tests pass.
- SQL connection and transaction seams exist without EF Core.
- Liveness and readiness endpoints behave differently when SQL is unavailable.
- Problem Details responses contain stable code, RequestId, and OperationId and no sensitive SQL data.
- JWT Permission Code authorization returns 401, 403, and success correctly.
- Worker safety tests prove blocked databases and disabled execution perform no work.
- Verification script and Windows CI run without a production connection string.
- No product code is added to the existing Kdit server or frontend.

After this plan is reviewed and executed, create the WorkOrder vertical-slice plan before adding DB-backed production features.
