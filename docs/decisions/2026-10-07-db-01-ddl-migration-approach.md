# DB-01 결정: DDL 관리 방식 — 번호 순서 SQL 스크립트

작성일: 2026-10-07
상태: **확정**

## 결정

`database/migrations/` 아래 번호를 접두어로 하는 순서 있는 SQL 스크립트를 사용한다.
sqlproj(SQL Server Data Tools)는 선택하지 않는다.

## 근거

| 항목 | 순서 SQL 스크립트 | sqlproj(SSDT) |
|---|---|---|
| 크로스 플랫폼(macOS CI) | 가능(`sqlcmd`, `sqlpackage`) | 제한적 |
| EF Core 불필요 | 완전 독립 | 완전 독립 |
| 멱등 재적용 | 스크립트 작성자가 보장 | state-based diff로 처리 |
| 순서 보장 | 파일명 번호로 명시적 | SSDT 빌드가 처리 |
| 가시성 | diff가 plain SQL | .dacpac 바이너리 diff |
| CI 적용 | `sqlcmd` 단일 명령 | `SqlPackage.exe` + 게이트 |

## 규칙

- 파일명: `NNN_description.sql` (세 자리 번호)
- 각 스크립트는 처음부터 끝까지 재적용해도 안전해야 한다(`IF NOT EXISTS`, `CREATE OR ALTER`).
- 운영 DB는 수동 또는 별도 CI gate로 적용한다. 자동 적용 코드는 없다.
- 로컬·테스트 DB 적용은 `database/apply.sh`(Unix) / `database/apply.ps1`(Windows)가 담당한다.
- 환경 변수 `MES_DB_CONNECTION`이 없으면 적용 스크립트가 오류를 낸다.
- 연결 문자열에 운영 DB 호스트 패턴(`prod`, `.msmes.`, `10.0.0.`) 이 포함된 경우 적용을 거부한다.
