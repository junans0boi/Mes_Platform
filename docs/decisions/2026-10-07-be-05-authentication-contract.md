# BE-05 확정: 인증 계약 (refresh·logout·cookie·rotation·CORS)

작성일: 2026-10-07
상태: **확정** — 2026-10-07 JunHwanLee(FE·BE 소유자) 승인
이전 문서: `docs/decisions/proposals/2026-10-07-be-05-authentication-contract-proposal.md`
영향: CON-02, BE-11, FE-13 착수 가능

## 확정 내용

| 항목 | 결정값 |
|---|---|
| access token | JWT, 수명 **15분**, 응답 본문으로 전달. 클라이언트는 메모리에만 보관(localStorage 금지). |
| refresh token | 서버가 생성한 무작위 256비트 값. DB에는 SHA-256 해시만 저장한다. |
| cookie 이름 | `__Host-mes_refresh` |
| cookie 속성 | `HttpOnly; Secure; SameSite=Strict; Path=/`. `__Host-` 접두 규칙상 `Domain` 없음. |
| cookie 만료 | 절대 수명(절대 만료 시각을 `Expires` 속성으로 설정) |
| access token 수명 | 15분 |
| refresh token 유휴 수명 | 8시간 |
| refresh token 절대 수명 | 12시간 |
| 수명 설정 키 | `Auth:Refresh:IdleExpiryMinutes`, `Auth:Refresh:AbsoluteExpiryMinutes` |
| HTTPS | **필수**. 공장 내부망에서도 TLS(사설 인증서 포함)를 사용한다. 비 TLS 환경에서는 서버가 시작을 거부한다. |
| 배포 구성 | **동일 Origin 기본**. 프론트 정적 파일과 `/api`, `/hubs`를 같은 호스트·포트에서 서비스한다. 이 경우 CORS 설정이 불필요하다. |
| 다른 Origin | 명시적 allowlist(`Auth:Cors:AllowedOrigins`) + `AllowCredentials`만 허용. 와일드카드(`*`) 금지. |
| CSRF 방어 | `SameSite=Strict` + refresh·logout의 `Origin` 헤더를 allowlist와 대조. |
| endpoint | `POST /api/v1/auth/refresh` (본문 없음, cookie만으로 access token 재발급) |
| endpoint | `POST /api/v1/auth/logout` (refresh 폐기 + cookie 삭제, 현재 기기 세션만) |
| login 응답 변경 | 기존 응답 본문은 그대로 두고 `Set-Cookie`로 refresh cookie만 추가(additive). |
| rotation | refresh 호출마다 새 token 발급, 이전 token 즉시 무효화. 같은 `FamilyId`로 묶는다. |
| 재사용 감지 | 이미 사용된 token이 다시 오면 해당 `FamilyId` 전체 폐기 + 401 `REFRESH_TOKEN_REUSED`. |
| 동시 refresh grace | **두지 않는다**. 프론트가 refresh를 한 번만 호출함을 보장한다(FE-13). |
| logout 범위 | **현재 기기(세션)만** 폐기한다. 전체 family 폐기는 재사용 감지 때만 한다. |
| 저장소 테이블 | `dbo.RefreshToken(RefreshTokenId, FamilyId, UserId, TokenHash, IssuedAt, ExpiresAt, UsedAt, RevokedAt, ReplacedByTokenId, ClientIp)` |
| 로그 정책 | token 값·cookie 값은 로그에 남기지 않는다. `FamilyId`, `UserId`, 사유 코드만 기록. |

## 오류 코드

| 코드 | HTTP | 설명 |
|---|---|---|
| `REFRESH_TOKEN_MISSING` | 401 | refresh cookie 없음 |
| `REFRESH_TOKEN_INVALID` | 401 | 형식 오류·존재하지 않는 token |
| `REFRESH_TOKEN_EXPIRED` | 401 | 유휴 또는 절대 만료 |
| `REFRESH_TOKEN_REVOKED` | 401 | 명시적 폐기(logout 또는 감지) |
| `REFRESH_TOKEN_REUSED` | 401 | rotation 위반 — family 전체 폐기 |

## CON-02 입력

CON-01 임시 계약에 추가형으로 다음을 확장한다.

- `POST /api/v1/auth/refresh` 추가
- `POST /api/v1/auth/logout` 추가
- `POST /api/v1/auth/login` 응답에 `Set-Cookie` 동작 기술(본문 스키마 변경 없음)
- 위 오류 코드 스키마 추가

## 갱신 대상

- [x] 이 문서
- [ ] `docs/specs/backend/…backend-design.md` §15.3·§24.1 — 확정 내용으로 교체
- [ ] `contracts/openapi.yaml` — CON-02에서 추가형 확장
- [ ] BE-11, FE-13 티켓 — 선행 조건 충족으로 상태 갱신
