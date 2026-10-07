import type { components } from './generated/schema';

type ProblemDetails = components['schemas']['ProblemDetails'];
type ProblemFieldError = components['schemas']['ProblemFieldError'];

// 화면이 분기하는 오류 종류. HTTP 상태와 전송 실패를 한 곳에서 구분한다.
// 화면 문구는 code와 args로 번역한다. 서버 message는 개발자용이므로 화면에 쓰지 않는다.
export type ApiErrorKind =
  | 'badRequest' // 400
  | 'unauthorized' // 401
  | 'forbidden' // 403
  | 'notFound' // 404
  | 'conflict' // 409
  | 'unprocessable' // 422
  | 'server' // 5xx
  | 'network' // 응답을 받지 못함
  | 'aborted' // 호출자가 취소함. 오류 화면을 띄우지 않는다.
  | 'unexpected'; // 위에 없는 상태, 또는 Problem Details가 아닌 응답

export const NETWORK_ERROR_CODE = 'NETWORK_ERROR';
export const ABORTED_ERROR_CODE = 'REQUEST_ABORTED';
export const UNEXPECTED_RESPONSE_CODE = 'UNEXPECTED_RESPONSE';

export interface ApiErrorInit {
  kind: ApiErrorKind;
  status: number | null;
  code: string;
  message?: string;
  args?: Record<string, unknown>;
  errors?: ProblemFieldError[];
  requestId: string | null;
  operationId?: string | null;
  traceId?: string;
  cause?: unknown;
}

export class ApiError extends Error {
  readonly kind: ApiErrorKind;
  readonly status: number | null;
  readonly code: string;
  readonly args: Record<string, unknown>;
  readonly errors: ProblemFieldError[];
  // 운영자가 지원팀에 전달하는 진단 값. 서버가 알려 준 값이 없으면 요청 때 우리가 만든 값이다.
  readonly requestId: string | null;
  readonly operationId: string | null;
  readonly traceId: string | null;

  constructor(init: ApiErrorInit) {
    super(init.message ?? init.code, init.cause === undefined ? undefined : { cause: init.cause });
    this.name = 'ApiError';
    this.kind = init.kind;
    this.status = init.status;
    this.code = init.code;
    this.args = init.args ?? {};
    this.errors = init.errors ?? [];
    this.requestId = init.requestId;
    this.operationId = init.operationId ?? null;
    this.traceId = init.traceId ?? null;
  }
}

export function isApiError(value: unknown): value is ApiError {
  return value instanceof ApiError;
}

export function kindForStatus(status: number): ApiErrorKind {
  switch (status) {
    case 400:
      return 'badRequest';
    case 401:
      return 'unauthorized';
    case 403:
      return 'forbidden';
    case 404:
      return 'notFound';
    case 409:
      return 'conflict';
    case 422:
      return 'unprocessable';
    default:
      return status >= 500 ? 'server' : 'unexpected';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isProblemDetails(body: unknown): body is ProblemDetails {
  return isRecord(body) && typeof body.code === 'string';
}

function stringOrNull(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function fieldErrors(value: unknown): ProblemFieldError[] {
  if (!Array.isArray(value)) return [];
  return value.filter(
    (e): e is ProblemFieldError => isRecord(e) && typeof e.field === 'string' && typeof e.code === 'string',
  );
}

// 오류 응답을 ApiError로 바꾼다. body는 이미 읽은 JSON(또는 읽을 수 없으면 undefined)이다.
// fallbackRequestId: 응답 헤더 또는 요청 때 만든 id. body에 requestId가 없을 때만 쓴다.
export function mapProblemResponse(
  status: number,
  body: unknown,
  fallbackRequestId: string | null,
): ApiError {
  const kind = kindForStatus(status);
  if (!isProblemDetails(body)) {
    return new ApiError({
      kind: kind === 'server' ? kind : 'unexpected',
      status,
      code: UNEXPECTED_RESPONSE_CODE,
      message: `Unexpected response with status ${status}`,
      requestId: fallbackRequestId,
    });
  }
  return new ApiError({
    kind,
    status,
    code: body.code,
    message: typeof body.message === 'string' ? body.message : body.title,
    args: isRecord(body.args) ? body.args : undefined,
    errors: fieldErrors(body.errors),
    requestId: stringOrNull(body.requestId) ?? fallbackRequestId,
    operationId: stringOrNull(body.operationId),
    traceId: stringOrNull(body.traceId) ?? undefined,
  });
}

export function mapTransportError(error: unknown, requestId: string | null): ApiError {
  if (isApiError(error)) return error;
  // jsdom과 Node는 DOMException·Error 클래스가 달라 instanceof로 판별하지 않는다.
  if (isRecord(error) && error.name === 'AbortError') {
    return new ApiError({ kind: 'aborted', status: null, code: ABORTED_ERROR_CODE, requestId, cause: error });
  }
  return new ApiError({
    kind: 'network',
    status: null,
    code: NETWORK_ERROR_CODE,
    message: error instanceof Error ? error.message : undefined,
    requestId,
    cause: error,
  });
}
