import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '@/test/mswServer';
import { contractOperations, sampleProblem, sampleSuccessBody } from '@/test/contractMock';
import { ApiError } from './ApiError';
import { createHttpClient, REQUEST_ID_HEADER } from './httpClient';

const baseUrl = 'http://mes.test';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

function captureRequests() {
  const seen: Request[] = [];
  server.events.on('request:start', ({ request }) => seen.push(request.clone()));
  return seen;
}

async function catchError(promise: Promise<unknown>): Promise<ApiError> {
  try {
    await promise;
  } catch (error) {
    expect(error).toBeInstanceOf(ApiError);
    return error as ApiError;
  }
  throw new Error('expected the request to fail');
}

describe('createHttpClient', () => {
  it('계약 샘플 응답을 envelope 그대로 반환한다', async () => {
    const client = createHttpClient({ baseUrl });
    const { data } = await client.GET('/api/v1/production/work-orders', {
      params: { query: { plantId: 1 } },
    });
    expect(data?.data.items[0]?.workOrderNumber).toBe('string');
    expect(data?.meta.requestId).toBeTruthy();
  });

  it('요청마다 서로 다른 UUID requestId를 X-Request-Id로 보낸다', async () => {
    const seen = captureRequests();
    const client = createHttpClient({ baseUrl });
    await client.GET('/api/v1/auth/session');
    await client.GET('/api/v1/auth/session');
    const ids = seen.map((r) => r.headers.get(REQUEST_ID_HEADER));
    expect(ids).toHaveLength(2);
    for (const id of ids) expect(id).toMatch(UUID);
    expect(ids[0]).not.toBe(ids[1]);
  });

  it('access token이 있을 때만 Authorization을 붙인다', async () => {
    const seen = captureRequests();
    let token: string | null = null;
    const client = createHttpClient({ baseUrl, getAccessToken: () => token });
    await client.GET('/api/v1/auth/session');
    token = 'abc';
    await client.GET('/api/v1/auth/session');
    expect(seen[0]?.headers.get('Authorization')).toBeNull();
    expect(seen[1]?.headers.get('Authorization')).toBe('Bearer abc');
  });

  it('plantId를 주입하지 않는다: 호출자가 준 query만 전송하고 Plant 헤더가 없다', async () => {
    const seen = captureRequests();
    const client = createHttpClient({ baseUrl, getAccessToken: () => 'abc' });
    // 계약상 plantId는 필수다. 타입을 우회해 누락 시 client가 대신 채우지 않음을 확인한다.
    await client.GET('/api/v1/production/work-orders', { params: { query: {} as { plantId: number } } });
    await client.GET('/api/v1/production/work-orders', { params: { query: { plantId: 7 } } });
    expect(new URL(seen[0]!.url).searchParams.has('plantId')).toBe(false);
    expect(new URL(seen[1]!.url).searchParams.get('plantId')).toBe('7');
    for (const request of seen) {
      for (const name of request.headers.keys()) expect(name).not.toMatch(/plant/i);
    }
  });

  it.each([
    [400, 'badRequest', 'CURSOR_SORT_MISMATCH'],
    [401, 'unauthorized', 'UNAUTHORIZED'],
    [403, 'forbidden', 'PLANT_NOT_ALLOWED'],
    [404, 'notFound', 'WORK_ORDER_NOT_FOUND'],
  ] as const)('%i 응답을 %s ApiError로 바꾼다', async (status, kind, code) => {
    server.use(
      http.get('*/api/v1/production/work-orders', () =>
        HttpResponse.json(sampleProblem(status, { code, args: { plantId: 9 } }), {
          status,
          headers: { 'content-type': 'application/problem+json' },
        }),
      ),
    );
    const client = createHttpClient({ baseUrl });
    const error = await catchError(
      client.GET('/api/v1/production/work-orders', { params: { query: { plantId: 9 } } }),
    );
    expect(error.kind).toBe(kind);
    expect(error.status).toBe(status);
    expect(error.code).toBe(code);
    expect(error.args).toEqual({ plantId: 9 });
    expect(error.requestId).toBeTruthy();
  });

  it('409와 422는 code·args·errors[]를 보존한다', async () => {
    server.use(
      http.put('*/api/v1/production/work-orders/:id/status', () =>
        HttpResponse.json(
          sampleProblem(422, {
            code: 'WORK_ORDER_STATUS_TRANSITION_NOT_ALLOWED',
            args: { currentStatus: 'COMPLETED', targetStatus: 'READY' },
            errors: [{ field: 'targetStatus', code: 'NotAllowed', args: { x: 1 } }],
          }),
          { status: 422 },
        ),
      ),
    );
    const client = createHttpClient({ baseUrl });
    const error = await catchError(
      client.PUT('/api/v1/production/work-orders/{workOrderId}/status', {
        params: { path: { workOrderId: 1 } },
        body: { plantId: 1, targetStatus: 'READY', expectedVersion: 'AAAAAAAAB9E=' },
      }),
    );
    expect(error.kind).toBe('unprocessable');
    expect(error.args).toEqual({ currentStatus: 'COMPLETED', targetStatus: 'READY' });
    expect(error.errors).toEqual([{ field: 'targetStatus', code: 'NotAllowed', args: { x: 1 } }]);

    server.use(
      http.put('*/api/v1/production/work-orders/:id/status', () =>
        HttpResponse.json(sampleProblem(409, { code: 'WORK_ORDER_VERSION_CONFLICT' }), { status: 409 }),
      ),
    );
    const conflict = await catchError(
      client.PUT('/api/v1/production/work-orders/{workOrderId}/status', {
        params: { path: { workOrderId: 1 } },
        body: { plantId: 1, targetStatus: 'READY', expectedVersion: 'AAAAAAAAB9E=' },
      }),
    );
    expect(conflict.kind).toBe('conflict');
  });

  it('응답 헤더의 requestId를 body보다 먼저 쓰지 않고, body가 없으면 헤더 값을 쓴다', async () => {
    server.use(
      http.get('*/api/v1/auth/session', () =>
        HttpResponse.text('<html>Bad Gateway</html>', {
          status: 502,
          headers: { [REQUEST_ID_HEADER]: 'req-from-server' },
        }),
      ),
    );
    const error = await catchError(createHttpClient({ baseUrl }).GET('/api/v1/auth/session'));
    expect(error.kind).toBe('server');
    expect(error.code).toBe('UNEXPECTED_RESPONSE');
    expect(error.requestId).toBe('req-from-server');
  });

  it('네트워크 오류는 network이며 보낸 requestId를 유지한다', async () => {
    const seen = captureRequests();
    server.use(http.get('*/api/v1/auth/session', () => HttpResponse.error()));
    const error = await catchError(createHttpClient({ baseUrl }).GET('/api/v1/auth/session'));
    expect(error.kind).toBe('network');
    expect(error.requestId).toBe(seen[0]?.headers.get(REQUEST_ID_HEADER));
  });

  it('AbortSignal로 취소하면 aborted다', async () => {
    server.use(
      http.get('*/api/v1/auth/session', async () => {
        await new Promise((resolve) => setTimeout(resolve, 200));
        return HttpResponse.json({});
      }),
    );
    const controller = new AbortController();
    const pending = createHttpClient({ baseUrl }).GET('/api/v1/auth/session', { signal: controller.signal });
    controller.abort();
    expect((await catchError(pending)).kind).toBe('aborted');
  });
});

describe('contract mock', () => {
  it('계약의 모든 operation에 handler가 있고 성공 본문이 envelope 규칙을 따른다', () => {
    const operations = contractOperations();
    expect(operations.map((o) => o.operationId).sort()).toEqual([
      'changeWorkOrderStatus',
      'getSession',
      'getWorkOrder',
      'listProcessUnitStatus',
      'listWorkOrders',
      'login',
      'logout',
      'refreshToken',
    ]);
    for (const operation of operations) {
      const body = sampleSuccessBody(operation.operationId);
      if (operation.successStatus === 204) expect(body).toBeUndefined();
      else expect(body).toMatchObject({ data: expect.anything(), meta: { requestId: expect.any(String) } });
    }
  });

  it('safe integer 상한을 넘는 id·projectionVersion을 만들지 않는다', () => {
    const body = sampleSuccessBody('listProcessUnitStatus') as {
      data: { items: { projectionVersion: number; processUnitStatusId: number }[] };
    };
    for (const row of body.data.items) {
      expect(Number.isSafeInteger(row.projectionVersion)).toBe(true);
      expect(row.processUnitStatusId).toBeGreaterThanOrEqual(1);
    }
  });
});
