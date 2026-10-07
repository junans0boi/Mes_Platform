# BE-12 Projection 변경 알림 전달 방식(transport) 결정

작성일: 2026-10-07
관련 티켓: BE-12 (#5). 소비 티켓: DB-02 (#21), BE-08 (#24)
상태: 확정

## 결정

**SQL Server Transactional Outbox**로 전달한다.

1. Worker는 Projection 행 Upsert, `ProjectionVersion` 기록, `dbo.ProjectionChangeOutbox` Insert, Queue 완료 처리를 **같은 transaction**에서 처리한다. Worker는 Server의 Hub를 직접 호출하지 않는다.
2. Server의 `ProjectionOutboxDispatcher`(hosted service)가 Outbox를 claim(lease)해 `IProjectionChangeNotifier`(SignalR 구현)로 발행한다.
3. 전달은 at-least-once다. 중복 발행과 순서 뒤바뀜을 허용하고 클라이언트가 `projectionVersion`으로 병합한다.
4. Server가 중단되어도 Outbox 행이 남아 이벤트가 유실되지 않는다.
5. 정책 값(lease, retry, backoff, 보관, 배치 크기, 설정 이름)과 시나리오별 동작은 backend design §13.4.1에 기록했다.
6. SignalR backplane은 다중 Server 확장 시의 후속 범위다.

## 검토한 대안

| 대안 | 채택하지 않은 이유 |
|---|---|
| Worker가 Server에 내부 HTTP 호출 | Server가 내려가면 이벤트가 유실되고, 재시도·순서·중복을 따로 만들어야 한다. Worker가 Server에 의존한다 |
| DB 변경 로그를 Server가 polling | Outbox와 같은 구조인데 변경 전용 표식이 없어 중복·누락 처리가 불분명하다 |
| SQL Service Broker | 운영 복잡도와 Windows/SQL Server 구성 의존이 크다. Dapper 중심 구조와 맞지 않는다 |
| SignalR Redis backplane | Server가 여러 인스턴스일 때 필요한 문제를 푸는 것이며 Worker→Server 전달 문제는 풀지 않는다. 후속 범위 |

## 스스로 정한 값(저위험, 설정으로 조정 가능)

| 항목 | 값 | 근거 |
|---|---|---|
| 대기 행 polling | 500ms | 설계 목표: Projection 반영 2초 이내, 이벤트 수신 후 화면 1초 이내. polling 지연이 목표를 잠식하지 않게 짧게 둔다 |
| lease | 30초 | 배치 100건 발행이 수 초 이내에 끝난다. 중단 후 30초 안에 복구되어 3초 목표는 정상 경로에만 적용한다 |
| 최대 시도 | 10회, backoff 2초~60초(±20%) | 일시 장애는 약 4~5분 안에 흡수하고, 오래 가면 `Failed`로 눈에 띄게 한다 |
| 보관 | 발행 완료 7일, `Failed` 30일 | 사고 분석에 충분하고 테이블이 커지지 않는다 |
| `MaxChangedIdsPerEvent` | 200 | 클라이언트 `ids` 재조회 상한(100)의 2배. 그 이상은 전체 무효화(reset)가 더 싸다 |
| 같은 Plant 행 합치기 | 하지 않음 | 단순성. 프론트가 250ms 창에서 id를 모으므로 필요성이 낮다. FE-11 측정 후 재검토 |
| `DispatcherEnabled` 기본값 | 개발 환경 false, Production true | 개발 환경이 운영 DB에서 이벤트를 가로채 `Published`로 표시하는 사고를 막는다. 차단된 DB 대상은 시작 거부 |
| Outbox `OperationId` 컬럼(NULL 허용) 추가 | 추가 | Worker 작업과 이벤트를 추적하기 위함(PROJECT_RULES의 추적성 원칙) |

## 영향

- DB-02: `ProjectionChangeOutbox`에 `OperationId` 추가. 정책 값은 DDL에 넣지 않고 설정으로 둔다.
- BE-08: Dispatcher의 claim·완료 표시 조건(`LeaseOwner` 일치)과 시나리오 테스트가 이 문서를 기준으로 한다.
- BE-04: 안전 실행 검사(차단 DB 거부, 기본 비활성)를 Dispatcher도 재사용한다.
- 배포: backplane 도입 전까지 Server 인스턴스는 하나다.
