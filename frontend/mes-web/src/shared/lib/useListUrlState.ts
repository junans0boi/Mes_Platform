import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { SearchValues } from '../forms/searchFields';
import { canGoPrev, goNext, goPrev, type CursorState } from './cursorPaging';
import { parseListUrl, serializeListUrl, type ListUrlConfig, type ListUrlState } from './listUrlState';

export interface ListState extends ListUrlState {
  canPrev: boolean;
  /** 검색 조건을 바꾼다. cursor는 초기화된다. */
  applyFilters: (values: SearchValues) => void;
  /** 정렬을 바꾼다. cursor는 초기화된다. */
  setSort: (sort: string) => void;
  next: (nextCursor: string | null) => void;
  prev: () => void;
  /** cursor를 버리고 첫 페이지로 돌아간다(서버가 CURSOR_SORT_MISMATCH를 반환했을 때 등). */
  resetToFirstPage: () => void;
  select: (id: string | null) => void;
}

// URL을 목록 상태의 단일 원본으로 쓴다. 조건·sort·cursor·선택 id는 주소를 복사해 열면 복원된다.
// cursor stack(이전 이동용)만 메모리에 두며, 조건이나 sort가 바뀌면 함께 지운다.
export function useListUrlState(config: ListUrlConfig): ListState {
  const [params, setParams] = useSearchParams();
  const state = useMemo(() => parseListUrl(params, config), [params, config]);
  const [stack, setStack] = useState<CursorState['stack']>([]);

  // 가장 최근에 쓴 상태. 주소는 바뀌었지만 아직 다시 그리지 못한 순간의 다음 조작이 오래된 상태 위에 덮어쓰지 않도록,
  // 쓰기는 렌더된 상태가 아니라 이 값을 기준으로 합성한다. 렌더가 따라잡으면(뒤로 가기 포함) 렌더된 상태로 맞춘다.
  const latest = useRef(state);
  useEffect(() => {
    latest.current = state;
  }, [state]);

  const write = useCallback(
    (patch: Partial<ListUrlState>, nextStack: CursorState['stack'], replace = false) => {
      const next = { ...latest.current, ...patch };
      latest.current = next;
      setStack(nextStack);
      setParams(serializeListUrl(next, config), { replace });
    },
    [config, setParams],
  );
  const resetToFirstPage = useCallback(() => write({ cursor: null, selectedId: null }, [], true), [write]);

  const cursorState: CursorState = { cursor: state.cursor, stack };

  return {
    ...state,
    canPrev: canGoPrev(cursorState),
    applyFilters: (values) => write({ values, cursor: null, selectedId: null }, []),
    setSort: (sort) => write({ sort, cursor: null, selectedId: null }, []),
    next: (nextCursor) => {
      const moved = goNext(cursorState, nextCursor);
      write({ cursor: moved.cursor, selectedId: null }, moved.stack);
    },
    prev: () => {
      const moved = goPrev(cursorState);
      write({ cursor: moved.cursor, selectedId: null }, moved.stack);
    },
    resetToFirstPage,
    select: (id) => write({ selectedId: id }, stack, true),
  };
}
