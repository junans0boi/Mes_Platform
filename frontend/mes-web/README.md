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

| 명령                   | 내용                                                               |
| ---------------------- | ------------------------------------------------------------------ |
| `npm run dev`          | 개발 서버 (`VITE_DEV_PROXY_TARGET`이 있으면 `/api`, `/hubs` proxy) |
| `npm run typecheck`    | TypeScript 검사                                                    |
| `npm run lint`         | ESLint                                                             |
| `npm run format:check` | Prettier 검사                                                      |
| `npm test`             | Vitest (jsdom, MSW)                                                |
| `npm run build`        | 타입 검사 후 프로덕션 빌드                                         |
| `npm run bundle:size`  | 빌드 후 JS gzip 크기 기록                                          |
| `npm run e2e`          | Playwright (Chromium, 1366×768)                                    |

## 디자인

시각 설계와 자체 검토 기록은 `docs/specs/frontend/2026-10-07-mes-web-visual-design-plan.md`를 따른다. 색·글꼴·밀도 값은 `src/app/theme/tokens.ts` 한 곳에서만 정의하고, 컴포넌트는 `theme.mes`의 의미 토큰만 참조한다.

## 현재 한계 (개발 중)

- `/dev/signals`, `/dev/density`는 FE-03 검증용 임시 화면이다. FE-06에서 실제 화면이 들어오면 제거한다.
- capability는 임시로 모두 허용한다(`platform/authorization/capabilities.ts`). FE-04가 세션 값으로 교체한다.

- 인증은 FE-04에서 구현한다. 토큰은 메모리에만 두므로 새로고침하면 다시 로그인해야 한다. silent refresh는 인증 계약(BE-05) 확정 후 FE-13에서 구현한다.
- API 계약(`contracts/openapi.yaml`)은 CON-01 티켓이 작성한다. 그 전에는 API 경로와 응답 타입을 프론트에서 만들지 않는다.
- MUI X DataGrid Premium 라이선스 키는 `.env.local`의 `VITE_MUIX_LICENSE_KEY`로만 주입한다.
