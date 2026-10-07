import createClient, { type Middleware } from 'openapi-fetch';
import { mapProblemResponse, mapTransportError, type ApiError } from './ApiError';
import type { paths } from './generated/schema';

export const REQUEST_ID_HEADER = 'X-Request-Id';

export interface HttpClientOptions {
  baseUrl?: string;
  // 메모리에 있는 access token. 없으면 Authorization 헤더를 보내지 않는다.
  getAccessToken?: () => string | null;
  // 테스트에서 교체한다. 기본은 전역 fetch.
  fetch?: typeof globalThis.fetch;
  createRequestId?: () => string;
  // 401을 받았을 때 한 번씩 호출한다(공통 처리). 로그인 요청 자체의 401(자격 증명 오류)은 제외한다.
  onUnauthorized?: (error: ApiError) => void;
}

const LOGIN_PATH = '/api/v1/auth/login';

function defaultRequestId(): string {
  // 서버는 X-Request-Id를 Guid로 해석한다.
  return crypto.randomUUID();
}

// 모든 요청에 requestId를 붙이고, 오류를 ApiError로 바꾸는 middleware.
// plantId는 호출자가 query로 명시한다. 여기서 헤더·query로 몰래 주입하지 않는다.
export function createApiMiddleware(options: HttpClientOptions = {}): Middleware {
  const createRequestId = options.createRequestId ?? defaultRequestId;
  return {
    onRequest({ request }) {
      request.headers.set(REQUEST_ID_HEADER, createRequestId());
      const token = options.getAccessToken?.();
      if (token) request.headers.set('Authorization', `Bearer ${token}`);
      return request;
    },
    async onResponse({ request, response }) {
      if (response.ok) return undefined;
      const requestId = response.headers.get(REQUEST_ID_HEADER) ?? request.headers.get(REQUEST_ID_HEADER);
      let body: unknown;
      try {
        body = await response.clone().json();
      } catch {
        body = undefined;
      }
      const error = mapProblemResponse(response.status, body, requestId);
      if (response.status === 401 && new URL(request.url).pathname !== LOGIN_PATH) {
        options.onUnauthorized?.(error);
      }
      throw error;
    },
    onError({ request, error }) {
      return mapTransportError(error, request.headers.get(REQUEST_ID_HEADER));
    },
  };
}

// feature가 쓰는 typed client. 성공은 { data }, 실패는 ApiError를 throw한다(TanStack Query의 error로 그대로 전달).
// 호출 예: client.GET('/api/v1/production/work-orders', { params: { query: { plantId } }, signal })
export function createHttpClient(options: HttpClientOptions = {}) {
  const client = createClient<paths>({
    baseUrl: options.baseUrl ?? '',
    // 전역 fetch는 호출 시점에 읽는다. 모듈 로드 시점에 붙잡으면 나중에 fetch를 감싸는 도구(MSW 등)가 적용되지 않는다.
    fetch: options.fetch ?? ((...args: Parameters<typeof globalThis.fetch>) => globalThis.fetch(...args)),
  });
  client.use(createApiMiddleware(options));
  return client;
}

export type HttpClient = ReturnType<typeof createHttpClient>;
