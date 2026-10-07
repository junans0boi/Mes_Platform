// 검색 필드 정의. 입력 컴포넌트가 읽는 값 모양이며 API URL·DB 필드명은 넣지 않는다.
// 입력값을 API 요청으로 바꾸는 일은 feature의 query adapter가 한다.
export interface FieldOption {
  value: string;
  /** i18n 키 (`namespace:key`) */
  labelKey: string;
}

export type SearchField =
  | { type: 'text'; key: string; labelKey: string }
  | { type: 'select'; key: string; labelKey: string; options: FieldOption[]; multiple?: boolean }
  | { type: 'dateRange'; fromKey: string; toKey: string; labelKey: string }
  // 식별자를 직접 입력하는 필드. 조회형 선택(query)은 해당 feature adapter가 정해지면 확장한다.
  | { type: 'entity'; key: string; labelKey: string; query: string };

/** 폼이 다루는 값. 비어 있는 값은 키가 없다. */
export type SearchValues = Record<string, string | string[]>;

/** URL 쿼리 문자열과 겹치면 안 되는 예약 이름 */
export const RESERVED_KEYS = ['sort', 'cursor', 'selected', 'limit'] as const;

export function fieldKeys(field: SearchField): string[] {
  return field.type === 'dateRange' ? [field.fromKey, field.toKey] : [field.key];
}

export function assertValidFields(fields: readonly SearchField[]): void {
  const seen = new Set<string>();
  for (const key of fields.flatMap(fieldKeys)) {
    if ((RESERVED_KEYS as readonly string[]).includes(key))
      throw new Error(`검색 키 '${key}'는 예약된 이름입니다`);
    if (seen.has(key)) throw new Error(`검색 키 '${key}'가 중복되었습니다`);
    seen.add(key);
  }
}
