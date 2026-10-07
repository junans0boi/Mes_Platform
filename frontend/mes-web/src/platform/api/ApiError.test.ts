import { describe, expect, it } from 'vitest';
import { ApiError, kindForStatus, mapProblemResponse, mapTransportError } from './ApiError';

const problem = {
  type: 'https://mes/errors/work-order-version-conflict',
  title: 'Work order version conflict',
  status: 409,
  code: 'WORK_ORDER_VERSION_CONFLICT',
  message: 'The work order was changed.',
  args: { workOrderId: 12 },
  errors: [{ field: 'expectedVersion', code: 'Stale', args: { a: 1 } }],
  traceId: 'trace-1',
  requestId: 'req-server',
  operationId: 'op-1',
};

describe('mapProblemResponse', () => {
  it('Problem Details의 code, args, errors, requestId, operationId를 보존한다', () => {
    const error = mapProblemResponse(409, problem, 'req-client');
    expect(error).toBeInstanceOf(ApiError);
    expect(error.kind).toBe('conflict');
    expect(error.status).toBe(409);
    expect(error.code).toBe('WORK_ORDER_VERSION_CONFLICT');
    expect(error.args).toEqual({ workOrderId: 12 });
    expect(error.errors).toEqual([{ field: 'expectedVersion', code: 'Stale', args: { a: 1 } }]);
    expect(error.requestId).toBe('req-server');
    expect(error.operationId).toBe('op-1');
    expect(error.traceId).toBe('trace-1');
  });

  it('body에 requestId가 없으면 응답 헤더·요청 id를 쓴다', () => {
    const error = mapProblemResponse(403, { ...problem, requestId: undefined }, 'req-client');
    expect(error.requestId).toBe('req-client');
  });

  it('errors와 args가 없으면 빈 값이다', () => {
    const error = mapProblemResponse(400, { code: 'CURSOR_SORT_MISMATCH', title: 't' }, null);
    expect(error.errors).toEqual([]);
    expect(error.args).toEqual({});
    expect(error.operationId).toBeNull();
  });

  it.each([
    [400, 'badRequest'],
    [401, 'unauthorized'],
    [403, 'forbidden'],
    [404, 'notFound'],
    [409, 'conflict'],
    [422, 'unprocessable'],
    [500, 'server'],
    [503, 'server'],
    [418, 'unexpected'],
  ] as const)('상태 %i는 %s로 구분한다', (status, kind) => {
    expect(kindForStatus(status)).toBe(kind);
    expect(mapProblemResponse(status, { ...problem, status }, null).kind).toBe(kind);
  });

  it('Problem Details가 아닌 본문은 UNEXPECTED_RESPONSE로 바꾸고 id를 유지한다', () => {
    const html = mapProblemResponse(502, undefined, 'req-1');
    expect(html.code).toBe('UNEXPECTED_RESPONSE');
    expect(html.kind).toBe('server');
    expect(html.requestId).toBe('req-1');
    expect(mapProblemResponse(404, '<html>', null).kind).toBe('unexpected');
  });
});

describe('mapTransportError', () => {
  it('AbortError는 aborted다', () => {
    const error = mapTransportError(new DOMException('aborted', 'AbortError'), 'req-1');
    expect(error.kind).toBe('aborted');
    expect(error.status).toBeNull();
    expect(error.requestId).toBe('req-1');
  });

  it('그 외 전송 실패는 network다', () => {
    const cause = new TypeError('Failed to fetch');
    const error = mapTransportError(cause, 'req-2');
    expect(error.kind).toBe('network');
    expect(error.code).toBe('NETWORK_ERROR');
    expect(error.cause).toBe(cause);
  });
});
