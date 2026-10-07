# mes-web

Mes Platform의 단일 React 웹 클라이언트. 설계는 `docs/specs/frontend/`를 따른다.

## 시작

```bash
cd frontend/mes-web
npm ci
cp .env.example .env.local   # 필요한 값만 채운다. .env.local은 커밋하지 않는다.
npm run dev
```

## 명령

| 명령                   | 내용                                                                       |
| ---------------------- | -------------------------------------------------------------------------- |
| `npm run dev`          | 개발 서버 (`VITE_DEV_PROXY_TARGET`이 있으면 `/api`, `/hubs` proxy)         |
| `npm run typecheck`    | TypeScript 검사                                                            |
| `npm run lint`         | ESLint                                                                     |
| `npm run format:check` | Prettier 검사                                                              |
| `npm test`             | Vitest (jsdom, MSW)                                                        |
| `npm run build`        | 타입 검사 후 프로덕션 빌드                                                 |
| `npm run bundle:size`  | 빌드 후 JS gzip 크기 기록                                                  |
| `npm run api:generate` | `contracts/openapi.yaml`에서 `src/platform/api/generated/schema.d.ts` 생성 |
| `npm run api:check`    | 생성물이 계약과 일치하는지 확인(drift 시 실패)                             |
| `npm run e2e`          | Playwright (Chromium, 1366×768)                                            |

## 디자인

시각 설계와 자체 검토 기록은 `docs/specs/frontend/2026-10-07-mes-web-visual-design-plan.md`를 따른다. 색·글꼴·밀도 값은 `src/app/theme/tokens.ts` 한 곳에서만 정의하고, 컴포넌트는 `theme.mes`의 의미 토큰만 참조한다.

## 현재 한계 (개발 중)

- `/dev/signals`, `/dev/density`는 FE-03 검증용 임시 화면이다. FE-06에서 실제 화면이 들어오면 제거한다.
- capability와 허용 Plant는 로그인 세션(`GET /api/v1/auth/session`) 값이다. 로그인하지 않았거나 Provider 밖에서는 아무것도 허용하지 않는다. 서버가 최종 검증한다.

- **새로고침하면 다시 로그인해야 한다(개발 중 한계).** access token은 JS 메모리(`platform/auth/tokenStore.ts`)에만 두고 storage·cookie에는 쓰지 않는다. silent refresh는 FE-13(BE-11 구현 후)에서 구현하며, 이 구조는 운영 최종안이 아니다.
- 401을 받으면 세션을 끝내고 현재 주소를 `returnTo`로 보존해 로그인으로 이동한다. 로그아웃은 메모리 token과 서버 상태 cache만 지운다(서버 로그아웃 호출은 FE-13 이후).
- Plant 이름은 아직 API가 없어 `Plant {id}`로 표시한다.
- API 계약(`contracts/openapi.yaml`)이 단일 원본이다. 경로와 응답 타입을 프론트에서 만들지 않고 `generated/`와 `platform/api/httpClient.ts`를 쓴다. 테스트 mock은 계약에서 생성한다(`src/test/contractMock.ts`).
- MUI X DataGrid Premium 라이선스 키는 `.env.local`의 `VITE_MUIX_LICENSE_KEY`로만 주입한다.
