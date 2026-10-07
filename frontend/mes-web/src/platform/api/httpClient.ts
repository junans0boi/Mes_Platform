import createClient, { type Middleware } from 'openapi-fetch';
import { mapProblemResponse, mapTransportError } from './ApiError';
import type { paths } from './generated/schema';

export const REQUEST_ID_HEADER = 'X-Request-Id';

export interface HttpClientOptions {
  baseUrl?: string;
  // 메모리에 있는 access token. 없으면 Authorization 헤더를 보내지 않는다.
  getAccessToken?: () => string | null;
  // 테스트에서 교체한다. 기본은 전역 fetch.
  fetch?: typeof globalThis.fetch;
  createRequestId?: () => string;
}

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
      throw mapProblemResponse(response.status, body, requestId);
    },
    onError({ request, error }) {
      return mapTransportError(error, request.headers.get(REQUEST_ID_HEADER));
    },
  };
}

// feature가 쓰는 typed client. 성공은 { data }, 실패는 ApiError를 throw한다(TanStack Query의 error로 그대로 전달).
// 호출 예: client.GET('/api/v1/production/work-orders', { params: { query: { plantId } }, signal })
export function createHttpClient(options: HttpClientOptions = {}) {
  const client = createClient<paths>({ baseUrl: options.baseUrl ?? '', fetch: options.fetch });
  client.use(createApiMiddleware(options));
  return client;
}

export type HttpClient = ReturnType<typeof createHttpClient>;
