import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { MemoryRouter, useLocation } from 'react-router-dom';
import type { SearchField } from '../forms/searchFields';
import type { ListUrlConfig } from './listUrlState';
import { useListUrlState } from './useListUrlState';

const fields: SearchField[] = [{ type: 'text', key: 'q', labelKey: 'x' }];
const config: ListUrlConfig = { fields, allowedSorts: ['a', '-a', 'b'], defaultSort: '-a' };

function setup(initial = '/list') {
  return renderHook(() => ({ list: useListUrlState(config), location: useLocation() }), {
    wrapper: ({ children }: { children: ReactNode }) => (
      <MemoryRouter initialEntries={[initial]}>{children}</MemoryRouter>
    ),
  });
}
const search = (r: ReturnType<typeof setup>) => r.result.current.location.search;

describe('useListUrlState', () => {
  it('정렬을 바꾸면 cursor와 이전 이동 기록이 초기화된다', () => {
    const r = setup('/list?cursor=c2');
    act(() => r.result.current.list.next('c3'));
    expect(search(r)).toBe('?cursor=c3');
    act(() => r.result.current.list.setSort('b'));
    expect(search(r)).toBe('?sort=b');
    expect(r.result.current.list.cursor).toBeNull();
    expect(r.result.current.list.canPrev).toBe(false);
  });

  it('조건을 바꾸면 cursor와 선택이 초기화되고 sort는 유지된다', () => {
    const r = setup('/list?sort=b&cursor=c2&selected=9');
    act(() => r.result.current.list.applyFilters({ q: 'WO' }));
    expect(new URLSearchParams(search(r)).toString()).toBe('q=WO&sort=b');
  });

  it('다음·이전 이동은 지나온 cursor를 따라간다', () => {
    const r = setup();
    act(() => r.result.current.list.next('c1'));
    act(() => r.result.current.list.next('c2'));
    expect(r.result.current.list.cursor).toBe('c2');
    act(() => r.result.current.list.prev());
    expect(r.result.current.list.cursor).toBe('c1');
    act(() => r.result.current.list.prev());
    expect(r.result.current.list.cursor).toBeNull();
    expect(search(r)).toBe('');
  });

  it('새로고침으로 기록을 잃은 상태의 이전 이동은 첫 페이지다', () => {
    const r = setup('/list?cursor=c7');
    expect(r.result.current.list.canPrev).toBe(true);
    act(() => r.result.current.list.prev());
    expect(r.result.current.list.cursor).toBeNull();
  });

  it('선택 id는 URL에 남고 cursor 이동 시 해제된다', () => {
    const r = setup();
    act(() => r.result.current.list.select('42'));
    expect(search(r)).toBe('?selected=42');
    act(() => r.result.current.list.next('c1'));
    expect(r.result.current.list.selectedId).toBeNull();
  });

  it('첫 페이지로 되돌리기는 cursor를 버리고 조건은 유지한다', () => {
    const r = setup('/list?q=WO&cursor=stale');
    act(() => r.result.current.list.resetToFirstPage());
    expect(search(r)).toBe('?q=WO');
  });
});
