# Kdit frontend baseline

작성일: 2026-10-07
상태: 역공학 초안
참조 저장소: `/Volumes/WorkSpace/Project/Kdit`
참조 프론트엔드: `frontend/home/kdit-web`

## 1. 목적과 범위

이 문서는 Kdit MES 프론트엔드의 현재 동작 구조를 다음 MES 플랫폼의 설계 근거로 보존한다.

이 문서의 목적은 다음과 같다.

- 현재 화면이 어떤 방식으로 조립되는지 확인한다.
- API, 전역 상태, 그리드, 실시간 처리의 실제 경계를 확인한다.
- 다음 플랫폼에서 유지할 운영 경험과 교체할 구조를 구분한다.
- 새 기능을 설계할 때 Kdit의 동작을 추측하지 않도록 근거를 남긴다.

이 문서는 Kdit 코드를 수정하지 않는다. Kdit은 기준 프로젝트이며, `Mes_Platform`은 문제와 개선점을 반영한 신규 플랫폼이다.

## 2. 현재 기술 구성

`frontend/home/kdit-web/package.json` 기준으로 확인된 주요 구성은 다음과 같다.

| 영역 | 현재 구성 | 근거 |
|---|---|---|
| UI | React 19, MUI 7 | `package.json` dependencies |
| 데이터 그리드 | MUI X DataGrid Premium 8 | `package.json` dependencies |
| 라우팅 | React Router 7 | `package.json` dependencies |
| HTTP | Axios | `package.json` dependencies |
| 실시간 | `@microsoft/signalr` | `package.json` dependencies |
| 전역 상태 | Redux 5, react-redux 9 | `package.json`, `src/main.tsx:4,99` |
| 다국어 | i18next, react-i18next | `package.json`, `src/i18n.ts` |
| 화면 캐시 | react-activation | `package.json`, `src/App.tsx:6,140` |
| 차트 | MUI X Charts, Recharts | `package.json` dependencies |
| 테스트 도구 | Playwright | `package.json`, `playwright.config.ts` |

현재 의존성에는 TanStack Query, React Hook Form, Zod, OpenAPI 타입 생성 도구가 없다. 따라서 서버 상태, 입력 검증, API 계약이 페이지와 기존 공통 코드에 분산되어 있다.

## 3. 애플리케이션 진입 구조

```text
src/main.tsx
  ├─ Redux store 생성
  ├─ MUI ThemeProvider
  ├─ LocalizationProvider
  └─ App
       ├─ BrowserRouter
       ├─ AliveScope
       ├─ Routes
       └─ KeepAlive로 각 페이지 캐시
```

근거:

- `src/main.tsx:4`에서 `legacy_createStore`를 사용한다.
- `src/main.tsx:98-100`에서 Redux Provider로 App을 감싼다.
- `src/App.tsx:134` 이후에 모든 페이지 라우트가 한 파일에 선언된다.
- `src/App.tsx:140` 이후 다수의 Route가 개별 `KeepAlive`로 감싸져 있다.

현재 `App.tsx`는 1,359줄이며 시스템관리, 기준정보, 생산, 품질, 재고, 출하, 모니터링, 현황 페이지를 직접 import한다. 새 페이지를 추가할 때 라우팅 파일의 변경 범위가 커지고, 앱 초기 번들에 페이지 import가 연결될 가능성이 높다.

### 관찰된 장점

- URL 기반으로 업무 화면을 식별할 수 있다.
- 탭 전환 시 일부 페이지의 입력 상태를 유지할 수 있다.
- 기존 사용자는 업무 화면을 탭처럼 계속 열어둘 수 있다.

### 관찰된 문제

- 라우트 목록과 페이지 구현의 소유권이 분리되어 있지 않다.
- 모든 페이지를 App에 정적으로 import한다.
- 모든 페이지를 `KeepAlive`로 유지하는 것이 필요한지 화면별 기준이 없다.
- 서버 데이터 캐시와 화면 컴포넌트 캐시가 `KeepAlive`에 의존한다.
- 페이지 수가 늘어날수록 App 변경 충돌과 초기 번들 증가가 예상된다.

## 4. AppShell과 전역 UI

### 초기 부트스트랩

`src/pages/main/AppShell.tsx:34-60`에서 앱 시작 시 다음 작업을 순차적으로 수행한다.

1. 메뉴 조회
2. 로그인 사용자 조회
3. 사용자 언어 설정
4. i18n 언어 변경
5. 로딩 종료

`isLoading`이 끝날 때까지 Shell 전체가 렌더링되지 않는다(`AppShell.tsx:60`). 메뉴 또는 사용자 요청이 지연되면 사용자는 전체 화면을 볼 수 없다.

새 플랫폼에서는 Shell 골격을 먼저 보여주고, 사용자·권한·메뉴 상태를 영역별로 로딩한다. 초기 부트스트랩 실패도 전체 화면 공백이 아니라 재시도 가능한 상태로 표시한다.

### 네비게이션

`src/pages/main/AppNavigation.tsx`는 서버에서 내려온 메뉴 트리를 MUI TreeView로 렌더링한다.

- 메뉴 트리, 선택 상태, 확장 상태를 Redux와 조합한다.
- 상위 메뉴의 아이콘을 문자열과 메뉴 id에 따라 클라이언트에서 추론한다.
- 메뉴 이름과 아이콘 표현이 서버 데이터와 클라이언트 레지스트리에 나뉘어 있다.

유지할 점:

- 서버 권한에 따라 메뉴를 구성할 수 있는 점
- 메뉴에서 현재 업무 위치를 확인하는 점

개선할 점:

- 메뉴 표시와 라우트 등록을 기능 모듈의 route metadata로 연결한다.
- 권한은 메뉴 경로가 아니라 명시적인 capability code로 확인한다.
- 아이콘 fallback은 허용하되, 문자열 검색으로 업무 의미를 추론하지 않는다.

### 탭과 화면 보존

`src/pages/main/AppBar.tsx`와 `src/reducers/appbarReducer.ts`가 탭을 관리하고, `react-activation`이 화면 인스턴스를 유지한다.

현재 방식은 입력 중인 작업을 보존하는 데 유용하지만, 모든 화면 인스턴스를 살려두면 다음 비용이 있다.

- 숨겨진 페이지의 effect와 구독이 유지될 수 있다.
- 페이지별 polling과 SignalR 이벤트가 중복될 수 있다.
- 서버 데이터 최신성 판단이 화면 캐시와 API 응답 시점에 나뉜다.

새 플랫폼에서는 기본적으로 URL 상태와 서버 상태 캐시를 사용한다. 입력 중인 작업을 보존해야 하는 작업형 화면만 명시적으로 보존 대상으로 지정한다.

## 5. HTTP와 API 계약

### 현재 HTTP 경계

`src/services/dataHandlerBase.ts:14-148`에 Axios 인스턴스와 GET/POST/PUT/DELETE 래퍼가 있다.

- Axios 인스턴스가 singleton `DataHandler`에 의해 사용된다.
- `Authorization` 헤더는 요청 interceptor에서 주입된다.
- 요청 취소를 위한 `AbortSignal` 표준이 페이지 API에 드러나지 않는다.
- 공통 오류 처리는 로그 출력과 일부 URL 예외 처리 중심이다.

`src/services/dataHandler.ts:8-59`는 로그인 사용자와 메뉴 외에도 공통 요청 진입점 역할을 한다. 실제 업무 페이지는 이 객체의 `getRequest`, `postRequest`, `putRequest`, `deleteRequest`를 직접 호출한다.

### 현재 응답 계약

`src/models/apiResponse.ts:1-19`의 공통 응답은 다음 형태다.

```ts
interface ApiResponse<T> {
  success: boolean;
  message: string;
  code?: string;
  args?: Record<string, unknown>;
  payload: T | null;
  timestamp: string;
}
```

페이지가 `success`, `payload`, `message`를 직접 해석하는 방식이라, 화면마다 다음이 달라질 수 있다.

- 오류 메시지 처리
- 빈 결과 처리
- 페이지네이션 처리
- 서버 메시지 다국어 변환
- 요청 id와 작업 id 노출

새 플랫폼은 OpenAPI 계약을 기준으로 feature-owned query/command adapter를 둔다. 페이지는 원시 Axios 응답이나 URL을 직접 다루지 않는다.

## 6. 전역 상태와 서버 상태

`src/main.tsx:4`에서 legacy Redux store를 생성하고, 다음 reducer들이 전역 Provider에 연결되어 있다.

- appbar
- backdrop
- navigation
- notification
- settings
- snackbar
- user

현재 Redux에는 UI 상태와 서버에서 가져온 사용자·메뉴·알림 정보가 함께 존재한다. 화면별 업무 데이터는 주로 각 페이지의 `useState`에 저장된다.

새 플랫폼의 분리 기준은 다음으로 한다.

| 상태 | 소유 위치 |
|---|---|
| API 조회 결과, 캐시, 재조회 | TanStack Query 계층 |
| 검색 조건과 선택된 상세 id | URL/search params 또는 feature route state |
| 입력 중인 폼과 임시 편집 상태 | 해당 feature |
| 탭, 사이드바, 밀도, 알림 drawer | 작은 전역 UI store |
| 로그인 사용자와 capability | auth/session 계층 |

## 7. 공통 그리드

### BaseDataGrid2의 책임

`src/components/BaseDataGrid2/useBaseGrid2.tsx`는 989줄이며 다음 책임을 한 훅에 포함한다.

- 행 선택과 셀 선택
- 행 추가·수정·삭제
- 자동 저장
- Undo/Redo snapshot
- validation 상태
- aggregation 함수
- column autosize
- 사용자별 grid layout 복원
- export 연동
- snackbar 오류 처리
- 화면별 callback 호출

근거:

- 옵션 정의: `useBaseGrid2.tsx:36-114`
- 상태와 snapshot: `useBaseGrid2.tsx:116-175`
- 자동 저장: `useBaseGrid2.tsx:347-384`
- 공통 저장 처리: `useBaseGrid2.tsx:586-660`
- grid state 저장 callback 연결: `useBaseGrid2.tsx:946-950`

### 장점

- 화면을 만들 때 반복적인 DataGrid 설정을 줄였다.
- 선택·편집·export·밀도 같은 운영 기능이 일관되게 제공된다.
- 사용자가 열 순서와 너비를 조정할 수 있다.

### 문제

- 업무 Command와 그리드 편집 모델의 경계가 흐려진다.
- `any` 기반 callback과 범용 옵션이 증가했다.
- 자동 저장, API 호출, snackbar가 UI primitive에 결합되어 있다.
- 모든 화면이 같은 CRUD 모델을 사용한다고 가정하게 된다.
- 서버 cursor pagination이나 realtime row patch를 위한 전용 경계가 없다.

새 플랫폼은 다음처럼 책임을 나눈다.

```text
ServerDataGrid       서버 페이징·정렬·선택·가상화
GridToolbar          화면이 주입한 검색·명령 UI
GridPreference       열·밀도·표시 설정 저장
GridExport           서버 export job 또는 현재 결과 export
CommandBar           업무 Command 실행과 결과 표시
```

그리드가 WorkOrder 상태 변경, 품질 완료, 재고 불출 같은 업무 규칙을 직접 소유하지 않는다.

## 8. 검색 UI

`src/components/BaseSearchBar/BaseSearchBar.tsx`는 field type에 따라 select, checkbox, radio, textarea, number, month, date, time, search 등을 렌더링하는 설정 기반 컴포넌트다.

`BaseSearchBarHelpers.tsx`의 `createFkSearchItem`은 다음을 문자열 필드명으로 조립한다.

- entity key
- 다국어 field key
- API url
- query parameter name

이 방식은 빠르게 화면을 추가하는 데 유리하지만, 검색 조건의 타입과 서버 API 계약이 약해진다. 각 화면에서 `name` 문자열을 직접 비교하거나 `any` 값으로 변환하는 코드가 생길 수 있다.

새 플랫폼은 discriminated union 기반 검색 스키마를 사용한다. 검색 컴포넌트는 입력을 수집하고, feature query adapter가 API 요청 모델로 변환한다. 검색 조건은 URL에 직렬화할 수 있어야 한다.

## 9. 실제 페이지 크기와 결합도

현재 확인된 큰 화면은 다음과 같다.

| 페이지 | 줄 수 | 관찰 |
|---|---:|---|
| `MonitoringRealtimeProcessMonitoring.tsx` | 3,435 | 검색, 조회, polling/갱신, 편집 Command, QR 처리, grid가 한 파일에 결합 |
| `ShippingReturn.tsx` | 3,652 | 복합 검색, 선택, 반환·재고 업무, 다수의 피드백 처리 |
| `ProductionDailywork.tsx` | 2,233 | 생산 일자별 조회와 상태·계산·편집 로직 결합 |
| `ProductionPerformanceRegistration.tsx` | 1,869 | 작업지시 목록, 공정 상세, 실적 등록, 갱신 polling 결합 |
| `MonitoringEquipmentStatusRealtime.tsx` | 1,921 | 실시간 상태 조회와 화면 처리 결합 |
| `QualityPQC.tsx` | 489 | 일부 공통 품질 컴포넌트를 사용하지만 페이지가 API·상태·표현을 함께 소유 |

이 결과는 화면의 업무 복잡도가 낮다는 뜻이 아니다. 오히려 한 파일에 업무 규칙이 압축되어 있어 재사용 가능한 경계를 추출해야 한다는 뜻이다.

## 10. 실시간 처리

### 공통 알림

`src/hooks/useNotificationHub.ts:64-96`에서 SignalR notification hub에 연결하고, 15초 polling을 SignalR 보완으로 사용한다.

현재 흐름은 다음과 같다.

```text
AppShell
  ↓
useNotificationHub
  ├─ SignalR ReceiveNotification
  ├─ 목록 조회
  ├─ 미읽음 수 조회
  └─ 15초 polling
```

알림 자체에는 적합하지만, 업무 projection 갱신과 사용자 알림을 같은 전역 흐름으로 확장하면 화면별 invalidation 규칙이 모호해질 수 있다.

### 실시간 공정 모니터링

`MonitoringRealtimeProcessMonitoring.tsx`는 다음을 한 화면에서 처리한다.

- 공정 코드·모델·라인 필터
- 작업지시 조회
- 상태·요약 조회
- layout preference 저장
- 다수의 업무 POST Command
- 브라우저 animation frame과 timeout을 이용한 갱신 제어

근거: `MonitoringRealtimeProcessMonitoring.tsx:390`, `496-528`, `622-788`, `1666-2217`.

현재 방식은 화면별로 필요한 동작을 빠르게 추가할 수 있지만, 조회 기준 시각과 변경 순서가 화면 로직에 묻힌다.

새 플랫폼의 실시간 기준은 다음으로 한다.

```text
ProcessUnitStatusCurrent Query
        ↓
asOf와 projection version을 포함한 화면 모델
        ↓
SignalR 변경 이벤트
        ↓
변경 id 기준 cache patch 또는 query invalidation
        ↓
연결 실패 시 제한된 fallback refresh
```

전체 테이블을 SignalR로 보내지 않으며, 이벤트 순서가 뒤섞였을 때 오래된 version이 최신 행을 덮어쓰지 않게 한다.

## 11. 페이지별 API 호출과 갱신 사례

### 생산실적 등록

`ProductionPerformanceRegistration.tsx`에서 확인된 동작:

- 초기 기준정보를 `Promise.all`로 조회한다(`1039`).
- 작업지시·공정 데이터를 직접 `getRequest`로 조회한다(`1097`, `1201`).
- 등록은 `postRequest`, 수정은 `putRequest`로 처리한다(`1339`, `1428`).
- 저장 후 여러 목록을 다시 조회한다(`1367`, `1439`).
- `setInterval` 기반 갱신이 존재한다(`1509`).

개선 방향:

- Query key를 작업지시·공정·실적 단위로 정의한다.
- Command 성공 후 관련 query만 invalidate한다.
- 중복 저장을 idempotency key와 mutation 상태로 막는다.
- 화면 전체 재조회를 줄이고 변경된 projection만 갱신한다.

### PQC

`QualityPQC.tsx:213-215`에서 page data와 목록을 병렬로 조회하고, `337`에서 삭제 Command를 호출한다.

이 패턴은 Query composition의 후보가 된다. 다만 page data가 어느 범위까지 공통인지, 목록과 기준정보의 freshness가 같은지 명시해야 한다.

## 12. 현재 구조에서 유지할 것

- MUI X DataGrid Premium의 가상화·선택·export 경험
- 서버 메뉴와 capability에 따른 네비게이션
- 생산·품질 화면의 작업 중심 레이아웃
- SignalR 연결 재시도와 연결 실패 보완 조회
- 다국어 지원과 사용자별 화면 설정
- Playwright를 통한 브라우저 검증 기반
- QR·바코드 스캔과 인쇄 같은 현장 장치 흐름

## 13. 새 플랫폼에서 교체할 것

| 현재 구조 | 새 플랫폼 방향 |
|---|---|
| 하나의 거대한 `App.tsx` | lazy feature route registry |
| 모든 페이지 `KeepAlive` | URL/query cache + 화면별 선택적 state preservation |
| singleton 범용 `dataHandler` | typed HTTP client + feature query/command adapter |
| 공통 `ApiResponse` 직접 해석 | typed API envelope와 공통 error mapper |
| Redux에 UI와 서버 정보 혼합 | server state, URL state, local state, UI store 분리 |
| 989줄 범용 grid hook | ServerDataGrid와 업무 Command 분리 |
| 페이지별 `setInterval` | realtime coordinator와 projection invalidation |
| `any` 중심 검색 스키마 | 타입 있는 query schema와 URL serializer |
| 페이지별 fallback 문자열 | namespace 기반 다국어 리소스와 명시적 문구 |
| 브라우저 대량 export | 서버 export job과 진행상태 조회 |

## 14. 다음 설계에서 확정해야 할 질문

이 문서에서 관찰한 사실만으로 아직 결정할 수 없는 항목은 다음과 같다.

1. WorkOrder 목록의 최초 검색 조건과 cursor contract
2. WorkOrder 상세에서 어느 데이터를 drawer 최초 조회에 포함할지
3. `ProcessUnitStatusCurrent` 이벤트의 변경 id·version·asOf 계약
4. capability code와 route metadata의 최종 형태
5. 사용자별 grid preference를 로컬·서버 중 어디에 우선 저장할지
6. 서버 export job의 상태 조회와 파일 다운로드 계약
7. 스캔 작업 화면에서 tab 보존이 필요한 최소 범위

이 질문들은 `docs/specs/frontend/`의 상세 설계에서 결정하고, 결정 결과는 `docs/decisions/`에 남긴다.

## 15. 결론

Kdit 프론트엔드는 현장 업무를 빠르게 확장할 수 있는 공통 UI와 많은 업무 규칙을 이미 포함하고 있다. 주요 문제는 기능이 부족해서가 아니라, 페이지·API·전역 상태·그리드·실시간 갱신의 책임이 같은 파일과 범용 훅에 계속 모인다는 점이다.

따라서 `Mes_Platform` 프론트엔드는 Kdit 화면을 그대로 이식하지 않고, 다음 세 가지 경계를 먼저 세운다.

1. API 계약과 feature query/command
2. 서버 데이터 그리드와 작업 Command
3. projection 기반 realtime coordinator

이 문서를 근거로 `to-spec` 단계에서 AppShell, API client, WorkOrder vertical slice, ProcessUnitStatus realtime slice의 설계를 작성한다.
