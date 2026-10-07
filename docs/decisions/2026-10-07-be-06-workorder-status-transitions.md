# BE-06 확정: WorkOrder 상태 목록과 상태 전이표

작성일: 2026-10-07
상태: **확정** — 2026-10-07 JunHwanLee(FE·BE 소유자) 승인
이전 문서: `docs/decisions/proposals/2026-10-07-be-06-workorder-status-transitions-proposal.md`
영향: CON-02, BE-10, FE-12 착수 가능

## 상태 목록

`PLANNED`, `READY`, `IN_PROGRESS`, `COMPLETED`, `FINISHED`, `CANCELED`

API와 DB 모두 대문자 snake 코드로 저장한다. Kdit 별칭(`CREATED`, `CANCELLED`)은 새 플랫폼에서 받지 않는다.

## 허용 전이표

| 현재 상태 | 목표 상태 | 허용 여부 | reason 필수 | 권한 |
|---|---|---|---|---|
| PLANNED | READY | 허용 | 아니오 | `Production.WorkOrder.ChangeStatus` |
| PLANNED | IN_PROGRESS | 허용 | 아니오 | `Production.WorkOrder.ChangeStatus` |
| PLANNED | CANCELED | 허용 | **예** | `Production.WorkOrder.ChangeStatus` |
| READY | IN_PROGRESS | 허용 | 아니오 | `Production.WorkOrder.ChangeStatus` |
| READY | CANCELED | 허용 | **예** | `Production.WorkOrder.ChangeStatus` |
| IN_PROGRESS | COMPLETED | 허용 | 아니오 | `Production.WorkOrder.ChangeStatus` |
| COMPLETED | FINISHED | 허용 | **예** | `Production.WorkOrder.Finish` |
| 같은 상태 → 같은 상태 | — | **멱등 성공** | — | — |
| 그 밖의 모든 전이 | — | 거절 422 | — | — |

`IN_PROGRESS → CANCELED`는 첫 범위에서 제외한다. 진행 중 취소 정책이 생기면 추가한다.

## 첫 UI 노출 전이

작업 시작(`PLANNED`·`READY` → `IN_PROGRESS`)과 작업 완료(`IN_PROGRESS` → `COMPLETED`)만 첫 UI에 노출한다.
나머지(READY 준비, CANCELED, FINISHED)는 후속 UI에서 추가한다.

## COMPLETED vs FINISHED 구분

- `COMPLETED`: 생산 작업이 끝난 상태. 현장 작업자 권한으로 전이 가능.
- `FINISHED`: 관리자·담당자가 내용을 확인하고 마감 확정한 상태. `Production.WorkOrder.Finish` 권한이 별도로 필요하고 reason 필수.

## 오류 코드

| 코드 | HTTP | args | 설명 |
|---|---|---|---|
| `WORK_ORDER_STATUS_TRANSITION_NOT_ALLOWED` | 422 | `currentStatus`, `targetStatus` | 허용되지 않은 전이 |
| `WORK_ORDER_STATUS_INVALID` | 400 | `value` | 알 수 없는 상태 값 |
| `WORK_ORDER_VERSION_CONFLICT` | 409 | `workOrderId` | expectedVersion 불일치 |
| `WORK_ORDER_REASON_REQUIRED` | 422 | `targetStatus` | reason 필수 전이에 reason 없음 |

## Command 요청 형식

```json
{
  "plantId": "string",
  "workOrderId": "string",
  "targetStatus": "IN_PROGRESS",
  "expectedVersion": "Base64 string (WorkOrder rowVersion)",
  "reason": "string (CANCELED·FINISHED·추후 reason 필수 전이에만 필수)"
}
```

헤더: `Idempotency-Key: <UUID>`

## 멱등 처리

같은 상태로의 전이 요청(예: 이미 `IN_PROGRESS`인데 `IN_PROGRESS` 요청)은 422 없이 성공으로 응답한다. 클라이언트 재시도는 `Idempotency-Key`가 처리한다.

## 동시성

`expectedVersion`(WorkOrder `rowVersion`의 Base64 인코딩 문자열)을 `WHERE RowVersion = @Expected`로 검사한다. 불일치 시 409 `WORK_ORDER_VERSION_CONFLICT`. 잘못된 Base64 형식은 400 `WORK_ORDER_STATUS_INVALID`.

## 부수효과 (BE-10 구현 범위)

- `IN_PROGRESS`: 실제 시작 일시를 현재 시각으로 기록. 종료 일시를 비운다. 공정 연동은 BE-10.
- `COMPLETED`: 실제 시작 일시가 비어 있으면 지금으로 채운다. 실제 종료 일시를 현재 시각으로 기록.
- `CANCELED`: 완료·건너뜀이 아닌 모든 공정을 CANCELED로 변경. 진행 중이던 공정 종료 일시 기록.
- LOT 상태 동기화는 LOT 기능이 생기기 전까지 BE-10 범위 제외.
- 변경 이력: `dbo.WorkOrderStatusHistory`(이전·이후 상태, reason, OperationId, 사용자, 시각).

## Domain 구현 지침

plan Task 2의 임시(provisional) `WorkOrderStatusTransitions.CanTransition` 규칙을 이 전이표로 교체한다. BE-10에서 수행한다.

## CON-02 입력

- `PUT /api/v1/production/work-orders/{workOrderId}/status` 추가
- 요청 스키마: `ChangeWorkOrderStatusRequest`
- 응답: 204 No Content(성공·멱등), 409, 422
- 오류 코드 스키마 추가

## 갱신 대상

- [x] 이 문서
- [ ] `docs/specs/backend/…backend-design.md` §24.2 — 확정 내용으로 교체
- [ ] `contracts/openapi.yaml` — CON-02에서 추가
- [ ] BE-10, FE-12 티켓 — 선행 조건 충족으로 상태 갱신
