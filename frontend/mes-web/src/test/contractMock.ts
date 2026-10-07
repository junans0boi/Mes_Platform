import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { http, HttpResponse, type RequestHandler } from 'msw';
import { parse } from 'yaml';

// MSW handler를 contracts/openapi.yaml에서 만든다. 계약에 없는 응답을 손으로 추가하지 않는다.
// 응답 본문은 계약 schema에서 결정적으로 만든 샘플이다. 테스트가 특정 값이 필요하면 overrides로 바꾼다.
type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
type Obj = { [key: string]: Json };

// vitest는 frontend/mes-web에서 실행한다. 계약은 저장소 루트의 contracts/ 한 곳에만 있다.
const spec = parse(readFileSync(resolve(process.cwd(), '../../contracts/openapi.yaml'), 'utf8')) as Obj;

const HTTP_METHODS = ['get', 'put', 'post', 'delete', 'patch'] as const;
type Method = (typeof HTTP_METHODS)[number];

function isObj(value: Json | undefined): value is Obj {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function resolveRef(ref: string): Obj {
  let node: Json | undefined = spec;
  for (const part of ref.replace(/^#\//, '').split('/')) {
    node = isObj(node) ? node[part] : undefined;
  }
  if (!isObj(node)) throw new Error(`Unresolved $ref in contract: ${ref}`);
  return node;
}

function deref(node: Obj): Obj {
  return typeof node.$ref === 'string' ? deref(resolveRef(node.$ref)) : node;
}

// 정수는 minimum(없으면 1)을 쓰고 maximum을 넘지 않는다.
function sampleInteger(schema: Obj): number {
  const min = typeof schema.minimum === 'number' ? schema.minimum : 1;
  const max = typeof schema.maximum === 'number' ? schema.maximum : Number.MAX_SAFE_INTEGER;
  return Math.min(Math.max(min, 1), max);
}

function sampleString(schema: Obj): string {
  switch (schema.format) {
    case 'date-time':
      return '2026-10-07T10:00:00Z';
    case 'byte':
      return 'AAAAAAAAB9E=';
    default:
      return 'string';
  }
}

export function sampleFromSchema(input: Obj): Json {
  const schema = deref(input);
  if (Array.isArray(schema.allOf)) {
    return Object.assign({}, ...schema.allOf.map((part) => sampleFromSchema(part as Obj))) as Obj;
  }
  if (Array.isArray(schema.enum)) return schema.enum[0] as Json;
  switch (schema.type) {
    case 'object': {
      const out: Obj = {};
      const properties = isObj(schema.properties) ? schema.properties : {};
      for (const [name, property] of Object.entries(properties)) {
        out[name] = sampleFromSchema(property as Obj);
      }
      return out;
    }
    case 'array':
      return isObj(schema.items) ? [sampleFromSchema(schema.items)] : [];
    case 'integer':
    case 'number':
      return sampleInteger(schema);
    case 'boolean':
      return false;
    case 'string':
      return sampleString(schema);
    default:
      return {};
  }
}

const REQUEST_ID = '00000000-0000-4000-8000-000000000001';

function withMeta(body: Json): Json {
  return isObj(body) && 'meta' in body
    ? { ...body, meta: { requestId: REQUEST_ID, operationId: null } }
    : body;
}

function jsonResponseSchema(operation: Obj, status: string): Obj | undefined {
  const responses = operation.responses as Obj;
  const response = responses[status];
  if (!isObj(response)) return undefined;
  const content = deref(response).content;
  const media = isObj(content)
    ? (content['application/json'] ?? content['application/problem+json'])
    : undefined;
  return isObj(media) && isObj(media.schema) ? media.schema : undefined;
}

export interface ContractOperation {
  operationId: string;
  method: Method;
  path: string;
  successStatus: number;
}

export function contractOperations(): ContractOperation[] {
  const out: ContractOperation[] = [];
  for (const [path, item] of Object.entries(spec.paths as Obj)) {
    for (const method of HTTP_METHODS) {
      const operation = (item as Obj)[method];
      if (!isObj(operation)) continue;
      const success = Object.keys(operation.responses as Obj).find((s) => s.startsWith('2')) ?? '200';
      out.push({
        operationId: operation.operationId as string,
        method,
        path,
        successStatus: Number(success),
      });
    }
  }
  return out;
}

// '/work-orders/{workOrderId}' → '*/work-orders/:workOrderId' (baseUrl이 달라도 일치하도록 앞에 *를 둔다)
function toMswPath(path: string): string {
  return `*${path.replace(/\{(\w+)\}/g, ':$1')}`;
}

export function sampleSuccessBody(operationId: string): Json | undefined {
  const found = findOperation(operationId);
  const schema = jsonResponseSchema(found.operation, String(found.info.successStatus));
  return schema ? withMeta(sampleFromSchema(schema)) : undefined;
}

function findOperation(operationId: string) {
  const info = contractOperations().find((o) => o.operationId === operationId);
  if (!info) throw new Error(`Operation not in contract: ${operationId}`);
  const operation = ((spec.paths as Obj)[info.path] as Obj)[info.method] as Obj;
  return { info, operation };
}

// 오류 샘플은 계약의 ProblemDetails schema에서 만든다. 테스트는 code·args 같은 값만 덮어쓴다.
export function sampleProblem(status: number, overrides: { [key: string]: Json } = {}): Obj {
  const base = sampleFromSchema({ $ref: '#/components/schemas/ProblemDetails' }) as Obj;
  return { ...base, status, requestId: REQUEST_ID, operationId: null, ...overrides };
}

export function contractHandlers(): RequestHandler[] {
  return contractOperations().map(({ operationId, method, path, successStatus }) =>
    http[method](toMswPath(path), () => {
      const body = sampleSuccessBody(operationId);
      return body === undefined
        ? new HttpResponse(null, { status: successStatus })
        : HttpResponse.json(body, { status: successStatus });
    }),
  );
}
