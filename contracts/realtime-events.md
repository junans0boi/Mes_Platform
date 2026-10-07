# 실시간 이벤트 계약 (SignalR)

상태: CON-01 초안
정본: 이 문서가 SignalR 이벤트의 단일 원본이다. 프론트엔드 설계 §12, 백엔드 설계 §13.3·§13.4와 같아야 하며, 다르면 이 문서를 먼저 고친다.

## 원칙

- 이벤트는 **무효화 알림**이다. 행 데이터와 version을 싣지 않는다. 데이터의 권위는 API 응답이다.
- 전달은 **at-least-once**다. 같은 이벤트가 다시 올 수 있고, 순서가 뒤바뀔 수 있으며, 유실될 수 있다.
- 클라이언트는 `changedIds`를 모아 `GET /api/v1/monitoring/process-unit-status?ids=...&plantId=...`로 일괄 재조회하고, 응답 행의 `projectionVersion`이 캐시의 같은 행보다 **클 때만** 교체한다. 같거나 낮으면 버린다. 이벤트 자체의 version 비교는 하지 않는다.
- 유실·재연결에 대비해 클라이언트는 제한된 fallback refresh를 한다(프론트엔드 설계 §12).

## 연결

| 항목 | 값 |
|---|---|
| Hub 경로 | `/hubs/projections` |
| 인증 | access token. SignalR 표준대로 WebSocket 연결에서는 `access_token` query로 전달한다 |
| 구독 단위 | Plant. 서버는 `allowedPlantIds`와 대조하며 허용되지 않은 Plant 구독은 거부한다 |

서버 → 클라이언트 이벤트 이름: `ProjectionChanged`

클라이언트 → 서버 메서드:

| 메서드 | 인자 | 설명 |
|---|---|---|
| `SubscribePlant` | `plantId: number` | 해당 Plant의 `ProjectionChanged`를 받기 시작한다. 허용되지 않으면 오류 |
| `UnsubscribePlant` | `plantId: number` | 구독을 해제한다. 화면이 unmount되면 반드시 호출한다 |

## 이벤트 payload

```ts
type ProjectionChangedEvent = {
  projection: "processUnitStatus";
  plantId: number;
  changedIds: number[];
  reset?: boolean;
  asOf: string;
};
```

| 필드 | 설명 |
|---|---|
| `projection` | 변경된 Projection 이름. 현재 `processUnitStatus`만 정의한다 |
| `plantId` | `ProcessUnitStatusCurrent.PlantId` 값 |
| `changedIds` | `ProcessUnitStatusId` 목록. `reset=true`이면 빈 배열이며 클라이언트는 사용하지 않는다 |
| `reset` | `true`이면 `changedIds`를 사용하지 않고 해당 Query를 invalidate한다. 변경 행이 너무 많거나 범위를 특정할 수 없을 때 서버가 보낸다 |
| `asOf` | Projection 기준 시각(UTC, ISO 8601) |

## 숫자 형식

- `plantId`, `changedIds`의 값은 JSON 정수(number)이며 9007199254740991(2^53-1) 이하다(`contracts/openapi.yaml`의 int64 규칙과 같다).
- 이벤트에는 `projectionVersion`이 없다. 행의 `projectionVersion`은 API 응답에서만 오고, 같은 상한(2^53-1) 이하의 JSON 정수다. 브라우저 `number` 비교로 정확하며 BigInt는 필요하지 않다.

## 추적 문서

| 계약 항목 | 이 문서 | backend design | frontend design |
|---|---|---|---|
| Hub 경로 `/hubs/projections` | 연결 | §13.3 | §12 |
| `SubscribePlant`, `UnsubscribePlant` | 연결 | §13.3 | §12 |
| 이벤트 `ProjectionChanged`, 타입 `ProjectionChangedEvent` | 이벤트 payload | §13.3 | §12 |
| 클라이언트 병합 규칙(`projectionVersion` 비교) | 클라이언트 처리 규칙 | §13.3 | §12 |
| 전달 보장(at-least-once), Outbox | 서버 구현 계약 | §13.4 | §12 |

## 클라이언트 처리 규칙

1. `reset=true`: 해당 `plantId`의 `process-unit-status` Query를 invalidate한다.
2. 그 외: `changedIds`를 짧은 시간 창(설정값, 기본 250ms) 안에서 모아 중복을 제거한다.
3. 모은 id를 최대 100개 단위로 나누어 `ids`로 일괄 재조회한다.
4. 재조회된 행은 `projectionVersion`이 캐시보다 클 때만 교체한다.
5. 캐시에 없는 id는 현재 목록 조건과 맞지 않을 수 있으므로 행을 추가하지 않고 필요하면 요약 Query만 무효화한다.

## 서버 구현 계약

- 서버는 Projection 행 Upsert, `ProjectionVersion` 기록, Outbox 기록을 같은 transaction에서 처리하고, Dispatcher가 Outbox를 claim해 이 이벤트를 발행한다(백엔드 설계 §13.4).
- `changedIds`가 서버 상한을 넘으면 `reset=true`와 빈 `changedIds`를 보낸다.
- 이벤트에 `projectionVersion`이나 행 데이터를 넣지 않는다.
