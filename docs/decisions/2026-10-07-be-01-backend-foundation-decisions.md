# BE-01 백엔드 기반(solution, Domain, Application) 구현 결정

작성일: 2026-10-07
관련 티켓: BE-01 (#7), 계획 `docs/plans/backend/2026-10-07-mes-platform-backend-foundation-plan.md` Task 1~3

설계가 정하지 않은 저위험 구현 세부사항을 정한 기록이다. 각 항목은 되돌리는 비용이 작다.

| # | 결정 | 이유 |
|---|---|---|
| 1 | solution 파일은 `.slnx`가 아니라 `MesPlatform.sln`(`dotnet new sln --format sln`) | 계획과 설계가 `MesPlatform.sln`을 명시한다. |
| 2 | 경고를 오류로 보는 설정은 `src/Directory.Build.props`에만 둔다. 테스트 프로젝트는 제외한다 | 계획: "product projects". 테스트 공용 설정은 `tests/Directory.Build.props`가 가진다(IsTestProject, xUnit 참조). |
| 3 | 코드 스타일은 `.editorconfig`(file-scoped namespace 등)와 `EnforceCodeStyleInBuild`로 강제하고 IDE0005(미사용 using)는 켜지 않는다 | IDE0005는 `GenerateDocumentationFile`을 켜야 빌드에서 동작하며, 그러면 CS1591(공개 API 문서 누락)을 모두 억제해야 해서 이득보다 잡음이 크다. |
| 4 | `Directory.Packages.props`에는 이후 티켓이 쓸 패키지(Dapper, SqlClient, JWT, Serilog, OpenTelemetry, Mvc.Testing)의 버전도 미리 올린다. 참조는 쓰는 프로젝트에서만 한다 | 계획 Task 1 Step 3: 버전의 단일 위치. 참조하지 않은 PackageVersion은 복원에 영향이 없다. 버전은 2026-10-07 시점 nuget 안정 최신. |
| 5 | xUnit은 v2(2.9.3)를 쓴다 | `dotnet test` 호환이 가장 안정적이다. v3로 옮길 이유가 생기면 별도 결정. |
| 6 | Server·Worker의 `Program.cs`는 실행 파일이 되기 위한 최소 진입점만 둔다 | 호스트 구성은 BE-02(Server), BE-04(Worker)가 만든다. Worker는 일반 Host 패키지 없이 `return 0`이다. |
| 7 | Infrastructure·Api·Worker 테스트 프로젝트는 테스트 없이 만든다 | 계획이 프로젝트와 참조만 요구한다. 테스트는 해당 티켓이 추가한다. 빈 xUnit 프로젝트는 `dotnet test`를 실패시키지 않는다. |
| 8 | `OperationContext` 타입의 namespace는 `MesPlatform.Application.Common.Operations`(폴더는 계획대로 `Common/OperationContext/`) | 같은 이름의 namespace와 타입은 참조가 모호해진다. |
| 9 | cursor 형식 검증 규칙: 비어 있지 않으면 base64url 문자(`A-Za-z0-9_-`, 끝에 `=` 최대 2개), 길이 2048 이하. 공백만 있으면 첫 페이지로 본다 | 계약: cursor는 서버가 만든 불투명 문자열. 형식이 깨진 값은 DB 어댑터 호출 전에 `PAGING_CURSOR_INVALID`로 거절한다. 정렬 키 불일치(`CURSOR_SORT_MISMATCH`)는 cursor를 해석하는 각 Query의 책임이다. |
| 10 | `ApplicationError.Parameters`는 `IReadOnlyDictionary<string,string>`이고 API의 `args`로 매핑된다 | 계약의 `MessageArgs`(문구 치환 값)와 대응한다. |
| 11 | `Result`의 실패 팩토리는 `ApplicationError.None`을 거부한다. 실패 결과의 `Value` 접근은 예외다 | 실패를 성공으로 오해하는 버그를 일찍 드러낸다. |
| 12 | 로컬 작업은 `feat/mes-platform-foundation` 브랜치에서 하고 티켓 단위로 커밋한다 | 사용자가 로컬 commit을 허용했고, 저장소 기본 브랜치(`main`)에는 직접 커밋하지 않는다. push는 하지 않는다. |
| 13 | 계획의 `WorkOrderStatus`와 전이 규칙은 임시(provisional)이며 코드 주석과 테스트 이름에 그렇게 표시했다 | 승인된 상태 전이표는 BE-06이 확정한다. API·계약·프론트는 이 열거형에 의존하지 않는다. |
