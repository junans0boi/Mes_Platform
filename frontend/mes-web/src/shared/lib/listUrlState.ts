import { assertValidFields, fieldKeys, type SearchField, type SearchValues } from '../forms/searchFields';
import { clampPageSize, DEFAULT_PAGE_SIZE } from './cursorPaging';

// 목록 화면의 URL 상태: 검색 조건, sort, 현재 cursor, 선택한 상세 id.
// 모달 열림 같은 복원 가치가 낮은 일시 상태와 저장하지 않은 입력은 URL에 넣지 않는다.
export interface ListUrlState {
  values: SearchValues;
  sort: string;
  cursor: string | null;
  selectedId: string | null;
  limit: number;
}

export interface ListUrlConfig {
  fields: readonly SearchField[];
  /** 허용 sort 값(`field`, `-field`). 이 밖의 값은 무시하고 defaultSort를 쓴다. */
  allowedSorts: readonly string[];
  defaultSort: string;
}

function isValidText(value: string): boolean {
  return value.trim().length > 0;
}

export function parseListUrl(params: URLSearchParams, config: ListUrlConfig): ListUrlState {
  assertValidFields(config.fields);
  const values: SearchValues = {};

  for (const field of config.fields) {
    switch (field.type) {
      case 'text':
      case 'entity': {
        const value = params.get(field.key);
        if (value !== null && isValidText(value)) values[field.key] = value;
        break;
      }
      case 'select': {
        const allowed = new Set(field.options.map((o) => o.value));
        const picked = params.getAll(field.key).filter((v) => allowed.has(v));
        if (picked.length === 0) break;
        if (field.multiple) values[field.key] = [...new Set(picked)];
        else values[field.key] = picked[0]!;
        break;
      }
      case 'dateRange': {
        for (const key of [field.fromKey, field.toKey]) {
          const value = params.get(key);
          if (value !== null && /^\d{4}-\d{2}-\d{2}$/.test(value)) values[key] = value;
        }
        break;
      }
    }
  }

  const rawSort = params.get('sort');
  const rawLimit = Number(params.get('limit'));
  return {
    values,
    sort: rawSort !== null && config.allowedSorts.includes(rawSort) ? rawSort : config.defaultSort,
    cursor: params.get('cursor') || null,
    selectedId: params.get('selected') || null,
    limit: params.has('limit') && Number.isFinite(rawLimit) ? clampPageSize(rawLimit) : DEFAULT_PAGE_SIZE,
  };
}

/** 기본값과 빈 값은 쓰지 않아 URL을 짧게 유지한다. 같은 상태는 항상 같은 문자열이 된다. */
export function serializeListUrl(state: ListUrlState, config: ListUrlConfig): URLSearchParams {
  assertValidFields(config.fields);
  const params = new URLSearchParams();

  for (const field of config.fields) {
    for (const key of fieldKeys(field)) {
      const value = state.values[key];
      if (value === undefined) continue;
      if (Array.isArray(value)) value.forEach((v) => params.append(key, v));
      else if (isValidText(value)) params.set(key, value);
    }
  }
  if (state.sort !== config.defaultSort) params.set('sort', state.sort);
  if (state.limit !== DEFAULT_PAGE_SIZE) params.set('limit', String(clampPageSize(state.limit)));
  if (state.cursor) params.set('cursor', state.cursor);
  if (state.selectedId) params.set('selected', state.selectedId);
  return params;
}
