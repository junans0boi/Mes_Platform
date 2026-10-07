import type { SearchField } from '../forms/searchFields';
import { parseListUrl, serializeListUrl, type ListUrlConfig, type ListUrlState } from './listUrlState';

const fields: SearchField[] = [
  { type: 'text', key: 'workOrderNumberPrefix', labelKey: 'x:a' },
  {
    type: 'select',
    key: 'status',
    labelKey: 'x:b',
    multiple: true,
    options: [
      { value: 'READY', labelKey: 'x:ready' },
      { value: 'IN_PROGRESS', labelKey: 'x:ip' },
    ],
  },
  { type: 'select', key: 'kind', labelKey: 'x:k', options: [{ value: 'A', labelKey: 'x:A' }] },
  { type: 'dateRange', fromKey: 'plannedFrom', toKey: 'plannedTo', labelKey: 'x:d' },
  { type: 'entity', key: 'lineId', labelKey: 'x:l', query: 'lines' },
];
const config: ListUrlConfig = {
  fields,
  allowedSorts: ['plannedStartAt', '-plannedStartAt', 'workOrderNumber'],
  defaultSort: '-plannedStartAt',
};

function parse(query: string) {
  return parseListUrl(new URLSearchParams(query), config);
}

describe('parseListUrl', () => {
  it('아무것도 없으면 기본값이다', () => {
    expect(parse('')).toEqual({
      values: {},
      sort: '-plannedStartAt',
      cursor: null,
      selectedId: null,
      limit: 50,
    });
  });

  it('조건·sort·cursor·선택 id를 복원한다', () => {
    const state = parse(
      'workOrderNumberPrefix=WO-26&status=READY&status=IN_PROGRESS&kind=A&plannedFrom=2026-10-01&plannedTo=2026-10-31&lineId=7&sort=workOrderNumber&cursor=abc&selected=42',
    );
    expect(state).toEqual({
      values: {
        workOrderNumberPrefix: 'WO-26',
        status: ['READY', 'IN_PROGRESS'],
        kind: 'A',
        plannedFrom: '2026-10-01',
        plannedTo: '2026-10-31',
        lineId: '7',
      },
      sort: 'workOrderNumber',
      cursor: 'abc',
      selectedId: '42',
      limit: 50,
    });
  });

  it('허용되지 않은 값은 버린다', () => {
    const state = parse(
      'status=HACKED&kind=Z&plannedFrom=yesterday&sort=-password&workOrderNumberPrefix=%20%20&limit=999999',
    );
    expect(state.values).toEqual({});
    expect(state.sort).toBe('-plannedStartAt');
    expect(state.limit).toBe(200);
  });

  it('알 수 없는 키는 무시한다', () => {
    expect(parse('foo=bar').values).toEqual({});
  });
});

describe('serializeListUrl', () => {
  const full: ListUrlState = {
    values: {
      workOrderNumberPrefix: 'WO-26',
      status: ['READY', 'IN_PROGRESS'],
      plannedFrom: '2026-10-01',
      lineId: '7',
    },
    sort: 'workOrderNumber',
    cursor: 'abc',
    selectedId: '42',
    limit: 100,
  };

  it('직렬화한 URL을 다시 읽으면 같은 상태가 된다(복사해 열기)', () => {
    const query = serializeListUrl(full, config).toString();
    expect(parseListUrl(new URLSearchParams(query), config)).toEqual(full);
  });

  it('기본값과 빈 값은 쓰지 않는다', () => {
    const params = serializeListUrl(
      {
        values: { workOrderNumberPrefix: '  ', status: [] },
        sort: '-plannedStartAt',
        cursor: null,
        selectedId: null,
        limit: 50,
      },
      config,
    );
    expect(params.toString()).toBe('');
  });

  it('limit은 상한을 넘겨 쓰지 않는다', () => {
    expect(serializeListUrl({ ...full, limit: 900 }, config).get('limit')).toBe('200');
  });

  it('같은 상태는 항상 같은 문자열이다', () => {
    expect(serializeListUrl(full, config).toString()).toBe(serializeListUrl({ ...full }, config).toString());
  });

  it('예약된 이름이나 중복된 키를 가진 필드 정의는 거부한다', () => {
    const bad = { ...config, fields: [{ type: 'text', key: 'cursor', labelKey: 'x' } satisfies SearchField] };
    expect(() => parseListUrl(new URLSearchParams(), bad)).toThrow(/예약/);
    const dup = { ...config, fields: [fields[0]!, fields[0]!] };
    expect(() => parseListUrl(new URLSearchParams(), dup)).toThrow(/중복/);
  });
});
