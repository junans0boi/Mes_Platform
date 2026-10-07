---
id: CON-01
title: "공유 API 계약 초안: openapi.yaml과 실시간 이벤트 계약"
type: feature
labels: feature, contract, gate:foundation
depends_on: 없음
status: done
gate: foundation
epic: "#1"
epic_url: https://github.com/junans0boi/Mes_Platform/issues/1
issue: "#2"
issue_url: https://github.com/junans0boi/Mes_Platform/issues/2
depends_on_issues: 없음
---

# CON-01: 공유 API 계약 초안: openapi.yaml과 실시간 이벤트 계약

상태: 선행 완료 시 착수 가능  /  선행: 없음  /  Gate: foundation

## 목적

프론트·백엔드·DB가 같은 API를 만들도록 공유 계약의 단일 원본을 먼저 확정한다. 이 계약보다 먼저 독립적으로 구현된 API는 허용하지 않는다.

## 범위

- `contracts/openapi.yaml`: 공통 envelope `{data, meta:{requestId, operationId}}`, Problem Details(`code,args,errors[{field,code,args}],requestId,operationId,traceId`), cursor page(`items,nextCursor,hasMore,asOf`), `CURSOR_SORT_MISMATCH`
- 임시(provisional) 인증 계약(backend design §15.3): `POST /api/v1/auth/login`(access token만 반환), `GET /api/v1/auth/session`(user, `allowedPlantIds`, capabilities). refresh·logout·cookie는 포함하지 않으며 BE-05 결정 후 CON-02가 추가형(additive)로 추가
- `GET /api/v1/production/work-orders`: 필터, 허용 sort 목록, cursor, `limit` 상한 200, `plantId` query parameter 필수, 작업지시번호 검색은 접두 일치 `workOrderNumberPrefix`만(부분 일치 `%q%` 없음), sort 키와 tie-breaker 방향·null 정렬 규칙
- `GET /api/v1/production/work-orders/{workOrderId}`: `rowVersion` 포함(`type: string, format: byte` Base64, 불투명 값, 8바이트 SQL `rowversion`의 직렬화). `status`는 string이며 허용 값·전이를 계약에 하드코딩하지 않음(BE-06 전까지)
- `GET /api/v1/monitoring/process-unit-status`: cursor, sort, `plantId`; `?ids=` 일괄 조회(상한 100); 행에 `plantId`, `projectionVersion`; 응답 `asOf`. 허용 sort `lastUpdatedAt`·`lastProcessAt`·`finalResult`는 database design의 index 대응표와 일치
- `contracts/realtime-events.md`: `ProjectionChangedEvent{projection:"processUnitStatus", plantId, changedIds, reset?, asOf}`와 규칙(`reset=true`이면 `changedIds` 미사용·Query invalidate, version 미포함, 전달은 at-least-once이며 중복·순서 뒤바뀜을 클라이언트가 `projectionVersion`으로 병합)
- `projectionVersion`은 JSON 정수(number)로 확정한다. 값은 1 이상 9007199254740991(2^53-1) 이하이며 DB `ProjectionVersionSeq`가 `MAXVALUE 9007199254740991 NO CYCLE`로 상한을 보장한다(SQL bigint 결정은 유지). 모든 int64 값은 같은 안전 정수 범위 안이다
- `required`/`nullable` 규칙: nullable 필드도 키는 항상 존재하고 값만 null이다. `ProcessUnitStatusRow`의 `isInProgress`, `isScrapped`, `processSkip`, `scrapCount`는 NOT NULL(기본 false/0), `finalResult`·`lastProcessAt`·`lastProcessCode`·`productModelId`는 nullable이며 null은 "아직 없음"이다
- Hub 경로 `/hubs/projections`, `SubscribePlant`, `UnsubscribePlant`, 이벤트 `ProjectionChanged`를 backend design §13.3과 frontend design §12에서 추적할 수 있게 한다
- 리뷰 기록은 `contracts/REVIEW.md`에 둔다. 실제로 리뷰하지 않은 사람은 소유자로 기록하지 않는다
- 계약 변경 규칙: FE·BE 소유자 모두 리뷰, 변경은 이 파일 PR이 구현보다 먼저

## 제외 범위

- ChangeWorkOrderStatus, refresh·logout (CON-02)
- WorkOrder 등록·수정·삭제 경로
- 구현 코드, 타입 생성(FE-02), 서버 OpenAPI 비교(FE-14)

## 관련 API/계약

`contracts/openapi.yaml`, `contracts/realtime-events.md`, docs/specs/frontend/2026-10-07-mes-platform-frontend-design.md §8, §12, docs/specs/backend/2026-10-07-mes-platform-backend-design.md §9, §13.3, §17.1

## 관련 화면/모듈

`contracts/` (저장소 루트). 소비: FE-02, FE-06, FE-08, BE-02, BE-03, BE-07, BE-08, DB-01

## 완료 조건

- [ ] `contracts/openapi.yaml`이 YAML과 OpenAPI 3 구조로 유효하다(생성기 또는 린터로 확인)
- [ ] 모든 목록 응답이 envelope 안에 `data.items`를 가진다
- [ ] `plantId`가 모든 해당 경로에 명시 parameter이고 헤더 정의가 없다
- [ ] WorkOrder `status`에 enum·전이 정의가 없다
- [ ] 작업지시번호 검색 parameter가 `workOrderNumberPrefix`(접두 일치)뿐이고 부분 일치 parameter가 없다
- [ ] 허용 sort와 필터마다 대응하는 index가 database design(§4.2 WorkOrder, §4.8 ProcessUnitStatusCurrent)에 있다
- [ ] `projectionVersion`이 JSON 정수이고 최대 2^53-1이 문서화되며 DB sequence 상한과 일치한다
- [ ] 모든 nullable 필드가 `required`에 들어 있고 `isInProgress`·`isScrapped`·`processSkip`·`scrapCount`가 non-null이다
- [ ] `rowVersion`이 Base64 문자열로 정의되고 `projectionVersion`(integer, int64)과 다른 이름·타입이다
- [ ] `ProjectionChangedEvent`가 프론트 설계 §12, 백엔드 설계 §13.3과 필드까지 동일하다
- [ ] FE와 BE 소유자가 리뷰한 기록이 `contracts/REVIEW.md`에 있다 (현재 미충족: 리뷰 대기)

## 테스트 방법

YAML·OpenAPI 유효성 검사, 세 문서와 계약의 필드 대조 리뷰

## 완료 증거

계약 파일 링크, 리뷰 기록, 필드 대조 결과
