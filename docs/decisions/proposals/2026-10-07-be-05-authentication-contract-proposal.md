# BE-05 제안: refresh·logout·cookie·rotation·CORS 정책

작성일: 2026-10-07
상태: **제안(미확정)** — 보안에 영향을 주는 결정이므로 사용자 확인 후 BE-05(#3)에서 확정한다. 확정 전에는 CON-02, BE-11, FE-13을 시작하지 않는다.
전제: 임시(provisional) login·session 계약(`contracts/openapi.yaml`)은 이미 확정되어 있고 이 제안은 그것을 깨지 않고 추가한다.

## 제안

| 항목 | 제안 |
|---|---|
| access token | JWT, 수명 15분, 응답 본문으로 전달, 프론트는 메모리에만 보관(확정 방향) |
| refresh token | 서버가 만든 무작위 256비트 값. DB에는 해시(SHA-256)만 저장한다 |
| cookie | 이름 `__Host-mes_refresh`, `HttpOnly; Secure; SameSite=Strict; Path=/`(`__Host-` 접두 규칙상 Domain 없음, Path `/`). 만료 = 절대 수명 |
| 수명 | 유휴(idle) 8시간, 절대 12시간(교대 근무 1회 기준). 값은 설정(`Auth:Refresh:*`) |
| endpoint | `POST /api/v1/auth/refresh`(본문 없음, cookie만으로 access token 재발급), `POST /api/v1/auth/logout`(refresh 폐기 + cookie 삭제) |
| login 응답 | 기존 본문은 그대로 두고 `Set-Cookie`로 refresh cookie만 추가(추가형 변경) |
| rotation | refresh 호출마다 새 refresh token을 발급하고 이전 것은 즉시 사용 불가로 한다. 같은 `FamilyId`로 묶는다 |
| 재사용 감지 | 이미 사용된(회전된) token이 다시 오면 그 `FamilyId` 전체를 폐기하고 401 `REFRESH_TOKEN_REUSED`를 반환한다. 사용자는 다시 로그인한다 |
| 동시 요청 | 같은 token으로 짧은 시간(5초) 안에 두 번 오면 첫 결과를 재사용하는 유예(grace)를 둘지 결정이 필요하다. 제안: 두지 않는다(프론트가 refresh를 한 번만 호출하도록 보장) |
| CSRF | `SameSite=Strict`에 더해 refresh·logout은 `Origin` 헤더가 허용 목록에 있어야 한다 |
| CORS | 동일 origin 배포(프론트 정적 파일과 `/api`, `/hubs`를 같은 origin에서 서비스)를 권장한다. 이 경우 CORS가 필요 없다. 다른 origin이면 허용 origin 목록 + `AllowCredentials`만 허용하고 `*`는 쓰지 않는다 |
| 저장소 | `dbo.RefreshToken(RefreshTokenId, FamilyId, UserId, TokenHash, IssuedAt, ExpiresAt, UsedAt, RevokedAt, ReplacedByTokenId, ClientIp)` — DB 스키마 티켓에서 추가 |
| 로그 | token 값은 로그에 남기지 않는다. `FamilyId`·`UserId`·사유 코드만 기록 |

## 확인이 필요한 결정

1. **HTTPS 가능 여부:** `Secure` cookie는 HTTPS에서만 동작한다. 공장 내부망에서도 TLS(사설 인증서 포함)를 쓸 수 있는가? 쓸 수 없으면 `__Host-`/`Secure`를 포기해야 하므로 보안 수준이 바뀐다.
2. **동일 origin 배포 가능 여부:** 프론트 정적 파일과 API를 같은 호스트에서 서비스할 수 있는가(IIS/Kestrel 역방향 프록시)?
3. 수명(유휴 8시간 / 절대 12시간)이 교대 근무와 맞는가.
4. 재사용 감지 시 family 전체 폐기가 현장 운영(공용 PC, 다중 탭)에서 지나치게 엄격하지 않은가.
5. 로그아웃 시 같은 사용자의 모든 family를 폐기할지(전체 로그아웃) 현재 기기만 폐기할지.

## 확정 시 갱신할 곳

`docs/specs/backend/…backend-design.md` §15.3·§24.1, `contracts/openapi.yaml`(CON-02), BE-11, FE-13.
