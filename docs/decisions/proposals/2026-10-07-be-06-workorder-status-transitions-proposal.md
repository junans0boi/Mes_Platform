# BE-06 제안: WorkOrder 상태 목록과 상태 전이표

작성일: 2026-10-07
상태: **제안(미확정)** — 업무 담당자 확인 후 BE-06(#4)에서 확정한다. 확정 전에는 BE-10, CON-02, FE-12를 시작하지 않는다.
근거: Kdit 백엔드의 실제 구현(읽기 전용 참고)

## 근거 정정

이전 문서(`docs/maps/2026-10-07-wayfinder-repository-map.md` §5 등)는 "Kdit에서 WorkOrder 상태가 자유 문자열이라 전이표를 복원할 수 없다"고 적었다. 이는 **프론트엔드 모델**(`workOrder.ts`의 `status: string`)만 본 결과였다. 백엔드 `WorkOrderController`에는 상태 목록과 전이 규칙이 실제로 구현되어 있다. 아래는 그 복원 결과이다.

| 항목 | Kdit 위치 |
|---|---|
| 상태 목록 | `server/WebApplication_Server_Library/Controllers/WorkOrderController.cs` `CoreWorkOrderStatuses` (31~40행) |
| 전이 규칙 | 같은 파일 `CanTransitionWorkOrderStatus` |
| 전이 부수효과 | 같은 파일 `ApplyStatusTransition` (2431행~) |
| 상태 이름 정규화 | 같은 파일 `CanonicalizeStatus`: `CREATED→PLANNED`, `CANCELLED→CANCELED` |
| 변경 API | `PUT /api/WorkOrder/{id}/status` (`WorkOrderStatusChangeRequest{Status, Remark}`) |

## 복원한 상태와 전이

상태: `PLANNED`, `READY`, `IN_PROGRESS`, `COMPLETED`, `FINISHED`, `CANCELED`

| 현재 → 목표 | Kdit 허용 여부 |
|---|---|
| PLANNED → READY | 허용 |
| PLANNED → IN_PROGRESS | 허용 (4-6 일별 작업이 PLANNED로 LOT 카드를 만들고 바로 시작하기 때문) |
| READY → IN_PROGRESS | 허용 |
| IN_PROGRESS → COMPLETED | 허용 |
| COMPLETED → FINISHED | 허용 |
| PLANNED → CANCELED | 허용 |
| READY → CANCELED | 허용 |
| 같은 상태 → 같은 상태 | 허용(오류 없이 통과) |
| 그 밖의 모든 전이 | 거절 (`WorkOrderStatusTransitionNotAllowed`, args `currentStatus`, `targetStatus`) |

전이의 부수효과(Kdit):

- `IN_PROGRESS`: 실제 시작 일시를 지금으로 기록하고 종료 일시를 비운다. 진행 중이거나 대기 중인 첫 공정을 `IN_PROGRESS`로 바꾼다.
- `COMPLETED`: 실제 시작 일시가 비어 있으면 지금으로 채우고 실제 종료 일시를 지금으로 기록한다.
- `CANCELED`: 완료·건너뜀이 아닌 모든 공정을 `CANCELED`로 바꾸고 진행 중이던 공정의 종료 일시를 기록한다.
- 연결된 생산 LOT의 상태를 작업지시 상태와 같게 맞춘다.
- 요청의 비고(`Remark`)를 작업지시에 저장한다. 변경 이력 테이블은 없다.
- 직렬화 가능(Serializable) transaction 안에서 처리한다. 낙관적 동시성(version) 검사는 없다.

## 신규 플랫폼 제안

Kdit 동작을 기준선으로 삼고 PROJECT_RULES의 추적성·동시성 원칙에 맞게 다음을 제안한다. 각 항목에 **확인이 필요한 결정**을 표시했다.

| # | 제안 | 확인 필요 |
|---|---|---|
| 1 | 상태 값은 대문자 snake 코드(`PLANNED`, `READY`, `IN_PROGRESS`, `COMPLETED`, `FINISHED`, `CANCELED`)로 API·DB에 쓴다. Kdit의 별칭(`CREATED`, `CANCELLED`)은 새 시스템에서 받지 않는다 | 기존 데이터 이관 때 별칭 매핑이 필요한지 |
| 2 | 허용 전이는 위 표와 같다. 단, 같은 상태로의 전이는 **거절**한다(`WORK_ORDER_STATUS_UNCHANGED`, 422). 클라이언트 재시도는 `Idempotency-Key`가 처리한다 | Kdit는 같은 상태를 통과시켰다. 거절해도 되는지 |
| 3 | `COMPLETED`(생산 종료)와 `FINISHED`(마감 확정)를 구분해 유지한다. `FINISHED`로 가는 전이는 별도 권한 `Production.WorkOrder.Finish`를 요구한다 | 두 상태의 업무적 의미와 마감 권한 |
| 4 | 취소(`CANCELED`)와 `FINISHED`로의 전이는 사유(`reason`)를 필수로 한다(백엔드 설계: 수동 수정·취소에는 Reason 필요) | 사유가 필요한 전이의 범위 |
| 5 | `IN_PROGRESS → CANCELED`는 Kdit처럼 허용하지 않는다. 진행 중 취소는 후속 취소 정책이 생길 때 추가한다 | 현장에서 진행 중 취소 요구가 있는지 |
| 6 | 첫 UI에 노출할 전이는 작업 시작(`PLANNED`·`READY` → `IN_PROGRESS`)과 작업 완료(`IN_PROGRESS` → `COMPLETED`) 둘이다. 나머지(`READY`로 준비, 취소, 마감)는 후속 | 첫 노출 범위 |
| 7 | 변경 이력은 `dbo.WorkOrderStatusHistory`에 남긴다(이전·이후 상태, 사유, OperationId, 사용자, 시각) | — (DB 설계에 이미 있는 테이블) |
| 8 | 부수효과는 Kdit와 같다: 실제 시작·종료 일시, 공정 상태 연동, 연결 LOT 상태 동기화. 단 LOT 상태 동기화는 LOT 기능이 생기기 전까지 BE-10 범위에서 제외한다 | BE-10 범위(LOT 동기화 제외) |
| 9 | 낙관적 동시성은 `expectedVersion`(WorkOrder `rowVersion` Base64) 불일치 시 409 `WORK_ORDER_VERSION_CONFLICT`. 전이 위반은 422 `WORK_ORDER_STATUS_TRANSITION_NOT_ALLOWED`(args `currentStatus`, `targetStatus`). 알 수 없는 상태 값은 400/422 `WORK_ORDER_STATUS_INVALID` | 오류 코드 이름 |
| 10 | Command 요청 형식: `{ plantId, workOrderId, targetStatus, expectedVersion, reason? }`, `Idempotency-Key` 헤더 | — |

## 확정 시 갱신할 곳

`docs/specs/backend/…backend-design.md` §24.2, `contracts/openapi.yaml`(CON-02), 백엔드 계획서 Task 2의 임시 규칙 교체(BE-10), 저장소 맵 §5의 정정 문장.
