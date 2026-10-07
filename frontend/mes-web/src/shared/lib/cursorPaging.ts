// cursor 이동 상태. 서버는 다음 cursor만 알려 주므로 이전 이동은 지나온 cursor를 메모리 stack에 쌓아 둔다.
// 새로고침으로 stack을 잃으면(URL에는 현재 cursor만 있다) 이전 이동은 첫 페이지로 대체한다.
export const DEFAULT_PAGE_SIZE = 50;
export const MAX_PAGE_SIZE = 200;

export function clampPageSize(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value)) return DEFAULT_PAGE_SIZE;
  return Math.min(MAX_PAGE_SIZE, Math.max(1, Math.trunc(value)));
}

export interface CursorState {
  /** 현재 페이지의 cursor. null이면 첫 페이지다. */
  cursor: string | null;
  /** 지나온 페이지의 cursor(가장 최근이 끝). 첫 페이지는 null로 쌓인다. */
  stack: readonly (string | null)[];
}

export const firstPage: CursorState = { cursor: null, stack: [] };

/** URL에서 복원한 cursor로 시작한다. stack은 비어 있다. */
export function fromUrlCursor(cursor: string | null): CursorState {
  return { cursor, stack: [] };
}

export function goNext(state: CursorState, nextCursor: string | null): CursorState {
  if (nextCursor === null) return state;
  return { cursor: nextCursor, stack: [...state.stack, state.cursor] };
}

export function goPrev(state: CursorState): CursorState {
  if (state.cursor === null) return state;
  const previous = state.stack.length > 0 ? state.stack[state.stack.length - 1]! : null;
  return { cursor: previous, stack: state.stack.slice(0, -1) };
}

/** 첫 페이지가 아니면 이전으로 갈 수 있다(stack이 비어 있어도 첫 페이지로 이동한다). */
export function canGoPrev(state: CursorState): boolean {
  return state.cursor !== null;
}
