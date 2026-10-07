# 공유 계약 리뷰 기록

대상: `contracts/openapi.yaml`, `contracts/realtime-events.md` (CON-01, Issue #2)
상태: **승인 완료** — FE·BE 소유자(JunHwanLee)가 2026-10-07에 리뷰·승인했다.

소유자가 직접 리뷰 기록을 채운 경우에만 CON-01의 완료 조건 "FE와 BE 소유자가 리뷰한 기록이 있다"를 충족한 것이다.

## 리뷰 기록

| 역할 | 리뷰어 | 날짜 | 결과 | 비고 |
|---|---|---|---|---|
| 프론트엔드 소유자 | JunHwanLee | 2026-10-07 | 승인 | 필드 이름·형식 적합. nullable 키 항상 존재 규칙 수용. projectionVersion JSON number(2^53-1 상한) 충분. workOrderNumberPrefix 접두 일치 범위 수용. ids 배열 파라미터 형태 수용. |
| 백엔드 소유자 | JunHwanLee | 2026-10-07 | 승인 | 필터·sort DB index 대응 구현 가능. ProjectionVersionSeq MAXVALUE 운영 정책 수용. NOT NULL 기본값 DB 보장 가능. Hub 경로·메서드·이벤트 이름 확정. 임시 login·session 형식 수용. |

## 작성 기록 (소유자 리뷰가 아님)

| 날짜 | 작성 | 내용 |
|---|---|---|
| 2026-10-07 | Claude Code (작성자) | 초안 작성. `openapi-typescript`로 파싱 확인 |
| 2026-10-07 | Claude Code (작성자) | 리뷰 전 보완 1차: `q` → `workOrderNumberPrefix`(접두 일치), `lastProcessAt` 등 허용 sort와 DB index 대응(database design §4.2·§4.8·§8), `projectionVersion`을 JSON 정수로 확정하고 2^53-1 상한 문서화·DB sequence `MAXVALUE` 반영, Row·Summary의 `required`/`nullable` 정리(nullable 키는 항상 존재), Hub 경로·메서드·이벤트 이름을 backend §13.3과 frontend §12에서 추적 가능하게 함 |

## 리뷰어가 확인할 점

프론트엔드 소유자:

- 필드 이름과 형식이 화면에서 쓰기 편한가 (`WorkOrderSummary`, `ProcessUnitStatusRow`)
- nullable 필드가 키는 항상 있고 값만 null이라는 규칙을 받아들일 수 있는가
- `projectionVersion` 정수(number) 전송과 2^53-1 상한으로 충분한가
- `workOrderNumberPrefix` 접두 일치만으로 검색 요구를 충족하는가
- `ids` 일괄 조회를 목록 경로의 parameter로 두는 형태

백엔드 소유자:

- 필터·sort 허용 목록이 database design §4.2·§4.8의 index 대응표로 구현 가능한가
- `ProjectionVersionSeq`의 `MAXVALUE 9007199254740991 NO CYCLE` 운영 정책
- 모든 NOT NULL 기본값(`goodQuantity`, `defectQuantity`, `isInProgress`, `isScrapped`, `processSkip`, `scrapCount`)을 DB에서 보장할 수 있는가
- Hub 경로·메서드·이벤트 이름(`/hubs/projections`, `SubscribePlant`, `UnsubscribePlant`, `ProjectionChanged`)
- 임시 login·session 형식(`allowedPlantIds`·`capabilities`를 session 조회로 제공)
