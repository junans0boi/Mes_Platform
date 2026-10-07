---
id: CON-02
title: "공유 계약 추가: ChangeWorkOrderStatus와 인증 refresh"
type: feature
labels: feature, contract, deferred
depends_on: BE-05, BE-06
status: blocked
gate: deferred
epic: "#1"
epic_url: https://github.com/junans0boi/Mes_Platform/issues/1
issue: "#6"
issue_url: https://github.com/junans0boi/Mes_Platform/issues/6
depends_on_issues: #3, #4
---

# CON-02: 공유 계약 추가: ChangeWorkOrderStatus와 인증 refresh

상태: 차단됨 (보류(Deferred))  /  선행: BE-05, BE-06  /  Gate: deferred

## 목적

BE-05, BE-06에서 확정된 내용을 공유 계약에 반영해 BE-10, BE-11, FE-12, FE-13이 같은 계약을 쓰게 한다.

## 범위

- `ChangeWorkOrderStatus` 요청·응답·오류 `code/args`, `expectedVersion`(상세의 `rowVersion`과 같은 Base64 문자열), `Idempotency-Key`, 불일치 시 409, 허용 전이는 BE-06이 확정한 값만 문서화
- refresh·logout 요청·응답, cookie 관련 문서(BE-05 결정). CON-01의 임시(provisional) login·session은 변경하지 않고 추가형(additive)로만 확장한다. 기존 필드 변경이 필요하면 FE·BE 합의 기록을 남긴다
- `WORK_ORDER_*` 오류 코드와 409·422 응답

## 제외 범위

- 구현
- BE-05, BE-06이 정하지 않은 값의 추가

## 관련 API/계약

`contracts/openapi.yaml`, docs/specs/backend/2026-10-07-mes-platform-backend-design.md §15.3, §24

## 관련 화면/모듈

`contracts/`

## 완료 조건

- [ ] BE-06의 상태 전이표와 계약이 일치한다(전이값은 BE-06 문서에서만 가져온다)
- [ ] BE-05의 인증 계약과 계약 파일이 일치한다
- [ ] FE·BE 소유자 리뷰 기록이 있다

## 테스트 방법

계약 유효성 검사, 결정 문서와 대조 리뷰

## 완료 증거

계약 diff 링크, 리뷰 기록

## 차단 조건

BE-05(인증 계약)와 BE-06(상태 전이표)이 확정된 뒤. 보류.
